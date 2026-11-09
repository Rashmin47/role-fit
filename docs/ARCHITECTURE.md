# Architecture

> Role Fit — evidence-based career and recruitment intelligence.
> This document explains **why the system is shaped this way**, where the boundaries are, and how to extend it without violating the product invariants.

Last verified: 2026-11-05.

---

## 1. Product context

Role Fit serves two audiences with one shared model of role requirements:

- **Candidates** need to know which skills, experience levels, and technologies the market actually asks for, and which gaps to close.
- **Recruiters** need to compare many candidates against one role consistently, with citations, and without delegating the decision to a model.

The shared object is a **structured role requirement set**. Career views aggregate it across the market; recruitment views match it against individual candidate evidence.

### Non-goals

- A general-purpose chatbot or assistant.
- A resume builder or applicant tracking system (ATS).
- A model that predicts "hire / no-hire".
- A sourcing tool that scrapes private data.
- A replacement for human judgment.

---

## 2. Architectural principles

### 2.1 Separate interpretation from evaluation

LLM-style models are probabilistic and non-auditable. Hiring scores must be reproducible and explainable. Therefore:

| Concern | Owner | Determinism required |
| --- | --- | --- |
| Parse unstructured text into typed facts | AI provider (`lib/ai`) | No (falls back to deterministic mock) |
| Normalize aliases/titles | `lib/normalization` | Yes |
| Retrieve supporting market evidence | `lib/retrieval` | Yes for a fixed dataset |
| Compare requirements to evidence | `lib/matching` | Yes |
| Compute weighted score | `lib/scoring` | Yes |
| Classify review queue | `lib/routing` | Yes |
| Final decision | Human + `lib/store` | N/A |

A model may output `{ name: "Python", confidence: 0.97, evidence: "..." }`. It may **not** output `score: 82`.

### 2.2 Evidence before assertion

Every `MatchEvidence` carries:

- the requirement it satisfies,
- the candidate's stated value/level,
- an evidence snippet,
- a source document label,
- confidence notes.

If evidence is absent, the requirement is `NOT_FOUND`, not "probably present". The UI renders unmet requirements explicitly.

### 2.3 Human-in-the-loop by construction

Routing produces queues, never outcomes. `DecisionStatus` (`pending`, `shortlisted`, `held`, `not_recommended`) is only set through a human action in the candidate detail view or shortlist table.

### 2.4 Local-first AI

Providers are intentionally limited to:

- `mock` — deterministic rule/pattern extractor, always available, no daemon.
- `ollama` — local open-weight models over HTTP, with graceful fallback to mock.

This keeps candidate data on the operator's machine and avoids vendor lock-in. It also means extraction quality is lower than hosted frontier models; the product compensates with human review and explicit confidence/evidence.

### 2.5 Progressive fidelity

The project intentionally shipped a high-fidelity UI + deterministic engine before persistence and ingestion. Persistence, settings, document ingestion and streamed batch processing are now wired; market data remains sample-only. Batch execution is request-bound rather than a durable worker. See `AGENTS.md` and the roadmap before assuming a surface is production-ready.

---

## 3. Runtime topology

### 3.1 Today (ingestion, extraction, scoring, and persistence server-side)

```text
┌──────────────────────────── Browser ────────────────────────────┐
│ Next.js App Router (client components for interactive screens)  │
│                                                                  │
│  NewScreeningWorkflow                                           │
│    ├─ POST files ──────────────► /api/ingest                    │
│    ├─ POST job text ───────────► /api/extract/job               │
│    ├─ POST resume text ────────► /api/extract/candidate         │
│    └─ POST validated profiles ─► /api/screenings                │
│           │                                                      │
│  screening-store (API-backed module store)                       │
│           │  GET / PATCH                                         │
│           ▼                                                      │
│  dashboard, shortlist, candidate detail, settings                │
│                                                                  │
│  Career/market views ◄── lib/data/sample-data.ts (static)        │
└───────────────────────────────┬──────────────────────────────────┘
                                │ HTTP
┌───────────────────────────────▼──────────────────────────────────┐
│ Server routes                                                    │
│  /api/ingest            unpdf (PDF) · mammoth (DOCX) · UTF-8     │
│  /api/extract/job       settings-aware provider → validator      │
│  /api/extract/candidate settings-aware provider → validator      │
│  /api/screenings        revalidate → deterministic engine → DB   │
│  /api/settings          read/write WorkspaceSettings + Ollama    │
│  limits · timeouts · fallback metadata · no OCR · no file store  │
└───────────────────────────────┬──────────────────────────────────┘
                                │
              mock heuristics or Ollama HTTP
                                │
                       Prisma → SQLite (local)
```

