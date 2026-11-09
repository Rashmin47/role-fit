# Roadmap

> What to build next, why, and how to know it is done.
>
> This roadmap is grounded in the original product plan (the six AI capability areas: structured extraction, routing logic, tool calling, multi-step pipeline, retrieval grounding, and batch processing) and the current implementation status.
>
> Last verified: 2026-11-05.

---

## 0. Where the project stands

### Shipped

- Marketing landing page and full dashboard shell.
- Career Intelligence with role selection, requirement frequencies, experience brackets, priorities, and gap analysis (sample dataset).
- Company Intelligence (sample dataset).
- Recruitment workspace: screenings list, 4-step new-screening wizard, shortlist table, candidate detail with requirement-by-requirement citations, gap explanations, human decision + notes.
- Server-side PDF/DOCX/TXT/MD text extraction at `/api/ingest`, with per-file failures, size/count limits, and no file persistence.
- Server-side provider extraction at `/api/extract/job` and `/api/extract/candidate`, with request limits, timeouts, validation, and fallback metadata.
- Honest offline candidate heuristics: no fabricated employers, degrees, or experience years; skill evidence is cited from resume lines.
- Deterministic normalization, matching, scoring, and routing.
- Server-side screening persistence at `/api/screenings`: validated profiles → deterministic engine → Job/Requirement/Candidate/CandidateMatch/ScoringRun transaction.
- Human decisions, notes, and weight recomputes persisted through Prisma; `ScoringRun` history per create/recompute.
- Workspace settings persisted (`WorkspaceSettings`): provider/model/URL, 50/25/15/10 weights, and a real Ollama connectivity/model check.
- Offline mock provider + Ollama provider with fallback; both job and candidate output are validated server-side before scoring. Provider/model config is read from the database per request with env fallback.
- Server batch pipeline wired to the wizard with streamed progress and persisted candidate jobs.
- Tool registry (not wired to UI/provider).
- Engine assertion suite, ESLint, TypeScript, production build, CI, and a persisted-path smoke test.
- Platform upgrade: Next 16.4, React 19.3, Tailwind 4.3, Prisma 7.10, TypeScript 5.9.
- Agent documentation set (`AGENTS.md`, `docs/`).

### The honest gap

The product screens real uploaded documents and persists the results, but the path is not yet production-grade:

- PDF/DOCX/TXT/MD files are parsed per run; file contents are not persisted and there is no OCR for scanned/image-only PDFs.
- Provider extraction and scoring are server-side, and settings are persisted, but there is no per-user/per-organization settings scope and no extraction-history record (provider/model per extraction).
- The wizard uses `/api/screenings/batch` with durable candidate outcomes and NDJSON progress. Durable background execution, automatic resume, and cross-request idempotency remain missing.
- Market data is static, and there is no authentication, organization scoping, or RBAC.
- Job-requirement extraction remains heuristic. It no longer invents fallback requirements, but it can misread complex phrasing; recruiters can edit the requirement list before screening.
- All screenings attach to the seeded demo organization when present; the workspace shell is cosmetic.

Closing that gap is the roadmap.

---

## 1. Prioritization principles

1. **Trust before features.** A believable score requires validated extraction, real evidence, and durable decisions.
2. **One definition of "matched".** Consolidate the engine before adding dimensions.
3. **Persistence before scale.** Batch processing is meaningless if results disappear on refresh.
4. **Real provenance before market claims.** No "market frequency" without stored postings and citations.
5. **Small, reversible steps.** Keep the UI working at every phase; migrate one route at a time.
6. **Human-in-the-loop always.** No feature may introduce automatic rejection.

---

# Phase 1 — Correctness & foundation

**Goal:** make the existing product honest and maintainable before adding infrastructure.
**Exit criteria:** one type system, durable-enough settings, and a real test runner.

### 1.1 Unify the domain types ✅

**Status (2026-11-09):** shipped. Canonical domain types defined in `lib/domain/types.ts` and re-exported by `types/index.ts` and `lib/ai/schemas.ts`. `CandidateProfile` is the single canonical candidate representation; scoring functions consume `CandidateProfile` directly without pseudo-candidate conversion adapters.

**Problem (original):** `lib/ai/schemas.ts` and `types/index.ts` overlap, and conversions live in UI components.

**Do:**

