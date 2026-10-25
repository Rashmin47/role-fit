# Architecture

> Role Fit — evidence-based career and recruitment intelligence.
> This document explains **why the system is shaped this way**, where the boundaries are, and how to extend it without violating the product invariants.

Last verified: 2026-10-19.

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

The project intentionally ships a high-fidelity UI + deterministic engine before the persistence and ingestion layers. This keeps the product thesis testable. The cost is that several surfaces are demo-backed; see the status table in `AGENTS.md`.

---

## 3. Runtime topology

### 3.1 Today (ingestion server-side, scoring browser-side)

```text
┌──────────────────────────── Browser ────────────────────────────┐
│ Next.js App Router (client components for interactive screens)  │
│                                                                  │
│  NewScreeningWorkflow ──POST files──┐                           │
│        ▲                               │                        │
│        │ extracted text + failures     │                        │
│        │                               │                        │
│  screenCandidateText() per candidate ◄─┘                        │
│        │                                                         │
│        ▼                                                         │
│  getAIProvider() ──► mock heuristics (today) ──► validator       │
│        │                        └──────────────► Ollama HTTP     │
│        ▼                                                         │
│  lib/scoring / matching / routing (pure functions)               │
│        │                                                         │
│        ▼                                                         │
│  screening-store (module store + useSyncExternalStore)           │
│        │                                                         │
│        ▼                                                         │
│  localStorage  ◄──── dashboard, shortlist, candidate detail      │
│                                                                  │
│  Career/market views ◄── lib/data/sample-data.ts (static)        │
└───────────────────────────────┬──────────────────────────────────┘
                                │ multipart/form-data
┌───────────────────────────────▼──────────────────────────────────┐
│ Server: app/api/ingest/route.ts                                  │
│ unpdf (PDF) · mammoth (DOCX) · UTF-8 (TXT/MD)                    │
│ limits · per-file failures · no persistence · no OCR             │
└──────────────────────────────────────────────────────────────────┘

Prisma schema / SQLite: present but unused by the running app.
```

Consequences:

- Everything works offline, but nothing is shared across devices.
- PDF/DOCX text extraction runs on the server. Candidate/provider extraction still runs in the browser, so Ollama needs CORS configuration and the server-only `AI_PROVIDER` value is not available to the wizard.
- Uploaded files are parsed per run and not stored. There is no OCR, so scanned/image-only PDFs fail with a recoverable error.
- A hard reload of a locally-created screening works because the store hydrates from `localStorage`; SSR initially renders sample data until hydration.
- Screenings created from the bundled sample resume set carry `isSample: true` and are labelled in the UI.
- No candidate data should be treated as durable or private in this mode.

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
- `provider.ts`: `AIProvider` interface + `getAIProvider()` factory driven by `AI_PROVIDER`.
- `mock-provider.ts`: offline rule/pattern extractor. Job extraction is catalog-based and line-scoped; candidate extraction delegates to `resume-heuristics.ts`. It no longer invents fallback requirements, employers, degrees, or experience years.
- `resume-heuristics.ts`: section splitting, name/contact extraction, date-range experience parsing, education/projects/certifications, skill evidence lines, and confidence scoring. Explicit experience statements win; otherwise closed date ranges and `Present` roles are converted to years as of extraction time.
- `ollama-provider.ts`: local HTTP calls to `/api/generate` with JSON formatting. Both job and candidate output are validated; candidate extraction falls back to the mock provider on error.
- `prompts/job-extraction.ts`: system prompt + user prompt builder.

Rules for providers:

1. Return structured facts only.
2. Never return a score, queue, or decision.
3. Validate untrusted output before returning it.
4. Always provide a fallback path that keeps the app usable.
5. Keep prompts versioned in code, not hidden in UI strings.

### 4.2 `lib/screening` — candidate orchestration

`screenCandidateText()` is the single path from resume text to a scored candidate:

```text
provider extraction → validateCandidateProfileOutput
→ candidateProfileToExtraction → calculateFinalMatchScore
→ attach extractionConfidence + extractionWarnings
```

`structuredJobToRequirements()` adapts validated job output into the presentation/engine shape. The module is intentionally thin; it enforces the boundary between AI DTOs and deterministic scoring. It does not persist anything.

The ingest route (`app/api/ingest/route.ts`) is adjacent but separate: it converts uploaded PDF/DOCX/TXT/MD files to text and returns per-file failures. It never calls a provider or the scorer.

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

`BatchScreeningPipeline` processes each candidate independently:

1. extract profile,
2. evaluate match,
3. score,
4. route,
5. record status/error per candidate.

Sequential today, intentionally per-candidate (avoids monolithic context). It is not called by the UI yet; the wizard performs the same extraction → match → score → route loop per candidate through `lib/screening`. When wiring it:

- stream progress to the client,
- persist `ScoringRun` + `CandidateProcessingJob`,
- make retries idempotent by `(jobId, candidateId)`,
- keep failures isolated so one bad resume does not abort a batch.

### 4.9 `lib/tools` — deterministic tool registry

A lightweight registry of internal functions (`normalize_skill`, `calculate_experience`, `retrieve_market_requirements`, `search_skill_taxonomy`). It exists as the foundation for function calling / future agentic extraction, but is not yet invoked by providers or UI.

Treat tool handlers as domain functions: pure, typed, and testable.

### 4.10 `lib/store` — client state

A module-level external store with `useSyncExternalStore`:

- one shared snapshot across all mounted consumers,
- `localStorage` persistence,
- cross-tab sync via the `storage` event,
- server snapshot = sample data, client snapshot = persisted data,
- decisions and notes are stored on the candidate record,
- screenings carry `isSample`, `processingNotes`, and per-candidate extraction confidence/warnings.

Why a module store rather than React Context: no provider nesting, no hydration effect, and consumers outside a subtree can share data. Why not Zustand: the surface is small and the built-in primitive is sufficient.

### 4.11 `prisma/` — target persistence

The schema models organizations, users, jobs, requirements, candidates, resumes, normalized candidate skills/experience, matches, scoring runs, per-candidate processing jobs, market postings/evidence, market role aggregates, and companies.

It is **not imported by the app**. `prisma/generated` is git-ignored and must be generated locally. See `docs/DATA-MODEL.md` for the mapping and migration plan.

---

## 5. Request flows

### 5.1 Job requirement extraction (current)

```text
User pastes job description (NewScreeningWorkflow step 1)
  → getAIProvider().extractJobRequirements(title, text)
     → MockAIProvider: regex experience + catalog keyword scan
       · line-scoped preferred detection
       · "X or Y" → Y becomes preferred, not a second hard requirement
       · no fallback requirements; empty output is allowed
     → or OllamaAIProvider: POST /api/generate → validateJobRequirementsOutput → fallback
  → user reviews/edits required vs preferred (step 2)
  → structuredJobToRequirements() builds the engine shape
```

### 5.2 Resume ingestion and screening (current)

```text
User stages PDF/DOCX/TXT/MD files or the bundled sample set (step 3)
  → POST /api/ingest (uploaded files only)
     → magic-byte + extension checks, size/count/rate limits
     → unpdf / mammoth / UTF-8 text extraction
     → { documents[], failed[] } with truncation flags
  → screenCandidateText() per candidate
     → getAIProvider().extractCandidateProfile(text, nameHint)
     → validateCandidateProfileOutput() repairs/rejects
     → candidateProfileToExtraction()
     → calculateFinalMatchScore() (deterministic)
     → extractionConfidence + extractionWarnings attached
  → failures are isolated per file/candidate and surfaced as processing notes
  → candidates sorted by score, JobScreening written to localStorage
  → redirect to /recruitment/[jobId]

Sample mode skips /api/ingest and uses DEMO_RESUME_POOL text directly.
The resulting screening carries isSample: true and is labelled in the UI.
```

