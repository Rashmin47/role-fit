# AGENTS.md — Role Fit

> **Operating manual for AI agents and new engineers.**
> Read this file before changing code. Then read the focused docs in [`docs/`](./docs/).
>
> Last verified: **2026-11-05** · Next.js **16.4.2** · React **19.3.1** · TypeScript **5.9.3** · Tailwind CSS **4.3.3** · Prisma **7.10.1** · Node **22.x**

---

## 1. What Role Fit is

Role Fit is an **evidence-based career and recruitment intelligence platform**. It connects **what employers require** with **what candidates can actually demonstrate**.

It has two product pillars sharing one engine:

| Pillar | User | Job to be done |
| --- | --- | --- |
| **Career Intelligence** | Candidate / engineer | Understand real market requirements, experience expectations, and skill gaps for a target role. |
| **Recruitment Intelligence** | Recruiter / hiring team | Screen many candidates against one job description with cited evidence and explainable scores. |

The product principle is non-negotiable:

> **AI understands. Role Fit measures. Humans decide.**

Role Fit is **not** a chatbot, **not** a resume builder, and **not** a black-box AI hiring oracle.

---

## 2. Non-negotiable invariants

Break these and you have broken the product:

1. **AI never computes a score and never makes a hiring decision.**
   LLMs / providers may only extract unstructured text into typed JSON.
   All matching, scoring, and routing happen in deterministic application code.
2. **Every matched requirement must carry evidence.**
   A match should cite a resume/work-history/project excerpt or a stated skill. Never invent a citation.
3. **No automatic rejection.**
   Routing may classify into `STRONG_MATCH`, `REVIEW`, or `NEEDS_VERIFICATION`. A human always makes the final decision.
4. **Deterministic in, deterministic out.**
   Given the same candidate, requirements, and weights, the score must be identical. Do not introduce randomness, time dependence, or model calls into scoring.
5. **Validated boundaries.**
   External/AI output must be validated (`lib/ai/schemas.ts`) before it enters the engine.
6. **Local / open-weight AI only.**
   No OpenAI, Anthropic, Gemini, or other proprietary cloud LLM APIs. Providers are `mock` and `ollama`.
7. **Scoring weights must total 100.**
   Required skills + experience + preferred skills + evidence quality = 100.
8. **Never present sample data as live market data.**
   Whenever data comes from `lib/data/sample-data.ts`, keep the `Sample` / `Sample market dataset` labelling visible.
9. **Human decisions are persisted state, not UI decoration.**
   Decisions and notes are stored through `/api/screenings/*` in Prisma. The browser store is a cache, not the source of truth.

---

## 3. Current implementation status

Use this as the source of truth before planning work.