Consequences:

- Provider selection, model, URL, and default weights come from `WorkspaceSettings` in the database; environment variables are bootstrap/fallback values only.
- The server owns matching, scoring, and routing. A client can submit validated extraction facts, but it cannot submit a score the server will trust.
- Screenings, requirements, candidate profiles, matches, scoring runs, decisions, and notes are durable in Prisma.
- PDF/DOCX text extraction and provider extraction both run on the server. `AI_PROVIDER` and Ollama configuration never enter the client bundle, so Ollama does not need CORS configuration.
- Uploaded files are parsed per run and not stored. There is no OCR, so scanned/image-only PDFs fail with a recoverable error. Extracted profiles and evidence snippets are stored.
- A hard reload reads the same persisted screening. The store is a cache; Prisma is the source of truth.
- Screenings created from the bundled sample resume set carry `isSample: true` and are labelled in the UI.
- No authentication or organization scoping exists yet. All screenings attach to the seeded demo organization when present. Do not treat candidate data as private or production-ready.

### 3.2 Target (production)

```text
┌────────────── Browser ──────────────┐
│ Server Components + Client islands  │
│ forms, filters, optimistic updates  │
└───────────────┬─────────────────────┘
                │ Server Actions / Route Handlers
┌───────────────▼─────────────────────┐
│ Application layer (server-only)      │
│  - auth + organization scoping       │
│  - ingestion (PDF/DOCX → text)       │
│  - provider orchestration            │
│  - batch run coordinator             │
│  - audit log                         │
└───────────────┬─────────────────────┘
                │ repositories
┌───────────────▼─────────────────────┐
│ Domain (pure)                        │
│  normalization → matching → scoring  │
│  → routing                           │
└───────────────┬─────────────────────┘
                │ Prisma client
┌───────────────▼─────────────────────┐
│ PostgreSQL (prod) / SQLite (local)   │
│ jobs, candidates, matches, runs,     │
│ market postings, evidence, audit     │
└──────────────────────────────────────┘
```

The target keeps the domain pure and moves I/O to the edges. Do not move scoring into a database or a model call.

---

## 4. Layer responsibilities

### 4.1 `lib/ai` — extraction boundary

- `schemas.ts`: TypeScript contracts + `validateJobRequirementsOutput()` and `validateCandidateProfileOutput()`. This is the trust boundary for both job and candidate extraction. Candidate validation repairs or rejects negative years, non-array skills/experience, malformed certifications, and out-of-range confidence; it records warnings for the UI.
- `provider.ts`: `AIProvider` interface + `getAIProvider()` factory driven by `AI_PROVIDER`, plus `getLastRunInfo()` metadata for fallback reporting.
- `server-extraction.ts`: server-only orchestration shared by the extraction routes and server tests. It enforces a 60s timeout, revalidates provider output, and returns `{ data, warnings, provider: { name, fallbackUsed, warning? } }`. Importing it in client code throws.
- `extraction-contract.ts`: wire types shared by the routes and browser client. It carries validated structured data only, never raw model completions.
- `mock-provider.ts`: offline rule/pattern extractor. Job extraction is catalog-based and line-scoped; candidate extraction delegates to `resume-heuristics.ts`. It no longer invents fallback requirements, employers, degrees, or experience years.
- `resume-heuristics.ts`: section splitting, name/contact extraction, date-range experience parsing, education/projects/certifications, skill evidence lines, and confidence scoring. Explicit experience statements win; otherwise closed date ranges and `Present` roles are converted to years as of extraction time.
- `ollama-provider.ts`: local HTTP calls to `/api/generate` with JSON formatting and a 55s request timeout. Both job and candidate output are validated; both fall back to the mock provider on error and record a user-facing warning.
- `prompts/job-extraction.ts`: system prompt + user prompt builder.