### 5.3 Candidate review (current)

```text
/recruitment/[jobId]
  → read screening from store
  → sample label / processing notes / weights
  → table sort/filter, decision select
  → /recruitment/[jobId]/candidate/[candidateId]
     → score tiles, requirement-by-requirement citations, gaps, notes
     → low-confidence extraction callout when confidence < 0.6
     → human decision + notes written back to store
```

### 5.4 Career intelligence (current)

```text
/career-intelligence or /[role]
  → read SAMPLE_CAREER_ROLES
  → requirement frequency, experience brackets, priorities, sample gap analysis
  → all data labelled "Sample market dataset"
```

### 5.5 Target flows to build

1. **Server extraction**: upload/paste → server action → provider → validated structured requirements → DB.
2. **Batch screening**: create run → enqueue candidates → per-candidate jobs → persist matches → progress stream → shortlist.
3. **Market ingestion**: collect public postings → extract skills/experience → store evidence sources → aggregate role stats with citations.
4. **Candidate career profile**: upload own resume → extracted profile → compare against role market data → gap plan.

---

## 6. Architectural decisions (ADR summary)

| # | Decision | Rationale | Consequences |
| --- | --- | --- | --- |
| A1 | AI extracts, application code scores | Auditability, reproducibility, product trust | Providers constrained to structured facts |
| A2 | Local/open-weight providers only | Privacy, hackathon constraint, no vendor lock-in | Lower extraction quality; explicit fallback needed |
| A3 | Next.js App Router + TypeScript | One codebase for marketing + product, typed contracts | Client/server boundaries must be respected; async params in Next 16 |
| A4 | Tailwind v4 CSS-first tokens | Fewer config files, native theme variables | No `tailwind.config.js`; tokens live in `globals.css` |
| A5 | Module external store now, Prisma later | Ship a testable UI before infrastructure | Demo data is not durable; migration required |
| A6 | Presentation and pipeline types coexist | Avoid a risky big-bang refactor during UI work | Duplication and conversion code; unification is Phase 1 |
| A7 | Deterministic offline provider with honest heuristics | Offline demos and test stability | Lower recall than an LLM; unrecognized fields stay empty instead of being invented |
| A8 | No auto-reject state | Ethical/human-in-the-loop requirement | Routing only triages; decisions are explicit |
| A9 | Stable Prisma 7, not 8 RC | Production stability | Revisit when Prisma 8 is GA |
| A10 | TypeScript 5.9, not 7 | Upstream Next/Prisma compatibility | Revisit after ecosystem support |

---

## 7. Security, privacy, and ethics

Current demo mode:

- No authentication, authorization, or tenant isolation.
- Candidate data may be stored unencrypted in browser `localStorage`.
- Uploaded file contents are parsed in memory by `/api/ingest` and are not persisted, but they do leave the browser and reach the local Next.js server.
- The in-memory rate limiter resets on restart and is not a substitute for edge/platform protection.
- Do not use real candidate data in demos without a privacy review.

Before production:

- Authenticate users and scope every query by `organizationId`.
- Encrypt or avoid storing raw resume text; define retention and deletion.
- Record an audit trail for extraction, score recomputation, and human decisions.
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
| Persistence | server-only repository module | Do not import Prisma into client components |
| New page | `app/(dashboard)/…` | Add to `AppShell` nav only if it is a top-level destination |
| New UI primitive | `components/ui/` | Follow existing token/accessibility patterns |

---

## 9. Testing strategy

Today:

- `lib/tests/engine.test.ts` asserts normalization, scoring math, routing, job/candidate schema validation, resume heuristics, and an end-to-end sample screening run (45 assertions).
- TypeScript, ESLint, and production build are the other gates.
- `/api/ingest` was smoke-tested with real PDF, DOCX, TXT, corrupt PDF, and empty-file fixtures, but those fixtures are not committed.
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