| Area | Status | Where |
| --- | --- | --- |
| Marketing landing page | ✅ Implemented | `app/page.tsx` |
| Dashboard, navigation shell | ✅ Implemented | `app/(dashboard)/`, `components/layout/AppShell.tsx` |
| UI primitives + design tokens | ✅ Implemented | `components/ui/`, `app/globals.css` |
| Career Intelligence views | ✅ Implemented with sample data | `app/(dashboard)/career-intelligence/`, `components/career/` |
| Company Intelligence | ✅ Implemented with sample data | `app/(dashboard)/insights/page.tsx` |
| New screening workflow (4 steps) | ✅ UI complete; extracts uploads or the labelled sample set, then persists through the server | `components/recruitment/NewScreeningWorkflow.tsx` |
| Candidate table, detail, citations | ✅ Implemented and database-backed | `components/recruitment/` |
| Deterministic scoring/matching/routing | ✅ Implemented + tested | `lib/scoring`, `lib/matching`, `lib/routing` |
| Skill normalization | ✅ Implemented (curated alias map) | `lib/normalization/skills.ts` |
| Offline mock extractor | ✅ Honest heuristics; no fabricated defaults | `lib/ai/mock-provider.ts`, `lib/ai/resume-heuristics.ts` |
| Candidate output validation | ✅ Repair/reject + warnings | `validateCandidateProfileOutput()` in `lib/ai/schemas.ts` |
| Ollama provider | ✅ Implemented; server-side routes, validates output, falls back with a warning | `lib/ai/ollama-provider.ts` |
| Batch screening pipeline | ✅ Wired to wizard; NDJSON progress and durable per-candidate outcomes | `lib/batch/index.ts`, `app/api/screenings/batch/route.ts` |
| Per-candidate screening orchestration | ✅ Server-side helper + deterministic scoring helper | `lib/screening/screen-candidate.ts`, `lib/screening/score-candidate.ts` |
| Document ingestion route | ✅ PDF/DOCX/TXT/MD, per-file failures, limits | `app/api/ingest/route.ts` |
| Provider extraction routes | ✅ Server-side job + candidate extraction with limits, timeouts, validation, fallback metadata | `app/api/extract/` |
| Screening persistence | ✅ Prisma-backed create/list/detail, decisions, notes, weight recompute | `lib/db/screenings.ts`, `app/api/screenings/` |
| Workspace settings | ✅ Provider/model/URL + weights persisted in Prisma; Ollama connection check | `lib/settings/`, `app/api/settings/` |
| Retrieval / market grounding | ⚠️ Static sample repository, not real ingestion | `lib/retrieval/index.ts` |
| Tool registry | ✅ Implemented; calculate_experience wired to interval normalization | `lib/tools/index.ts` |
| Prisma schema + seed | ✅ Applied; app reads/writes screenings, candidates, matches, runs, settings | `prisma/` |
| Resume file upload/parsing | ✅ PDF/DOCX/TXT/MD server-side; **no OCR**, files not retained | `app/api/ingest/route.ts` |
| API routes / server actions | ✅ `/api/ingest`, `/api/extract/*`, `/api/screenings/*`, `/api/settings/*`; no server actions yet | `app/api/` |
| Authentication / organizations / RBAC | ❌ None (shell displays a demo workspace) | — |
| Automated test runner | ✅ Vitest unit suite + score property tests | `lib/tests/engine.test.ts` |
| CI | ✅ GitHub Actions verify workflow | `.github/workflows/ci.yml` |

### The most important known gaps

Real ingestion and persistence are wired, but the path is **not production-grade**:

- Provider extraction runs on the server through `/api/extract/*`; the browser never reads `AI_PROVIDER` or calls Ollama directly. The selected provider, model, URL, and default weights are read from `WorkspaceSettings` on each request with environment fallback.
- Uploaded files are parsed per run and not persisted. There is no OCR for scanned/image-only PDFs, no duplicate detection, and no multi-resume candidate merge.
- The wizard posts parsed candidate texts to `/api/screenings/batch`. The server creates a run and candidate jobs, extracts validated facts, scores deterministically, and saves each successful candidate atomically with its progress status. NDJSON streams progress; transient extraction failures retry once.
- Decisions, notes, and weight recomputes persist through Prisma. Batch processing is request-bound, not a durable worker: process termination can leave unfinished jobs in PROCESSING. Completed candidates remain saved; automatic resume and cross-request idempotency are not implemented.
- Provider/weight settings are persisted in `WorkspaceSettings`. There is no per-user or per-organization settings scope yet.
- Job-requirement extraction is heuristic. It no longer invents fallback requirements, but recruiters must review the extracted list.
- There is no authentication, organization scoping, or RBAC. All screenings belong to the seeded demo organization when it exists.

Do not claim these are complete. The roadmap exists to close them.

---

## 4. Architecture at a glance