Rules for providers:

1. Return structured facts only.
2. Never return a score, queue, or decision.
3. Validate untrusted output before returning it.
4. Always provide a fallback path that keeps the app usable.
5. Keep prompts versioned in code, not hidden in UI strings.

### 4.2 `lib/screening` — candidate orchestration

`lib/screening/score-candidate.ts` is the environment-agnostic deterministic boundary (no provider, network, or environment access):

```text
validated CandidateProfile → candidateProfileToExtraction
→ calculateFinalMatchScore → attach extractionConfidence + extractionWarnings
```

`lib/screening/screen-candidate.ts` is the server-side convenience path used by batch jobs and tests:

```text
resume text → extractCandidateProfileOnServer
→ scoreCandidateProfile
```

`structuredJobToRequirements()` adapts validated job output into the presentation/engine shape. These modules are intentionally thin; they enforce the boundary between AI DTOs and deterministic scoring and do not persist anything. Persistence lives in `lib/db/screenings.ts`. The live wizard posts validated profiles to `/api/screenings`, where the server re-validates and calls `scoreCandidateProfile()` before writing.

The ingest route (`app/api/ingest/route.ts`) is adjacent but separate: it converts uploaded PDF/DOCX/TXT/MD files to text and returns per-file failures. It never calls a provider or the scorer. The extraction routes (`app/api/extract/job/route.ts`, `app/api/extract/candidate/route.ts`) are the only HTTP provider boundary.

### 4.3 `lib/normalization` — canonical vocabulary

`CANONICAL_SKILL_MAP` maps aliases (`psql`, `postgres`, `postgresql`) to canonical labels (`PostgreSQL`). Unknown tokens fall back to title case.

`matchSkills()` normalizes both sides, then checks equality or bidirectional substring containment. This is intentionally forgiving for resume text but can produce false positives (e.g. `React` vs `React Native`). Any tightening must be test-driven.

This layer should eventually be backed by the `Skill` / `SkillAlias` Prisma tables and a seeded taxonomy.

### 4.4 `lib/retrieval` — grounding

Today: an in-memory repository of three sample postings plus market-role fixtures. `retrieveRelevantJobPostings()` filters by role/skill overlap; `retrieveMarketEvidence()` returns aggregated stats and citations with the label `Sample market dataset`.

It is **not** a vector database or a live scraper. The interface is shaped so that a real repository (Prisma `JobPosting` + `EvidenceSource`, or a vector index) can replace the sample array without changing callers.

### 4.5 `lib/matching` — requirement ↔ evidence

`evaluateCandidateMatch()` classifies each required/preferred requirement as `MATCH`, `PARTIAL`, or `NOT_FOUND` and produces review flags.

It is the more expressive matcher (supports partial depth and work-history evidence). `lib/scoring` independently recomputes matching to earn points. The duplication is a known consolidation target; until then, both must agree on the meaning of "matched".

### 4.6 `lib/scoring` — weighted points

Pure functions:

- `calculateSkillScore`
- `calculateExperienceScore`
- `calculatePreferredSkillScore`
- `calculateEvidenceScore`
- `generateSkillGaps`
- `determineRecruiterRecommendation`
- `calculateFinalMatchScore` (composition)

All are deterministic and independently testable. See `docs/ENGINE.md` for formulas.

### 4.7 `lib/routing` — queue classification

Maps a score + missing count + experience to `STRONG_MATCH`, `REVIEW`, or `NEEDS_VERIFICATION` with reasons and a suggested action. No rejection state exists by design.

### 4.8 `lib/batch` — scalable orchestration

`processCandidateForBatch()` processes each candidate independently:

1. extract profile,
2. evaluate match,
3. score,
4. route,
5. record status/error per candidate.

The wizard now submits parsed texts to `POST /api/screenings/batch`. It creates a
`ScoringRun` and queued `CandidateProcessingJob` rows before extraction. Sequential
processing uses workspace provider settings and weights, retries transient extraction
errors once (not validation errors), and saves each candidate and terminal job status
in one transaction. `start`, `candidate`, `complete`, and `error` NDJSON events drive
the UI. `GET /api/screenings/[jobId]/runs/[runId]` reads persisted progress.