- Define one canonical domain module (e.g. `lib/domain/types.ts`) for `JobRequirements`, `CandidateProfile`, `MatchEvidence`, `SkillGap`, `CandidateScoreResult`.
- Keep AI DTOs only at the provider boundary; map DTO → domain once.
- Remove conversion objects from `NewScreeningWorkflow.tsx` and `lib/batch/index.ts`.
- Keep `JobScreening` as a view projection, not a duplicate domain shape.

**Acceptance criteria (met):**

- No component constructs a pseudo-candidate object to satisfy the scorer.
- The same candidate+job produces the same result through the wizard and the batch pipeline.
- `grep` finds no `legacyCandidate` / `legacyReqs`-style adapters.
- Engine tests still pass (76/Review anchor).

**Files:** `lib/domain/types.ts`, `types/index.ts`, `lib/ai/schemas.ts`, `lib/scoring`, `lib/matching`, `lib/batch`, `lib/screening/score-candidate.ts`.

---

### 1.2 Validate candidate extraction ✅

**Problem:** job output is validated; candidate output is not.

**Do:**

- Add `validateCandidateProfileOutput()` beside `validateJobRequirementsOutput()`.
- Validate in `OllamaAIProvider.extractCandidateProfile()` and mock output.
- Reject or repair: missing name, negative years, non-array skills/experience, confidence out of range.
- Record validation warnings for the UI.

**Acceptance criteria:**

- Malformed candidate JSON falls back to the mock provider instead of entering scoring.
- Unit tests cover: valid profile, string-only skills, missing arrays, negative years, confidence clamping.
- No unvalidated provider payload reaches `evaluateCandidateMatch` or `calculateFinalMatchScore`.

**Files:** `lib/ai/schemas.ts`, `lib/ai/ollama-provider.ts`, `lib/tests/engine.test.ts`.

**Status (2026-10-25):** shipped. `validateCandidateProfileOutput()` repairs or rejects malformed payloads; the Ollama provider validates and falls back to the mock; the wizard isolates per-candidate failures. Tests cover repair, clamping, string skills, and fabricated-default regressions.

---

### 1.3 Consolidate matching and scoring ✅

**Status (2026-11-09):** shipped. `lib/matching/index.ts` is the single source of truth for evaluating requirement matches across candidate skills, experience (technologies and descriptions), and projects. `lib/scoring/index.ts` consumes `evaluateCandidateMatch` / `evaluateRequirementMatch` directly without duplicate experience scans. Depth levels (`Basic`, `Working knowledge`, `Strong`, `Expert`) are recorded and flagged for review, while non-penalizing scoring semantics are preserved per invariant §2.

**Problem (original):** `lib/matching` and `lib/scoring` both decided what "matched" means, with duplicate scans and different depth semantics.

**Do:**

- Make scoring consume `RequirementMatchItem[]` from the matcher (or move all matching into scoring).
- Decide explicitly whether `Basic`/`Working knowledge` earns full, partial, or zero points.
- Keep deterministic evidence citations.
- Delete the duplicate evidence search.

**Acceptance criteria (met):**

- One function decides match status (`evaluateRequirementMatch` / `evaluateCandidateMatch`).
- Unit tests cover Basic/Working/Strong/Expert × required/preferred × skills/experience/projects.
- `calculateFinalMatchScore` no longer re-scans candidate experience independently.
- Documented in `docs/ENGINE.md`.

**Files:** `lib/matching/index.ts`, `lib/scoring/index.ts`, `docs/ENGINE.md`, `lib/tests/engine.test.ts`.

---

### 1.4 Move extraction server-side

**Status (2026-10-25):** shipped. `/api/extract/job` and `/api/extract/candidate` validate JSON bodies, enforce 50k-character job / 200k-character candidate text limits and per-client rate limits, apply a 60s timeout, and return validated structured data plus warnings and `provider.fallbackUsed` / `provider.warning`. `AI_PROVIDER` and Ollama configuration stay server-side; the wizard calls the routes and then runs deterministic scoring. Ollama works without CORS. Provider strings were verified absent from production client bundles; the Ollama-offline fallback was smoke-tested.

**Problem (original):** providers ran in the browser; Ollama needed CORS; prompts and provider config were exposed.

**Do:**