```text
Job description / PDF / DOCX / TXT / MD
        │
        ▼
┌──────────────────────────────┐
│ Server text extraction       │  app/api/ingest/route.ts
│ PDF / DOCX / TXT / MD        │  unpdf | mammoth | UTF-8
└──────────────────────────────┘
        │  per-file failures + truncation flags
        ▼
┌──────────────────────────────┐
│ Provider extraction (server) │  app/api/extract/job
│ unstructured → typed JSON    │  app/api/extract/candidate
│ mock | ollama                │  lib/ai/server-extraction.ts
└──────────────────────────────┘
        │  validated by lib/ai/schemas.ts
        ▼
┌──────────────────────────────┐
│ Normalization                │  lib/normalization/skills.ts
│ aliases → canonical skills   │
└──────────────────────────────┘
        │
        ├──────────────► Retrieval / market grounding   lib/retrieval/*
        │
        ▼
┌──────────────────────────────┐
│ Matching                     │  lib/matching/index.ts
│ requirement → evidence       │  MATCH / PARTIAL / NOT_FOUND
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Deterministic scoring        │  lib/scoring/index.ts
│ 50 / 25 / 15 / 10 weights    │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Deterministic routing        │  lib/routing/index.ts
│ STRONG_MATCH / REVIEW / ...  │  (no auto-reject)
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Persistence (server)         │  app/api/screenings/route.ts
│ Job + Requirements           │  lib/db/screenings.ts
│ Candidate + Match + Run      │  Prisma / SQLite
└──────────────────────────────┘
        │
        ▼
   Human review in the UI  →  decision + notes persisted through Prisma
```

The orchestrators are `lib/screening/score-candidate.ts` (validated profile → match → score → route), `lib/screening/screen-candidate.ts` (server-side extraction + score), `lib/pipeline/index.ts` (extraction + grounding), and `lib/batch/index.ts` (per-candidate extraction, validation, deterministic scoring, and bounded retry). The live wizard sends parsed texts to `/api/screenings/batch`, which streams progress and persists each outcome through `lib/db/screenings.ts`.

For deep detail see:
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- [`docs/ENGINE.md`](./docs/ENGINE.md) — formulas, thresholds, test matrix
- [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md) — types, Prisma schema, persistence plan
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — prioritized backlog with acceptance criteria

---

## 5. Repository map

```text
app/
  layout.tsx                    Root fonts/metadata
  globals.css                   Tailwind v4 CSS-first theme + base styles
  page.tsx                      Marketing landing page
  api/ingest/route.ts           Server-side PDF/DOCX/TXT/MD → text
  api/extract/job/route.ts      Server-only job requirement extraction
  api/extract/candidate/route.ts Server-only candidate extraction
  api/screenings/route.ts       List + create persisted screenings
  api/screenings/[jobId]/…      Detail, weight recompute, candidate decisions
  api/settings/route.ts         Read + save workspace settings
  api/settings/ollama/route.ts  Real Ollama connectivity/model check
  (dashboard)/
    layout.tsx                  AppShell wrapper
    dashboard/                  Overview
    career-intelligence/        Role market views (+ [role] dynamic page)
    recruitment/                Workspace, /new wizard, [jobId], candidate detail
    candidates/                 Global candidate directory (?q= search)
    insights/                   Observed company requirements
    settings/                   Provider + weights (database-backed)
components/
  layout/AppShell.tsx           Sidebar, header, global search, breadcrumbs
  ui/                           Button, Badge, Card, Input, Callout, StatCard, …
  recruitment/                  CandidateTable, CandidateDetailView, wizard
  career/                       RoleSelector, MarketRequirementsView
lib/
  ai/                           Provider interface, schemas, mock, ollama, prompts
  ai/server-extraction.ts       Server-only provider orchestration + validation
  ai/extraction-contract.ts     Wire contract for /api/extract responses
  api/extraction-client.ts      Browser client for extraction routes
  api/screening-client.ts       Browser client for persisted screenings
  api/screening-contract.ts     Validation + wire contract for screenings
  api/settings-client.ts        Browser client for workspace settings
  db/prisma.ts                  Server-only Prisma singleton + SQLite adapter
  db/screenings.ts              Screening repository + deterministic recompute
  settings/types.ts             Settings validation/defaults (client-safe)
  settings/server.ts            Settings persistence + provider config
  ai/resume-heuristics.ts       Honest offline resume extraction + evidence lines
  screening/score-candidate.ts  Validated profile → match → score → route
  screening/screen-candidate.ts Server-side resume text → extraction → score
  matching/                     Requirement ↔ candidate evidence evaluation
  scoring/                      Deterministic weighted scoring
  routing/                      Queue classification
  normalization/                Canonical skill taxonomy + alias matching
  retrieval/                    Market evidence retrieval (currently static)
  batch/                        Batch screening pipeline
  pipeline/                     Extraction + grounding coordinator
  tools/                        Deterministic tool registry (future function calling)
  data/sample-data.ts           Demo roles/candidates/companies; screenings are DB-backed
  data/demo-resumes.ts          Fictional sample resumes + sample job description
  store/screening-store.ts      API-backed client cache (not localStorage)
  tests/engine.test.ts          Assertion-based engine test suite
  utils.ts                      cn(), formatters
types/index.ts                  Presentation/domain types used by the UI
prisma/
  schema.prisma                 Relational model (screenings, matches, settings)
  seed.ts                       Organization + demo user + default settings
  generated/                    Generated Prisma client (git-ignored)
prisma.config.ts                Prisma 7 CLI/seed/data-source config
docs/                           Architecture, engine, data model, roadmap
```