The API supports up to 200 texts, 200k characters per candidate, 20M total characters,
and a 24MB JSON body. Wizard ingestion remains limited to 20 files. This is a
request-bound stream, not a durable worker: disconnects stop after the current
candidate and mark remaining jobs failed where possible; hard process termination
can leave stale PROCESSING rows. Host duration limits still apply. Automatic resume,
cross-request idempotency, and a run-history UI remain future work.

### 4.9 `lib/tools` — deterministic tool registry

A lightweight registry of internal functions (`normalize_skill`, `calculate_experience`, `retrieve_market_requirements`, `search_skill_taxonomy`). It exists as the foundation for function calling / future agentic extraction, but is not yet invoked by providers or UI.

Treat tool handlers as domain functions: pure, typed, and testable.

### 4.10 `lib/store` — client cache

A module-level external store with `useSyncExternalStore`:

- one shared snapshot across all mounted consumers,
- HTTP-backed: `GET /api/screenings`, with optimistic decision PATCH and rollback on failure,
- `localStorage` is no longer read or written; Prisma is the source of truth,
- server snapshot is an empty list with a loading state, client snapshot is the persisted queue,
- decisions and notes are stored on the `CandidateMatch` row,
- screenings carry `isSample`, `processingNotes`, and per-candidate extraction confidence/warnings,
- load errors are surfaced in the UI instead of silently showing stale demo data.

Why a module store rather than React Context: no provider nesting, no hydration effect, and consumers outside a subtree can share data. Why not Zustand: the surface is small and the built-in primitive is sufficient.

### 4.11 `lib/db` + `prisma/` — persistence

`lib/db/prisma.ts` is the server-only Prisma singleton with the `better-sqlite3` adapter. `lib/db/screenings.ts` is the repository:

- `createScreening()` re-validates and scores profiles server-side, then writes Job, Requirement, Candidate, CandidateSkill, CandidateExperience, CandidateMatch, and ScoringRun rows in one transaction,
- `listScreenings()` / `getScreeningById()` map rows back to the presentation `JobScreening` shape,
- `updateCandidateDecision()` persists a human decision, notes, and `reviewedAt`,
- `recomputeScreeningWeights()` re-scores from each stored `Candidate.profileJson` and writes a new `ScoringRun` while preserving decisions and notes.

The schema models organizations, users, jobs, requirements, candidates, resumes, normalized candidate skills/experience, matches, scoring runs, per-candidate processing jobs, workspace settings, market postings/evidence, market role aggregates, and companies. `prisma/generated` is git-ignored and must be generated locally. See `docs/DATA-MODEL.md` for the mapping.

### 4.12 `lib/settings` — runtime configuration

`lib/settings/types.ts` is client-safe: defaults, weight validation, and the `WorkspaceSettings` shape. `lib/settings/server.ts` reads and writes the single `WorkspaceSettings` row and adapts it to `AIProviderConfig`. Environment variables seed the defaults; the database wins on every request. `/api/settings/ollama` performs a real `/api/tags` probe and reports whether the configured model is installed.

---

## 5. Request flows

### 5.1 Job requirement extraction (current)

```text
User pastes job description (NewScreeningWorkflow step 1)
  → POST /api/extract/job { title, description }
     → loadWorkspaceSettings() → toProviderConfig()
     → extractJobRequirementsOnServer(title, text, config)
        → getAIProvider(config).extractJobRequirements(title, text)
           → MockAIProvider: regex experience + catalog keyword scan
             · line-scoped preferred detection
             · "X or Y" → Y becomes preferred, not a second hard requirement
             · no fallback requirements; empty output is allowed
           → or OllamaAIProvider: POST /api/generate → validate → fallback + warning
        → validateJobRequirementsOutput()
     → { requirements, warnings, provider: { name, fallbackUsed, warning? } }
  → user reviews/edits required vs preferred (step 2)
  → structuredJobToRequirements() builds the engine shape
```

The route enforces a 50k-character description limit, a 150k-byte body limit, 30 requests/minute per client, and a 60s timeout. Provider errors return typed JSON errors; the offline fallback remains usable without a network. The provider, model, and URL come from `WorkspaceSettings`.

