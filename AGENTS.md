# AGENTS.md — Role Fit

> **Operating manual for AI agents and new engineers.**
> Read this file before changing code. Then read the focused docs in [`docs/`](./docs/).
>
> Last verified: **2026-10-25** · Next.js **16.4.2** · React **19.3.1** · TypeScript **5.9.3** · Tailwind CSS **4.3.3** · Prisma **7.10.1** · Node **22.x**

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
   Decisions and notes belong in the screening store (today `localStorage`, eventually the database).

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
| New screening workflow (4 steps) | ✅ UI complete; screens uploads or the labelled sample set | `components/recruitment/NewScreeningWorkflow.tsx` |
| Candidate table, detail, citations | ✅ Implemented | `components/recruitment/` |
| Deterministic scoring/matching/routing | ✅ Implemented + tested | `lib/scoring`, `lib/matching`, `lib/routing` |
| Skill normalization | ✅ Implemented (curated alias map) | `lib/normalization/skills.ts` |
| Offline mock extractor | ✅ Honest heuristics; no fabricated defaults | `lib/ai/mock-provider.ts`, `lib/ai/resume-heuristics.ts` |
| Candidate output validation | ✅ Repair/reject + warnings | `validateCandidateProfileOutput()` in `lib/ai/schemas.ts` |
| Ollama provider | ✅ Implemented; validates job + candidate output, falls back | `lib/ai/ollama-provider.ts` |
| Batch screening pipeline | ✅ Implemented, **not wired to UI** | `lib/batch/index.ts` |
| Per-candidate screening orchestration | ✅ Implemented | `lib/screening/screen-candidate.ts` |
| Document ingestion route | ✅ PDF/DOCX/TXT/MD, per-file failures, limits | `app/api/ingest/route.ts` |
| Retrieval / market grounding | ⚠️ Static sample repository, not real ingestion | `lib/retrieval/index.ts` |
| Tool registry | ⚠️ Implemented, not wired to UI or provider | `lib/tools/index.ts` |
| Persistence | ⚠️ Browser `localStorage` only | `lib/store/screening-store.ts` |
| Prisma schema + seed | ⚠️ Schema/seed work, **app does not read/write DB** | `prisma/` |
| Resume file upload/parsing | ✅ PDF/DOCX/TXT/MD server-side; **no OCR** | `app/api/ingest/route.ts` |
| Settings persistence | ❌ Provider/weights selections are not saved | `app/(dashboard)/settings/page.tsx` |
| API routes / server actions | ⚠️ Only `/api/ingest` | `app/api/ingest/route.ts` |
| Authentication / organizations / RBAC | ❌ None (shell displays a demo workspace) | — |
| Automated test runner | ⚠️ Custom assertion script (45 assertions), no Vitest/Playwright | `lib/tests/engine.test.ts` |
| CI | ✅ GitHub Actions verify workflow | `.github/workflows/ci.yml` |

### The most important known gaps

Real ingestion is wired, but the path is **not production-grade**:

- Candidate/provider extraction still runs in the browser. The wizard uses the mock provider today; Ollama would need a server route (and no server-only `AI_PROVIDER` value reaches the client).
- Uploaded files are parsed per run and not persisted. There is no OCR for scanned/image-only PDFs, no duplicate detection, and no multi-resume candidate merge.
- The wizard screens candidates directly through `lib/screening`. The `lib/batch` pipeline and Prisma `ScoringRun` / `CandidateProcessingJob` records are still not wired.
- New screenings and decisions live in `localStorage`, not the database.
- Job-requirement extraction is heuristic. It no longer invents fallback requirements, but recruiters must review the extracted list.
- There is no authentication, organization scoping, or RBAC.

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
│ AI extraction (provider)     │  lib/ai/*
│ unstructured → typed JSON    │  mock | ollama
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
   Human review in the UI  →  decision + notes persisted
```

The orchestrators are `lib/screening/screen-candidate.ts` (resume text → validate → match → score → route, used by the wizard), `lib/pipeline/index.ts` (extraction + grounding), and `lib/batch/index.ts` (batch extraction → match → score → route, not wired to the UI).

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
  (dashboard)/
    layout.tsx                  AppShell wrapper
    dashboard/                  Overview
    career-intelligence/        Role market views (+ [role] dynamic page)
    recruitment/                Workspace, /new wizard, [jobId], candidate detail
    candidates/                 Global candidate directory (?q= search)
    insights/                   Observed company requirements
    settings/                   Provider + default weights UI
components/
  layout/AppShell.tsx           Sidebar, header, global search, breadcrumbs
  ui/                           Button, Badge, Card, Input, Callout, StatCard, …
  recruitment/                  CandidateTable, CandidateDetailView, wizard
  career/                       RoleSelector, MarketRequirementsView
lib/
  ai/                           Provider interface, schemas, mock, ollama, prompts
  ai/resume-heuristics.ts       Honest offline resume extraction + evidence lines
  screening/screen-candidate.ts Resume text → validate → match → score → route
  matching/                     Requirement ↔ candidate evidence evaluation
  scoring/                      Deterministic weighted scoring
  routing/                      Queue classification
  normalization/                Canonical skill taxonomy + alias matching
  retrieval/                    Market evidence retrieval (currently static)
  batch/                        Batch screening pipeline
  pipeline/                     Extraction + grounding coordinator
  tools/                        Deterministic tool registry (future function calling)
  data/sample-data.ts           All demo roles, screenings, candidates, companies
  data/demo-resumes.ts          Fictional sample resumes + sample job description
  store/screening-store.ts      Shared localStorage-backed client store
  tests/engine.test.ts          Assertion-based engine test suite
  utils.ts                      cn(), formatters
types/index.ts                  Presentation/domain types used by the UI
prisma/
  schema.prisma                 Relational target model
  seed.ts                       Organization + demo user
  generated/                    Generated Prisma client (git-ignored)
prisma.config.ts                Prisma 7 CLI/seed/data-source config
docs/                           Architecture, engine, data model, roadmap
```

### Two type systems — read this before importing types

| Layer | File | Use it for |
| --- | --- | --- |
| **Pipeline / AI contracts** | `lib/ai/schemas.ts` (`StructuredJobRequirements`, `CandidateProfile`, `ExtractedRequirement`) | Extraction, matching, scoring inputs, batch pipeline |
| **Presentation / domain** | `types/index.ts` (`JobRequirements`, `CandidateExtraction`, `CandidateScoreResult`, `JobScreening`, market types) | UI props, store, sample data, legacy scoring API |

These overlap and are **not yet unified**. Current flow: AI contracts are converted into the presentation shapes in `lib/screening/screen-candidate.ts` (`structuredJobToRequirements`, `candidateProfileToExtraction`), `lib/batch/index.ts`, and `NewScreeningWorkflow.tsx`. When unifying them, do it deliberately and update both the engine tests and the UI — do not add a third shape.

---

## 6. Commands

```bash
# Setup
npm install
cp .env.example .env
npm run db:generate       # prisma generate (required before typecheck/seed)
npm run db:push           # push schema to SQLite
npm run db:seed           # seed organization + demo user

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
- Deterministic test anchor: the fixture in `lib/tests/engine.test.ts` must continue to score **76 / "Review"**. The suite currently has **45 assertions** and also covers candidate validation, resume heuristics, and an end-to-end sample run.

---

## 8. Conventions

### Next.js / React

- App Router only. Pages under `app/(dashboard)/` are wrapped by `AppShell`.
- **Next 16 dynamic route params are Promises.** Server components `await params`; client components use `React.use(params)`.
- Prefer server components by default. Add `"use client"` only for interactivity, browser APIs, or the localStorage store.
- Use `next/link` for navigation. Use `ButtonLink` rather than nesting a `<button>` inside a `<Link>`.
- The only API route today is `app/api/ingest/route.ts` for document text extraction. New routes belong under `app/api/**/route.ts`; keep provider calls and Node-only parsers server-side.
- Candidate extraction currently runs in the browser through `screenCandidateText()` because the wizard is a client component. Running Ollama calls from the browser requires CORS (`OLLAMA_ORIGINS`) and leaks implementation detail; move extraction behind a server route before offering Ollama in the wizard.
- The ingest route is deliberately stateless. Do not write uploads to disk or add persistence there without a storage/privacy design.

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
- localStorage key: `rolefit_screenings_state_v1` (legacy `nirman_screenings_state_v1` is read as a fallback).
- Settings (`AI_PROVIDER`, weights) are currently UI-only. Persist them through the database or a settings store before claiming configuration is durable.

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
9. **Candidate extraction still runs in the browser.** `screenCandidateText()` calls `getAIProvider()` client-side; `AI_PROVIDER` is server-only, so the wizard currently uses the mock provider. Ollama needs a server route (and CORS if kept client-side).
10. **`recomputeScoresWithWeights` reconstructs a pseudo-profile from stored matches.** It is a UI recomputation, not a re-extraction. Do not treat it as an audit-grade rescore.
11. **No auth or tenant isolation.** The `Apex Engineering` workspace in the shell is cosmetic. Do not expose real candidate data.
12. **Prisma is not wired into the app.** Importing `prisma/generated/client` into a client component will fail; use it only in server code.
13. **`prisma generate` is required** after a clean clone before typecheck/seed because the generated client is git-ignored.
14. **`npm audit` reports a dev-only `braces` advisory** through `eslint-config-next`. Do **not** run `npm audit fix --force`; it downgrades Next/ESLint. Re-check upstream.
15. **TypeScript 7 is intentionally not adopted yet.** Next 16 / Prisma 7 are validated against TS 5.9. Revisit after upstream support.
16. **Prisma 8 is a release candidate.** Stay on stable Prisma 7.10.x until 8 is GA.

---

## 12. Roadmap snapshot

Full detail, acceptance criteria, and sequencing: [`docs/ROADMAP.md`](./docs/ROADMAP.md).

| Phase | Theme | Highest-value outcome |
| --- | --- | --- |
| 0 ✅ | Platform upgrade + agent docs | Next 16 / React 19 / Tailwind 4 / Prisma 7 on stable, verified tooling |
| 1 🟡 | Correctness & consolidation | Candidate validation + honest heuristics shipped; type unification, server-side provider extraction, and settings persistence remain |
| 2 | Persistence | Prisma repositories + server actions; screenings/decisions/audit survive reloads |
| 3 🟡 | Real ingestion | PDF/DOCX/TXT/MD extraction and upload screening shipped; persistence, OCR, dedupe, and the batch pipeline remain |
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
