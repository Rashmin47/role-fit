# Roadmap

> What to build next, why, and how to know it is done.
>
> This roadmap is grounded in the original product plan (the six AI capability areas: structured extraction, routing logic, tool calling, multi-step pipeline, retrieval grounding, and batch processing) and the current implementation status.
>
> Last verified: 2026-10-19.

---

## 0. Where the project stands

### Shipped

- Marketing landing page and full dashboard shell.
- Career Intelligence with role selection, requirement frequencies, experience brackets, priorities, and gap analysis (sample dataset).
- Company Intelligence (sample dataset).
- Recruitment workspace: screenings list, 4-step new-screening wizard, shortlist table, candidate detail with requirement-by-requirement citations, gap explanations, human decision + notes.
- Deterministic normalization, matching, scoring, and routing.
- Offline mock provider + Ollama provider with fallback.
- Batch pipeline class (not wired to UI).
- Tool registry (not wired to UI/provider).
- Prisma 7 schema + seed (not wired to app).
- Engine assertion suite, ESLint, TypeScript, production build, CI.
- Platform upgrade: Next 16.4, React 19.3, Tailwind 4.3, Prisma 7.10, TypeScript 5.9.
- Agent documentation set (`AGENTS.md`, `docs/`).

### The honest gap

The product demonstrates the thesis, but the screening path is still a demo:

- uploads are metadata only,
- the wizard scores a fixed demo pool,
- the mock extractor fabricates default experience/education,
- persistence is browser-local,
- market data is static.

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
**Exit criteria:** one type system, validated candidate output, server-side extraction, durable-enough settings, and a real test runner.

### 1.1 Unify the domain types

**Problem:** `lib/ai/schemas.ts` and `types/index.ts` overlap, and conversions live in UI components.

**Do:**

- Define one canonical domain module (e.g. `lib/domain/types.ts`) for `JobRequirements`, `CandidateProfile`, `MatchEvidence`, `SkillGap`, `CandidateScoreResult`.
- Keep AI DTOs only at the provider boundary; map DTO → domain once.
- Remove conversion objects from `NewScreeningWorkflow.tsx` and `lib/batch/index.ts`.
- Keep `JobScreening` as a view projection, not a duplicate domain shape.

**Acceptance criteria:**

- No component constructs a pseudo-candidate object to satisfy the scorer.
- The same candidate+job produces the same result through the wizard and the batch pipeline.
- `grep` finds no `legacyCandidate` / `legacyReqs`-style adapters.
- Engine tests still pass (76/Review anchor).

**Files:** `types/index.ts`, `lib/ai/schemas.ts`, `lib/scoring`, `lib/matching`, `lib/batch`, `components/recruitment/NewScreeningWorkflow.tsx`.

---

### 1.2 Validate candidate extraction

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

---

### 1.3 Consolidate matching and scoring

**Problem:** `lib/matching` and `lib/scoring` both decide what "matched" means, with different depth semantics.

**Do:**

- Make scoring consume `RequirementMatchItem[]` from the matcher (or move all matching into scoring).
- Decide explicitly whether `Basic`/`Working knowledge` earns full, partial, or zero points.
- Keep deterministic evidence citations.
- Delete the duplicate evidence search.

**Acceptance criteria:**

- One function decides match status.
- Unit tests cover Basic/Working/Strong/Expert × required/preferred × skills/experience/projects.
- `calculateFinalMatchScore` no longer re-scans candidate experience independently.
- Document the decision in `docs/ENGINE.md`.

**Files:** `lib/matching/index.ts`, `lib/scoring/index.ts`, `lib/batch/index.ts`, `docs/ENGINE.md`.

---

### 1.4 Move extraction server-side

**Problem:** providers run in the browser; Ollama needs CORS; prompts and provider config are exposed.

**Do:**

- Add `app/api/extract/job/route.ts` and `app/api/extract/candidate/route.ts` (or server actions).
- Add request validation (Zod or a small hand-written validator), size limits, and timeouts.
- Read `AI_PROVIDER`/Ollama config only on the server.
- Return structured data + validation warnings; never return raw model text.
- Keep the mock provider usable without network.

**Acceptance criteria:**

- The wizard calls a server endpoint, not `getAIProvider()` directly.
- Ollama can be enabled with `AI_PROVIDER=ollama` and works without CORS configuration.
- Provider errors produce a typed error response and a user-visible fallback message.
- No secret/provider module is imported into a client bundle (verify in build output).

**Files:** new `app/api/extract/**`, `lib/ai/provider.ts`, `NewScreeningWorkflow.tsx`.

---

### 1.5 Make settings real

**Problem:** provider selection and weights are UI-only; they reset on refresh.

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

### 1.6 Calculate experience from dates

**Problem:** scoring trusts `totalExperienceYears`; the `calculate_experience` tool is unused.

**Do:**

- Normalize `startDate`/`endDate` (YYYY-MM), handle current roles, overlaps, and gaps.
- Compute total months, convert to years, cap at a sane maximum.
- Use the computed value in matching/scoring, while preserving the extracted value for comparison.
- Flag discrepancies > 6 months.