- Add `app/api/extract/job/route.ts` and `app/api/extract/candidate/route.ts` (or server actions).
- Add request validation (Zod or a small hand-written validator), size limits, and timeouts.
- Read `AI_PROVIDER`/Ollama config only on the server.
- Return structured data + validation warnings; never return raw model text.
- Keep the mock provider usable without network.

**Files:** new `app/api/extract/**`, `lib/ai/provider.ts`, `NewScreeningWorkflow.tsx`.

**Acceptance criteria (met):**

- The wizard calls a server endpoint, not `getAIProvider()` directly.
- Ollama can be enabled with `AI_PROVIDER=ollama` and works without CORS configuration.
- Provider errors produce a typed error response and a user-visible fallback message.
- No secret/provider module is imported into a client bundle (verified in build output).

---

### 1.5 Make settings real

**Status (2026-11-05):** shipped. `WorkspaceSettings` persists provider/model/URL and the four weights; `/api/settings` validates them (must total 100) and `/api/settings/ollama` performs a real `/api/tags` connectivity/model check. Extraction routes read settings per request, so changes apply to the next extraction. Per-organization scope and a settings-history UI remain.

**Problem:** provider selection and weights were UI-only; they reset on refresh.

**Do:**

- Persist provider/model/URL and default weights (start with a settings store or DB table).
- Validate weights total 100 on save.
- Make per-screening weights explicit and immutable once a run is complete (a new run uses new weights).
- Show which provider and weights produced a score.

**Acceptance criteria:**

- Refresh preserves settings.
- Every `CandidateScoreResult` displays the weights used.
- Changing defaults does not retroactively change historical scores.
- Invalid weights cannot be saved.

**Files:** `app/(dashboard)/settings/page.tsx`, `lib/store`, new settings model.

---

### 1.6 Calculate experience from dates ✅

**Status (2026-11-09):** shipped. `lib/normalization/experience.ts` parses employment dates (YYYY-MM, YYYY, month names, current roles), merges overlapping positions to prevent double counting, handles employment gaps, computes verified months/years, and flags discrepancies > 6 months (0.5y). The `calculate_experience` tool in `lib/tools/index.ts` is wired to the normalized implementation.

**Problem (original):** scoring trusted `totalExperienceYears` blindly; the `calculate_experience` tool was a placeholder.

**Do:**

- Normalize `startDate`/`endDate` (YYYY-MM), handle current roles, overlaps, and gaps.
- Compute total months, convert to years, cap at a sane maximum.
- Use the computed value in matching/scoring, while preserving the extracted value for comparison.
- Flag discrepancies > 6 months.

**Acceptance criteria (met):**

- Overlapping roles are merged and not double-counted.
- Current roles use the run date or injected `asOf` date deterministically.
- Unit tests cover overlaps, gaps, missing dates, current roles, and discrepancy flags.
- Candidate timeline explanation and review flags expose how years were verified.

**Files:** `lib/normalization/experience.ts`, `lib/tools/index.ts`, `lib/matching/index.ts`, `lib/scoring/index.ts`, `lib/tests/engine.test.ts`.

---

### 1.7 Tighten the routing decision table

**Problem:** `total >= 60 OR missingRequired <= 2` routes low scores to Review.

**Do:**

- Write a decision table with product sign-off (score bands × missing required × experience).
- Make thresholds configurable per organization/screening.
- Keep `NEEDS_VERIFICATION` non-punitive; still no rejection state.
- Update both `lib/scoring` and `lib/routing` from one shared policy module.

**Acceptance criteria:**

- One exported policy is used by recommendation and routing.
- Tests cover every cell of the decision table.
- The UI explains why a candidate is in a queue.
- Docs record the rationale.

**Files:** new `lib/routing/policy.ts`, `lib/scoring`, `lib/routing`, tests.

---

### 1.8 Test foundation ✅

**Status (2026-11-09):** shipped. Migrated to Vitest with `vitest.config.ts`, structured unit test suites, and score-bound property tests ($0 \le \text{totalScore} \le 100$). The property tests uncovered and fixed an underflow edge case where negative candidate experience produced a negative score.

**Problem (original):** the custom assertion script was useful but limited.

**Do:**

- Add Vitest for unit/integration tests; keep the engine suite as the first migration.
- Add coverage reporting for `lib/**`.
- Add fixture builders for jobs/candidates.
- Add a property test: `0 <= total <= 100` for arbitrary inputs.
- Optionally add Playwright for the wizard + decision persistence.