### Canonical domain types

The domain model is unified in `lib/domain/types.ts` and re-exported through `types/index.ts` and `lib/ai/schemas.ts`:
- `CandidateProfile` is the single canonical domain shape for candidate facts across extraction, validation, matching, and deterministic scoring. `CandidateExtraction` is aliased to `CandidateProfile` for compatibility.
- `JobRequirement` / `ExtractedRequirement` and `JobRequirements` / `StructuredJobRequirements` share aligned schemas.
- Deterministic scoring (`calculateFinalMatchScore`) and batch screening directly consume `CandidateProfile` without pseudo-candidate conversion adapters.

---

## 6. Commands

```bash
# Setup
npm install
cp .env.example .env
npm run db:generate       # prisma generate (required before typecheck/seed)
npm run db:push           # push schema to SQLite
npm run db:seed           # seed organization + demo user + default settings

# Development
npm run dev               # Next.js 16 + Turbopack
npm run build             # production build
npm start                 # serve the production build

# Quality gates — run before claiming work is done
npm run typecheck         # tsc --noEmit
npm run lint              # eslint . (flat config)
npm test                  # deterministic engine assertions
npm run verify            # typecheck + lint + test

# Database utilities
npm run db:studio
```

**Baseline:** all four gates pass and `npm run build` succeeds. The build must not be "fixed" by disabling type checking or linting.

### Environment