**Acceptance criteria:**

- Overlapping roles are not double-counted.
- Current roles use the run date, deterministically (inject "as of" date for tests).
- Tests cover overlaps, gaps, missing dates, and current roles.
- The candidate detail explains how years were calculated.

**Files:** `lib/tools/index.ts` or new `lib/normalization/experience.ts`, `lib/scoring`, UI detail.

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

### 1.8 Test foundation

**Problem:** the custom assertion script is useful but limited.

**Do:**

- Add Vitest for unit/integration tests; keep the engine suite as the first migration.
- Add coverage reporting for `lib/**`.
- Add fixture builders for jobs/candidates.
- Add a property test: `0 <= total <= 100` for arbitrary inputs.
- Optionally add Playwright for the wizard + decision persistence.

**Acceptance criteria:**

- `npm test` runs Vitest; CI uploads coverage.
- Engine anchors are expressed as readable test cases.
- A failing score test names the component and the expected/actual values.
- No network/model calls in unit tests.

**Files:** `package.json`, `vitest.config.ts`, `lib/tests/**`, `.github/workflows/ci.yml`.

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

### 2.1 Repository layer

- Create server-only `lib/db/` repositories: jobs, candidates, matches, runs, market data.
- Return domain/view types, not raw Prisma rows.
- Every query scoped by `organizationId`.
- Add integration tests against a temporary SQLite database.

### 2.2 Read path migration

- Migrate `/recruitment`, `/recruitment/[jobId]`, and candidate detail to server components + DB reads.
- Keep interactive filters/decisions as client islands.
- Seed the current sample screenings into Prisma so the UI has data on first run.
- Add a data-source switch only if needed during migration; remove it after.

**Acceptance criteria:**

- Opening a screening in a different browser shows the same candidates and decisions.
- No `screenings[0]` fallback; invalid IDs render a proper not-found state.
- `candidateCount`/`reviewedCount`/`shortlistedCount` are derived, not manually stored duplicates (or are transactionally maintained).

### 2.3 Write path + audit

- Server action for decisions and notes.
- `AuditLog` model: actor, action, entity, before/after, timestamp.
- Optimistic UI with rollback on failure.
- Idempotent batch writes keyed by `(jobId, candidateId)`.

**Acceptance criteria:** every decision has an actor and timestamp; concurrent updates do not lose data; audit history is visible or exportable.

### 2.4 localStorage migration

- Offer an explicit "Import browser data" action.
- Map `JobScreening` → Job + requirements + candidates + matches.
- Report imported/skipped counts.
- Bump the storage key and retire the legacy key after one release.

**Acceptance criteria:** a user can keep their demo screenings; import is idempotent; failures are itemized.

### 2.5 Settings persistence

- `ScoringProfile` / `OrganizationSettings` model.
- Provider config stored server-side; never expose secrets to the client.
- Per-run weights snapshot (already `ScoringRun.weightsJson`).

---

# Phase 3 — Real ingestion & batch screening

**Goal:** upload real resumes, extract real text, process 10–200+ candidates, and keep failures isolated.
**Exit criteria:** a user uploads PDFs/DOCX, sees progress, and gets persisted, cited results without fabricated data.

### 3.1 Upload pipeline

- `app/api/upload/route.ts` with:
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

### 3.2 Wire the batch pipeline

- Replace `DEMO_RESUME_POOL` with uploaded candidates.
- Create a `ScoringRun` and one `CandidateProcessingJob` per candidate.
- Process independently; persist status transitions.
- Stream progress (SSE or polling) to the wizard.
- Retry failed items; never abort the whole run for one bad resume.
- Enforce concurrency limits and per-run timeouts.

**Acceptance criteria:** 50-resume run shows accurate progress; one malformed resume does not fail the batch; re-running is idempotent; results are visible after reload; the run records provider/model/weights.

### 3.3 Real candidate extraction

- Validate candidate output (Phase 1.2).
- Remove fabricated defaults from the mock provider; return only what is present.
- Add "insufficient evidence" handling instead of inventing history.
- Improve prompts for dates, titles, and skill levels.
- Support multiple resumes per candidate and deduplicate by email/phone.

**Acceptance criteria:** no fabricated companies/degrees; every skill has an evidence snippet or is marked absent; duplicate uploads are detected.

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
2. `feat(ai): validate candidate profile output and remove fabricated defaults`
3. `refactor(domain): introduce canonical domain types and delete UI adapters`
4. `refactor(engine): make scoring consume match results (single match definition)`
5. `feat(api): move job/candidate extraction behind server routes`
6. `feat(settings): persist provider and scoring weights with validation`
7. `fix(experience): compute years from employment dates with overlap handling`
8. `feat(db): add repositories + seed sample screenings; read recruitment from Prisma`
9. `feat(db): persist decisions/notes with an audit log and server actions`
10. `feat(ingestion): PDF/DOCX text extraction and wire the batch pipeline to uploads`

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