**Acceptance criteria (met):**

- `npm test` runs Vitest.
- Engine anchors are expressed as readable test cases.
- A failing score test names the component and the expected/actual values.
- No network/model calls in unit tests.

**Files:** `package.json`, `vitest.config.ts`, `lib/tests/**`.

---

### 1.9 UX correctness pass

- Add `loading.tsx` / `error.tsx` for dashboard routes.
- Add an error boundary around extraction and scoring.
- Disable actions while pending; show progress and recovery.
- Ensure every empty/error state has a next action.
- Audit keyboard flow and screen-reader labels on the wizard and tables.
- Remove any remaining "Nirman" copy (tokens may stay).

**Acceptance criteria:** keyboard-only completion of the wizard and decision flow; axe/Lighthouse accessibility checks pass for key pages; no dead-end states.

---

# Phase 2 — Persistence

**Goal:** screenings, candidates, decisions, notes, and runs survive refresh, browser change, and redeploy.
**Exit criteria:** Prisma is the source of truth; `localStorage` is no longer required for correctness.

**Status (2026-11-05):** the exit criteria are met for the current single-tenant demo. Prisma is authoritative; the client store is an API-backed cache; decisions, notes, and weight recomputes survive reload and restart. Organization scoping, server actions, and an audit log remain.

### 2.1 Repository layer — partial ✅

**Status:** `lib/db/prisma.ts` + `lib/db/screenings.ts` return presentation/view types, not raw Prisma rows. Create/list/detail/decision/recompute are implemented and smoke-tested against a temporary SQLite database. Every query is **not** yet scoped by `organizationId`, and there are no committed repository integration tests.

- Create server-only `lib/db/` repositories: jobs, candidates, matches, runs, market data.
- Return domain/view types, not raw Prisma rows.
- Every query scoped by `organizationId`.
- Add integration tests against a temporary SQLite database.

### 2.2 Read path migration — partial ✅

**Status:** the recruitment list, detail, candidate directory, candidate detail, and dashboard all read persisted screenings through `GET /api/screenings`. Interactive screens remain client components with loading/error states. Invalid IDs render a not-found state. Counts are derived from decisions. Server-component reads and seeded sample screenings into Prisma remain open.

- Migrate `/recruitment`, `/recruitment/[jobId]`, and candidate detail to server components + DB reads.
- Keep interactive filters/decisions as client islands.
- Seed the current sample screenings into Prisma so the UI has data on first run.
- Add a data-source switch only if needed during migration; remove it after.

**Acceptance criteria:**

- Opening a screening in a different browser shows the same candidates and decisions.
- No `screenings[0]` fallback; invalid IDs render a proper not-found state.
- `candidateCount`/`reviewedCount`/`shortlistedCount` are derived, not manually stored duplicates (or are transactionally maintained).

### 2.3 Write path + audit — partial ✅

**Status:** decisions/notes PATCH through `/api/screenings/[jobId]/candidates/[candidateId]` with optimistic UI and rollback. Weight recompute PATCHes `/api/screenings/[jobId]`, writes a new `ScoringRun`, and preserves decisions/notes. `AuditLog`, actor identity, server actions, and visible audit history are still missing.

- Server action for decisions and notes.
- `AuditLog` model: actor, action, entity, before/after, timestamp.
- Optimistic UI with rollback on failure.
- Idempotent batch writes keyed by `(jobId, candidateId)`.

**Acceptance criteria:** every decision has an actor and timestamp; concurrent updates do not lose data; audit history is visible or exportable.

### 2.4 localStorage migration — retired ✅

**Status:** `localStorage` is no longer read or written; the legacy keys are ignored. Because this is pre-release demo data, no import action was built. If real users have legacy screenings, add an explicit import before declaring a migration path.

### 2.5 Settings persistence — partial ✅

**Status:** `WorkspaceSettings` stores provider, Ollama URL/model, and the four weights; `/api/settings` validates and persists them. Per-user/per-organization scope, a `ScoringProfile` history, and secret management remain.

---

# Phase 3 — Real ingestion & batch screening

**Goal:** upload real resumes, extract real text, process 10–200+ candidates, and keep failures isolated.
**Exit criteria:** a user uploads PDFs/DOCX, sees progress, and gets persisted, cited results without fabricated data.