### 5.2 Resume ingestion and screening (current)

```text
User stages PDF/DOCX/TXT/MD files or the bundled sample set (step 3)
  → POST /api/ingest (uploaded files only)
     → magic-byte + extension checks, size/count/rate limits
     → unpdf / mammoth / UTF-8 text extraction
     → { documents[], failed[] } with truncation flags
  → POST /api/extract/candidate per candidate
     → loadWorkspaceSettings() → provider config
     → getAIProvider(config).extractCandidateProfile(text, nameHint)
     → validateCandidateProfileOutput() repairs/rejects
     → { profile, warnings, provider: { name, fallbackUsed, warning? } }
  → collect validated profiles + warnings + processing notes
  → POST /api/screenings { requirements, candidates, weights? }
     → validateCreateScreeningInput() re-validates every profile
     → createScreening() in lib/db/screenings.ts
        → scoreCandidateProfile() (deterministic, server-side)
        → transaction: Job, Requirements, Candidates, Matches, ScoringRun
     → { screening, failed[] }
  → store caches the persisted screening and redirects to /recruitment/[jobId]

Sample mode skips /api/ingest and uses DEMO_RESUME_POOL text directly.
The resulting screening carries isSample: true and is labelled in the UI.
Per-file and per-candidate failures are isolated; scoring failures are
returned in `failed[]` and also recorded in the screening's processing notes.
```

### 5.3 Candidate review (current)

```text
/recruitment/[jobId]
  → screening-store loads GET /api/screenings (once per page lifetime)
  → sample label / processing notes / weights
  → table sort/filter, decision select
  → /recruitment/[jobId]/candidate/[candidateId]
     → score tiles, requirement-by-requirement citations, gaps, notes
     → low-confidence extraction callout when confidence < 0.6
     → human decision + notes PATCHed to
       /api/screenings/[jobId]/candidates/[candidateId]
        → optimistic update, rollback + error callout on failure
  → weight change PATCHes /api/screenings/[jobId]
     → deterministic recompute from stored profileJson
     → new ScoringRun, decisions and notes preserved
```

### 5.4 Career intelligence (current)

```text
/career-intelligence or /[role]
  → read SAMPLE_CAREER_ROLES
  → requirement frequency, experience brackets, priorities, sample gap analysis
  → all data labelled "Sample market dataset"
```

### 5.5 Target flows to build

1. **Batch screening**: create run → enqueue candidates → per-candidate jobs → persist matches → progress stream → shortlist.
2. **Extraction history and audit UI**: expose `ScoringRun` history, provider/model per extraction, and decision audit details in the workspace.
3. **Authentication and organization scoping**: every screening/settings read and write scoped to a tenant.
4. **Market ingestion**: collect public postings → extract skills/experience → store evidence sources → aggregate role stats with citations.
5. **Candidate career profile**: upload own resume → extracted profile → compare against role market data → gap plan.

---

## 6. Architectural decisions (ADR summary)

| # | Decision | Rationale | Consequences |
| --- | --- | --- | --- |
| A1 | AI extracts, application code scores | Auditability, reproducibility, product trust | Providers constrained to structured facts |
| A2 | Local/open-weight providers only | Privacy, hackathon constraint, no vendor lock-in | Lower extraction quality; explicit fallback needed |
| A3 | Next.js App Router + TypeScript | One codebase for marketing + product, typed contracts | Client/server boundaries must be respected; async params in Next 16 |
| A4 | Tailwind v4 CSS-first tokens | Fewer config files, native theme variables | No `tailwind.config.js`; tokens live in `globals.css` |
| A5 | Server-side persistence + API-backed client cache | Durable, shared, auditable screenings without putting Prisma in the client | Requests now depend on an initialized DB; routes return 503 when missing |
| A6 | Presentation and pipeline types coexist | Avoid a risky big-bang refactor during UI work | Duplication and conversion code; unification is Phase 1 |
| A7 | Deterministic offline provider with honest heuristics | Offline demos and test stability | Lower recall than an LLM; unrecognized fields stay empty instead of being invented |
| A8 | No auto-reject state | Ethical/human-in-the-loop requirement | Routing only triages; decisions are explicit |
| A9 | Stable Prisma 7, not 8 RC | Production stability | Revisit when Prisma 8 is GA |
| A10 | TypeScript 5.9, not 7 | Upstream Next/Prisma compatibility | Revisit after ecosystem support |