```dotenv
DATABASE_URL="file:./prisma/dev.db"
AI_PROVIDER="mock"                 # "mock" | "ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
NEXT_PUBLIC_APP_NAME="Role Fit"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`DATABASE_URL` is resolved from the **project root** (Prisma 7 driver-adapter behavior), hence `./prisma/dev.db`.

---

## 7. Core engine in one screen

Read [`docs/ENGINE.md`](./docs/ENGINE.md) for the full specification.

### Weights

| Component | Default points | What it measures |
| --- | --- | --- |
| Required skills | 50 | Coverage of mandatory requirements |
| Experience | 25 | Verified years vs. minimum years |
| Preferred skills | 15 | Nice-to-have coverage |
| Evidence quality | 10 | Presence of work history, projects, education, certifications |
| **Total** | **100** | |

### Scoring summary

```text
required  = round(50 × matchedRequired / totalRequired)
experience = min(25, round(25 × min(candidateYears / requiredYears, 1.25)))
preferred  = round(15 × matchedPreferred / totalPreferred)
evidence   = min(10, 4·hasExperience + 3·hasProjects + 2·hasEducation + 1·hasCertifications)
total      = min(100, required + experience + preferred + evidence)
```

### Routing thresholds (current behavior)

```text
Strong Match        : total >= 85 AND missingRequired == 0 AND candidateYears >= requiredYears
Review              : total >= 60 OR missingRequired <= 2
Needs Verification  : otherwise
```

> ⚠️ The `OR missingRequired <= 2` branch means a low-scoring candidate with two or fewer missing required skills still lands in **Review**. This is intentional current behavior, covered by tests. If you tighten it, update `lib/scoring`, `lib/routing`, the tests, and the roadmap together.

### Key semantics

- Candidate skills are matched against requirement names via `normalizeSkillName()` + bidirectional substring matching.
- Evidence can come from explicit skills, experience `technologies`, experience descriptions, and (for required skills) project technologies.
- A skill listed as "Working knowledge" still earns full required-skill points today. Depth is recorded but not scored.
- Scoring uses `totalExperienceYears` directly; it does **not** recalculate from employment dates or read the clock. The offline extractor derives that value from an explicit statement or date ranges at extraction time (see `lib/ai/resume-heuristics.ts`), so re-extracting an open-ended role later can change the input.
- The offline extractor never invents employers, degrees, or experience years. Missing evidence stays empty; every extracted skill cites a resume line.
- Job extraction is line-scoped. In "FastAPI or Django", the later alternative is treated as preferred because the engine has no OR-group type yet. No fallback requirements are invented when nothing matches.
- Screenings created from the bundled sample resumes carry `isSample: true` and are labelled in the UI.
- Deterministic test anchor: the fixture in `lib/tests/engine.test.ts` must continue to score **76 / "Review"**. The suite currently has **61 assertions**, including batch score parity, retry limits, failure isolation, and batch input validation.

---

## 8. Conventions

### Next.js / React

- App Router only. Pages under `app/(dashboard)/` are wrapped by `AppShell`.
- **Next 16 dynamic route params are Promises.** Server components `await params`; client components use `React.use(params)`.
- Prefer server components by default. Add `"use client"` only for interactivity, browser APIs, or the API-backed store.
- Use `next/link` for navigation. Use `ButtonLink` rather than nesting a `<button>` inside a `<Link>`.
- API routes live under `app/api/**/route.ts`. `/api/ingest` parses documents; `/api/extract/*` calls providers; `/api/screenings/*` persists screenings/decisions; `/api/settings/*` manages configuration. Keep provider calls, Prisma, and Node-only parsers server-side.
- The wizard never imports `getAIProvider()`, Prisma, or environment configuration. It extracts job requirements through the job route, then sends resume texts to `/api/screenings/batch`, where the server validates profiles, runs `scoreCandidateProfile()`, and persists the results.
- Provider routes return validated structured data, validation warnings, and fallback metadata — never raw model completions. Keep request limits and timeouts in the route, not the UI.
- The ingest route is deliberately stateless. Do not write uploads to disk or add persistence there without a storage/privacy design.
- Provider extraction routes enforce: 50k job chars, 200k candidate chars, 30 job / 60 candidate requests per minute per client, and a 60s timeout. Ollama has a 55s request timeout and falls back to the offline extractor. Keep these limits and the fallback metadata in the route/server layer.

### Styling

- **Tailwind CSS v4 is CSS-first.** Theme tokens live in `app/globals.css` under `@theme`. There is intentionally no `tailwind.config.js`.
- Keep the `nirman-*` token prefix even though the product is Role Fit. It is the established design-system namespace; renaming is a separate, mechanical change.
- Use existing tokens (`bg-nirman-bg`, `text-nirman-text-secondary`, `border-nirman-border`, `shadow-card`, …) instead of raw hex values unless matching an existing local pattern (`#FAFAF8` is used for subtle surfaces).
- Use the UI primitives in `components/ui/` before creating new ones. Keep `cn()` for class merging.
- Font variables are `--font-inter` and `--font-jetbrains-mono`; `--font-sans` / `--font-mono` are Tailwind theme tokens.
- Preserve the v3 radius scale: bare `rounded` = 6px, `rounded-sm` = 4px, `rounded-md` = 8px, `rounded-lg` = 10px, `rounded-xl` = 14px, `rounded-2xl` = 18px.

### TypeScript / data

- `strict` is on. Do not add `@ts-ignore`; fix the type or validate at the boundary.
- `any` is allowed only in the untrusted AI-output validation layer; prefer `unknown` + a validator elsewhere.
- IDs: sample data uses readable IDs (`cand-01`, `req-1`); Prisma uses `cuid()`. Do not assume numeric IDs.
- Dates in sample data are ISO strings. Store timestamps in Prisma as `DateTime`.

### Ingestion

- `app/api/ingest/route.ts` is the single document → text boundary. Keep PDF/DOCX parser calls there, not in client components.
- Validate extension **and** magic bytes. Return per-file failures instead of failing the whole request when one file is corrupt.
- Current limits: 20 files, 10 MB per file, 50 MB per request, 200k characters per document, 20 requests/minute per client (in-memory).
- Do not persist uploaded files. If storage is added, define retention, access control, and organization scoping first.
- No OCR. Scanned/image-only PDFs must fail with a readable error, not a blank candidate.
- Sample mode must set `isSample: true` on the screening and keep the **Sample** label visible in the list, dashboard, and detail views.
- Surface non-fatal ingestion problems through `processingNotes`; isolate per-candidate extraction failures so one bad resume does not abort the run.

### State

- Screening state is a **shared module-level external store** consumed via `useSyncExternalStore`.
  Do not reintroduce a per-component `useState` copy; decisions must stay in sync across dashboard, shortlist, and detail views.
- The store is an **API-backed cache**. Prisma is the source of truth; the store calls `/api/screenings` and applies optimistic decision updates with rollback on failure.
- Do not reintroduce `localStorage` as a correctness path. Legacy keys are no longer read.
- Workspace settings live in the `WorkspaceSettings` row; `AI_PROVIDER` and the Ollama environment variables are bootstrap/fallback values only. Changes made in the UI take effect on the next extraction request.

### Naming

- Product name in UI, metadata, docs, and package name: **Role Fit** (`role-fit`).
- The design token prefix `nirman-*` is retained for compatibility.
- Use American English in UI copy ("normalize", "organization").
- Keep the tone: precise, calm, evidence-led. Avoid hype and AI mysticism.

---

## 9. Accessibility and UX expectations

- Every interactive control needs an accessible name (`aria-label`, visible label, or associated `<label>`).
- Preserve the skip link, focus-visible ring, reduced-motion handling, and keyboard navigation in `AppShell`.
- Tables must keep `scope="col"` headers and meaningful empty states.
- Status must never be conveyed by color alone; pair color with text or a dot+label.
- Loading, empty, and error states are required for any new data surface.
- Do not hide required product disclaimers (sample data, human decision, evidence citations).

---

## 10. Changing the engine safely

1. Add/adjust a case in `lib/tests/engine.test.ts` **first**.
2. Change one layer at a time: normalization → matching → scoring → routing.
3. Keep `DEFAULT_SCORING_WEIGHTS` summing to 100.
4. Preserve the distinction between "missing required" and "missing preferred".
5. Do not allow a provider/model to return a score. Providers return extracted facts only.
6. Run `npm run verify`.
7. Update [`docs/ENGINE.md`](./docs/ENGINE.md) and the roadmap status if behavior changed.

---

## 11. Known pitfalls

1. **Sample data is not production data.** `lib/data/sample-data.ts` and `lib/data/demo-resumes.ts` are fictional fixtures. New sample screenings must set `isSample: true`; keep the **Sample** label visible.
2. **The offline extractor is honest but limited.** It recognizes a fixed skill catalog and simple resume sections/date formats. Unrecognized skills stay absent; it never falls back to a default employer, degree, or requirement set.
3. **`matchSkills` uses substring matching in both directions.** "React" can match "React Native". Improve deliberately with tests if you need stricter semantics.
4. **Preferred-vs-required detection in job extraction is heuristic.** It is now line-scoped and case-insensitive, but it can still misread complex phrasing. "X or Y" treats the later skill as preferred; the engine has no OR-group type.
5. **Date-derived experience is evaluated at extraction time.** Explicit “N years” wins; otherwise closed ranges and `Present` roles are merged. Scoring itself never reads dates or the clock, but re-extracting later can change the input. Store the extraction history before claiming audit-grade reproducibility.
6. **The wizard screens uploads through `/api/ingest`; sample mode is the only path that uses `DEMO_RESUME_POOL`.** Do not reintroduce a hidden demo fallback.
7. **Scanned/image-only PDFs are not supported.** `unpdf` returns no text, and the route reports a per-file error. Do not score a blank document as a candidate.
8. **Ingestion limits are real.** 20 files, 10 MB per file, 50 MB per request, 200k characters per document. Oversized text is truncated and recorded in `processingNotes`.
9. **Provider extraction is server-only.** The wizard calls `/api/extract/job` and `/api/extract/candidate`; `AI_PROVIDER`, Ollama config, prompts, and provider modules must not enter a client bundle. `lib/screening/screen-candidate.ts` is for server/tests; use `lib/screening/score-candidate.ts` in the browser. Ollama falls back to the offline extractor and reports that through `provider.fallbackUsed` / `provider.warning`.
10. **Weight recompute re-scores from the stored validated profile, not by re-extraction.** `/api/screenings/[jobId]` PATCH creates a new `ScoringRun` and recomputes from `Candidate.profileJson`. It is deterministic and auditable, but it does not re-read the original resume or re-run the provider.
11. **No auth or tenant isolation.** The `Apex Engineering` workspace in the shell is cosmetic. Screenings are attached to the seeded demo organization when it exists. Do not expose real candidate data.
12. **Prisma is server-only.** Importing `prisma/generated/client`, `lib/db/prisma.ts`, or `lib/db/screenings.ts` into a client component will fail; use `/api/screenings/*` instead. The wizard and store talk to the API, never the database.
13. **`prisma generate` is required** after a clean clone before typecheck/seed because the generated client is git-ignored. Run `db:push` and `db:seed` before using the app; routes return 503 `database_not_initialized` otherwise.
14. **`npm audit` reports a dev-only `braces` advisory** through `eslint-config-next`. Do **not** run `npm audit fix --force`; it downgrades Next/ESLint. Re-check upstream.
15. **TypeScript 7 is intentionally not adopted yet.** Next 16 / Prisma 7 are validated against TS 5.9. Revisit after upstream support.
16. **Prisma 8 is a release candidate.** Stay on stable Prisma 7.10.x until 8 is GA.

---

## 12. Roadmap snapshot

Full detail, acceptance criteria, and sequencing: [`docs/ROADMAP.md`](./docs/ROADMAP.md).

| Phase | Theme | Highest-value outcome |
| --- | --- | --- |
| 0 ✅ | Platform upgrade + agent docs | Next 16 / React 19 / Tailwind 4 / Prisma 7 on stable, verified tooling |
| 1 🟡 | Correctness & consolidation | Candidate validation + honest heuristics + server-side provider extraction + persisted settings shipped; type unification remains |
| 2 🟡 | Persistence | Prisma-backed screenings, decisions, notes, weight recompute, and `ScoringRun` audit shipped; server actions, extraction history UI, and org scoping remain |
| 3 🟡 | Real ingestion | Parsing, upload screening, streamed batch progress and per-candidate persistence shipped; OCR, dedupe, durable workers and idempotent resume remain |
| 4 | Market intelligence | Ingested postings + evidence sources replace static market samples |
| 5 | Production readiness | Auth, organization scoping, RBAC, privacy, observability, e2e tests |

---

## 13. Definition of done

A change is complete only when:

- [ ] It respects the invariants in §2.
- [ ] `npm run verify` passes.
- [ ] `npm run build` passes.
- [ ] Affected routes were smoke-tested (`/`, dashboard, recruitment, candidate detail, career intelligence).
- [ ] New UI uses existing primitives and tokens; keyboard/focus behavior is intact.
- [ ] New data surfaces have loading/empty/error states and a sample-data label where applicable.
- [ ] Engine behavior changes include a test and a docs update.
- [ ] `AGENTS.md` status table or the relevant `docs/` file is updated if the change alters architecture, capability, or roadmap state.

---

## 14. Where to record knowledge

| If you changed… | Update… |
| --- | --- |
| Layer boundaries, runtime topology, provider model, ingestion flow | `docs/ARCHITECTURE.md` |
| Weights, thresholds, matching semantics, test anchors | `docs/ENGINE.md` |
| Types, Prisma models, persistence mapping | `docs/DATA-MODEL.md` |
| Priorities, scope, acceptance criteria | `docs/ROADMAP.md` |
| Capability status, commands, conventions, pitfalls | this file (`AGENTS.md`) |
| User-facing setup / feature overview | `README.md` |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