### 3.1 Upload pipeline — partial ✅

- `app/api/ingest/route.ts` with:
  - max file size and count,
  - MIME sniffing (not just extension),
  - filename sanitization,
  - per-request rate limiting,
  - storage outside the web root (or DB blob) with lifecycle rules.
- Parse text:
  - PDF: `pdf-parse` / `unpdf`,
  - DOCX: `mammoth`,
  - TXT/MD: direct read.
- Strip headers/footers, normalize whitespace, cap length.
- Persist `Resume` rows with `rawText` and `parsedAt`.

**Acceptance criteria:** corrupt/encrypted/scanned PDFs fail gracefully with a recoverable error; no file is executed; text extraction is testable with fixtures; uploads are organization-scoped.

**Status (2026-10-25):** implemented as `app/api/ingest/route.ts`. It validates extension and magic bytes, limits runs to 20 files / 10 MB per file / 50 MB per request / 200k characters per document, rate-limits in memory, parses PDF with `unpdf`, DOCX with `mammoth`, and TXT/MD directly, and returns per-file failures. It does **not** persist files, scope uploads to an organization, OCR scanned PDFs, or deduplicate candidates.

### 3.2 Wire the batch pipeline — partial ✅

- Replace `DEMO_RESUME_POOL` with uploaded candidates.
- Create a `ScoringRun` and one `CandidateProcessingJob` per candidate.
- Process independently; persist status transitions.
- Stream progress (SSE or polling) to the wizard.
- Retry failed items; never abort the whole run for one bad resume.
- Enforce concurrency limits and per-run timeouts.

**Acceptance criteria:** 50-resume run shows accurate progress; one malformed resume does not fail the batch; re-running is idempotent; results are visible after reload; the run records provider/model/weights.

**Status (2026-11-05):** the wizard uses `/api/screenings/batch` with NDJSON per-candidate progress. Run/jobs are persisted before extraction, successful candidates are saved incrementally, and transient extraction failures retry once. Provider/model/weights are recorded per run; fallback and warnings are recorded per candidate. Persisted progress is readable through the run endpoint. Still partial: request-bound execution is not a durable worker; cross-request idempotency, automatic resume, a history UI, and 50-file wizard uploads remain unfinished. Wizard ingestion still allows 20 files; the text API allows up to 200 candidates within aggregate limits.

### 3.3 Real candidate extraction — partial ✅

- Validate candidate output (Phase 1.2).
- Remove fabricated defaults from the mock provider; return only what is present.
- Add "insufficient evidence" handling instead of inventing history.
- Improve prompts for dates, titles, and skill levels.
- Support multiple resumes per candidate and deduplicate by email/phone.

**Acceptance criteria:** no fabricated companies/degrees; every skill has an evidence snippet or is marked absent; duplicate uploads are detected.

**Status (2026-10-25):** the mock provider now uses `lib/ai/resume-heuristics.ts`. It extracts only what the text supports, cites the line for every skill, derives closed date ranges and `Present` roles as of extraction time, and leaves missing fields empty. Experience years are explicit when stated; otherwise they are derived from date ranges and stored in the score result. Duplicate uploads and multi-resume candidates are still open.

### 3.4 Operations

- Background execution strategy (in-process queue now; BullMQ/DB queue later).
- Cron/worker entry point if needed.
- Metrics: duration, success/failure, provider latency.
- Structured logs with run/candidate IDs (no resume text).

---

# Phase 4 — Market intelligence

**Goal:** replace static market samples with ingested, cited, fresh postings.
**Exit criteria:** every frequency has a source and date; the UI labels provenance accurately.

### 4.1 Ingestion

- Define allowed public sources and robots/ToS constraints.
- Collector jobs that write `JobPosting` + `EvidenceSource`.
- Deduplicate by URL/company/title/date.
- Extract skills/experience with the same provider boundary.
- Store raw excerpt + observed date.

### 4.2 Aggregation

- Compute frequencies per role/seniority/region over a rolling window.
- Minimum sample size before publishing a percentage.
- Trend calculation (growing/stable/declining) from time buckets.
- Store aggregates in `MarketRoleData` with `lastUpdated` and sample size.

**Acceptance criteria:** each requirement row can drill into contributing postings; stale data is visibly stale; no percentage is shown below the minimum sample threshold; aggregation is reproducible from stored postings.