---

## 7. Security, privacy, and ethics

Current demo mode:

- No authentication, authorization, or tenant isolation. All screenings attach to the seeded demo organization when present.
- Candidate profiles, evidence excerpts, decisions, and notes are stored unencrypted in the local SQLite database. Uploaded files are not stored.
- Uploaded file contents are parsed in memory by `/api/ingest` and are not persisted, but they do leave the browser and reach the local Next.js server.
- Resume text is also sent to `/api/extract/candidate`; the server calls the locally configured provider and returns validated structured data. Provider configuration stays server-side.
- The in-memory rate limiter resets on restart and is not a substitute for edge/platform protection.
- Do not use real candidate data in demos without a privacy review.

Before production:

- Authenticate users and scope every query by `organizationId`.
- Encrypt or avoid storing raw resume text; define retention and deletion.
- Expand the audit trail beyond `ScoringRun`: record provider/model per extraction and every decision change.
- Rate-limit uploads and provider calls.
- Never send candidate data to a hosted model without explicit consent.
- Keep sample/demo labels until real data provenance exists.

---

## 8. Extension points

| Need | Extend here | Notes |
| --- | --- | --- |
| New AI provider | `lib/ai/provider.ts` + new class | Must return validated schema, never scores |
| New skill aliases | `lib/normalization/skills.ts` | Add tests for each alias |
| New scoring component | `lib/scoring/index.ts` + weights type | Weights must still sum to 100; update UI settings |
| New review queue | `lib/routing/index.ts` | No rejection state |
| Real market source | `lib/retrieval/index.ts` + `JobPosting` tables | Preserve citations and provenance |
| PDF/DOCX parsing | `app/api/ingest/route.ts` | Server-only; keep parser calls out of client components |
| Provider extraction | `lib/ai/server-extraction.ts` + `app/api/extract/**` | Server-only; return validated data + warnings, never raw completions |
| Persistence | `lib/db/*` repository modules | Server-only; never import Prisma into client components |
| Persisted tests | `lib/tests/engine.test.ts` + route smoke tests | Reset a temporary SQLite DB before runs; assert scores and decisions survive reload |
| New page | `app/(dashboard)/…` | Add to `AppShell` nav only if it is a top-level destination |
| New UI primitive | `components/ui/` | Follow existing token/accessibility patterns |

---

## 9. Testing strategy

Today:

- `lib/tests/engine.test.ts` asserts normalization, scoring math, routing, schema validation, resume heuristics, the server extraction boundary, sample screening, batch parity/retry isolation, and batch input limits (61 assertions).
- TypeScript, ESLint, and production build are the other gates.
- `/api/ingest` was smoke-tested with real PDF, DOCX, TXT, corrupt PDF, and empty-file fixtures, but those fixtures are not committed.
- `/api/extract/job` and `/api/extract/candidate` were smoke-tested for valid requests, invalid JSON, undersized input, oversized bodies, and the Ollama-offline fallback; provider strings were absent from the production client bundles.
- The persisted path was smoke-tested against a temporary SQLite database: create screening → reload from the API → decision/notes persist → weight recompute preserves decisions and writes a new `ScoringRun` → settings save/read survives restart.
- No component, integration, or browser tests are committed.

Target:

- Vitest for unit + integration of the domain and repositories.
- Playwright for the screening wizard, decision persistence, and career views.
- Contract tests for each provider (mock always; Ollama behind an opt-in flag).
- Golden fixtures for representative job descriptions and resumes.

Any scoring change must update the golden fixture explicitly rather than silently changing expected numbers.

---

## 10. Related documents

- [`../AGENTS.md`](../AGENTS.md) — operating manual, status, pitfalls
- [`ENGINE.md`](./ENGINE.md) — formulas, thresholds, semantics
- [`DATA-MODEL.md`](./DATA-MODEL.md) — types and persistence mapping
- [`ROADMAP.md`](./ROADMAP.md) — sequencing and acceptance criteria