### 4.3 Career product

- Candidate profile input (upload or manual) → gap plan against a chosen role.
- Evidence-backed learning directions (no generic advice).
- Compare roles side by side.
- Export a gap report.

**Acceptance criteria:** the user can see "you have X, the market asks for Y, here is the evidence"; no claim without a citation; profile data is deletable.

---

# Phase 5 — Production readiness

**Goal:** safe multi-tenant operation.

### 5.1 Identity & access

- Authentication (e.g. Auth.js) with organization membership.
- RBAC: recruiter, hiring manager, admin.
- Server-side authorization on every query/mutation.
- Session/CSRF/rate-limit protections.

### 5.2 Privacy & compliance

- Data retention and deletion workflows.
- Encryption at rest/in transit; secret management.
- PII minimization; redaction in logs.
- Consent for provider calls; no hosted models without explicit opt-in.
- Documented subprocessors and data residency.

### 5.3 Reliability

- Health checks, structured logs, error tracking, metrics, alerts.
- Backups + restore drills.
- Migration strategy and rollback plan.
- Load test batch screening.
- Graceful provider degradation (mock fallback).

### 5.4 Quality

- Playwright e2e: wizard → run → shortlist → decision → reload.
- Visual regression for key screens.
- Accessibility CI (axe).
- Dependency/security scanning; resolve the dev-only `braces` advisory upstream.

### 5.5 Deployment

- Environment matrix (local/staging/prod).
- PostgreSQL adapter + migrations.
- Object storage for resumes (if not DB blobs).
- Worker deployment for batch jobs.
- Runbook for failed runs and provider outages.

---

## 2. Suggested next ten pull requests

Ordered for maximum de-risking with minimal churn:

1. `test: migrate engine suite to Vitest and add score-bound property tests`
2. `refactor(domain): introduce canonical domain types and delete UI adapters`
3. `refactor(engine): make scoring consume match results (single match definition)`
4. `fix(experience): compute years from employment dates with overlap handling`
5. `feat(auth): add authentication and organization scoping to screenings and settings`
6. `feat(db): add an AuditLog and server actions for decisions, with actor identity`
7. `feat(db): persist provider/model extraction history and expose scoring-run history`
8. `feat(ingestion): OCR scanned PDFs, deduplicate resumes, and merge multi-resume candidates`
9. `feat(batch): wire lib/batch and CandidateProcessingJob to the wizard with streamed progress`
10. `feat(seed): seed sample roles/screenings into Prisma and read them server-side`

Each PR should include tests, a docs update, and a smoke check of the affected routes.

---

## 3. Backlog (not scheduled)

- CSV import/export of candidates and decisions.
- Saved views and shareable shortlist links.
- Email notifications for completed runs.
- Interview kit generation from gaps (human-reviewed, no automated decisions).
- Charts for score distributions and market trends (add a chart library when needed; `recharts` was removed as unused in v0.2).
- Advanced table virtualization for 200+ candidates (add TanStack Table when needed; removed as unused in v0.2).
- Dark mode (requires a deliberate token pass, not an ad-hoc class swap).
- Internationalization.
- Role taxonomy management UI (`Skill`/`SkillAlias` CRUD).
- Model comparison harness (mock vs Ollama extraction quality).
- Candidate self-service portal.

---

## 4. Explicit non-goals

Do not build these without a product decision:

- Automatic rejection or "auto-hire".
- A hosted proprietary LLM dependency.
- A general chatbot over candidate data.
- Resume generation or rewriting.
- Scraping private/closed sources.
- A full ATS (interview scheduling, offers, payroll).
- Scores without cited evidence.
- Market statistics without sample size and provenance.

---

## 5. Definition of done (per item)

Every roadmap item ships with:

- [ ] Implementation consistent with the invariants in `AGENTS.md`.
- [ ] Tests (unit, and integration where data is involved).
- [ ] `npm run verify` and `npm run build` green.
- [ ] Empty/loading/error states for new surfaces.
- [ ] Accessibility checks for interactive UI.
- [ ] Docs updated (`AGENTS.md` status, relevant `docs/` file).
- [ ] No regression to the deterministic anchor (or an explicit, documented product decision).
- [ ] Sample/demo labels preserved wherever data is not production-provenanced.
