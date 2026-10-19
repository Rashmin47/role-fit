# AGENTS.md — Role Fit

> **Operating manual for AI agents and new engineers.**
> Read this file before changing code. Then read the focused docs in [`docs/`](./docs/).
>
> Last verified: **2026-10-19** · Next.js **16.4.2** · React **19.3.1** · TypeScript **5.9.3** · Tailwind CSS **4.3.3** · Prisma **7.10.1** · Node **22.x**

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
| New screening workflow (4 steps) | ✅ UI complete, demo pipeline only | `components/recruitment/NewScreeningWorkflow.tsx` |
| Candidate table, detail, citations | ✅ Implemented | `components/recruitment/` |
| Deterministic scoring/matching/routing | ✅ Implemented + tested | `lib/scoring`, `lib/matching`, `lib/routing` |
| Skill normalization | ✅ Implemented (curated alias map) | `lib/normalization/skills.ts` |
| Offline mock extractor | ✅ Implemented, **demo-quality** | `lib/ai/mock-provider.ts` |
| Ollama provider | ✅ Implemented, not production-hardened | `lib/ai/ollama-provider.ts` |
| Batch screening pipeline | ✅ Implemented, **not wired to UI** | `lib/batch/index.ts` |
| Retrieval / market grounding | ⚠️ Static sample repository, not real ingestion | `lib/retrieval/index.ts` |
| Tool registry | ⚠️ Implemented, not wired to UI or provider | `lib/tools/index.ts` |
| Persistence | ⚠️ Browser `localStorage` only | `lib/store/screening-store.ts` |
| Prisma schema + seed | ⚠️ Schema/seed work, **app does not read/write DB** | `prisma/` |
| Resume file upload/parsing | ❌ File names only; no PDF/DOCX text extraction | `NewScreeningWorkflow.tsx` |
| Settings persistence | ❌ Provider/weights selections are not saved | `app/(dashboard)/settings/page.tsx` |
| API routes / server actions | ❌ None | — |
| Authentication / organizations / RBAC | ❌ None (shell displays a demo workspace) | — |
| Automated test runner | ⚠️ Custom assertion script, no Vitest/Playwright | `lib/tests/engine.test.ts` |
| CI | ✅ GitHub Actions verify workflow | `.github/workflows/ci.yml` |

### The most important known gap

The current screening flow is a **high-fidelity demonstration**, not a production pipeline:

- Uploading resumes records only `name` and `size`; file contents are never read.
- "Run Screening Pipeline" always scores the bundled `DEMO_RESUME_POOL`, regardless of which files were staged.
- The mock provider fabricates default experience/education records when parsing a resume.
- New screenings and decisions live in `localStorage`, not the database.

Do not claim these are complete. The roadmap exists to close them.

---

## 4. Architecture at a glance

```text
Job description / resume text
        │
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

The orchestrators are `lib/pipeline/index.ts` (extraction + grounding) and `lib/batch/index.ts` (per-candidate extraction → match → score → route).

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
  matching/                     Requirement ↔ candidate evidence evaluation
  scoring/                      Deterministic weighted scoring
  routing/                      Queue classification
  normalization/                Canonical skill taxonomy + alias matching
  retrieval/                    Market evidence retrieval (currently static)
  batch/                        Batch screening pipeline
  pipeline/                     Extraction + grounding coordinator
  tools/                        Deterministic tool registry (future function calling)
  data/sample-data.ts           All demo roles, screenings, candidates, companies
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

These overlap and are **not yet unified**. Current flow: AI contracts are converted into the presentation shapes in `lib/batch/index.ts` and `NewScreeningWorkflow.tsx`. When unifying them, do it deliberately and update both the engine tests and the UI — do not add a third shape.

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
- Experience uses `totalExperienceYears` directly; it does **not** recalculate from employment dates.
- Deterministic test anchor: the fixture in `lib/tests/engine.test.ts` must continue to score **76 / "Review"**.

---

## 8. Conventions

### Next.js / React

- App Router only. Pages under `app/(dashboard)/` are wrapped by `AppShell`.
- **Next 16 dynamic route params are Promises.** Server components `await params`; client components use `React.use(params)`.
- Prefer server components by default. Add `"use client"` only for interactivity, browser APIs, or the localStorage store.
- Use `next/link` for navigation. Use `ButtonLink` rather than nesting a `<button>` inside a `<Link>`.
- No API routes exist yet. If you add one, put it under `app/api/**/route.ts` and keep provider calls server-side.
- Keep providers server-side when you wire real extraction. Running Ollama calls from the browser requires CORS (`OLLAMA_ORIGINS`) and leaks implementation detail.

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

1. **Sample data is not production data.** `lib/data/sample-data.ts` is the single demo fixture. Do not add "live" claims around it.
2. **Mock provider fabricates defaults.** It always returns a "Tech Systems" backend role and a "Tribhuvan University" degree when parsing resumes. Never present mock output as verified candidate history.
3. **Mock extraction is catalog-limited.** It recognizes a fixed list of technologies; unknown skills are ignored or fall back to Python/FastAPI/PostgreSQL/Docker for job descriptions.
4. **`matchSkills` uses substring matching in both directions.** "React" can match "React Native". Improve deliberately with tests if you need stricter semantics.
5. **Preferred-vs-required detection in the mock is heuristic and case-sensitive** (`text.indexOf(item.name)`); it can miss lowercase mentions.
6. **The wizard ignores uploaded file contents.** It scores `DEMO_RESUME_POOL`. Real ingestion is Phase 3.
7. **`recomputeScoresWithWeights` reconstructs a pseudo-profile from stored matches.** It is a UI recomputation, not a re-extraction. Do not treat it as an audit-grade rescore.
8. **No auth or tenant isolation.** The `Apex Engineering` workspace in the shell is cosmetic. Do not expose real candidate data.
9. **Prisma is not wired into the app.** Importing `prisma/generated/client` into a client component will fail; use it only in server code.
10. **`prisma generate` is required** after a clean clone before typecheck/seed because the generated client is git-ignored.
11. **`npm audit` reports a dev-only `braces` advisory** through `eslint-config-next`. Do **not** run `npm audit fix --force`; it downgrades Next/ESLint. Re-check upstream.
12. **TypeScript 7 is intentionally not adopted yet.** Next 16 / Prisma 7 are validated against TS 5.9. Revisit after upstream support.
13. **Prisma 8 is a release candidate.** Stay on stable Prisma 7.10.x until 8 is GA.

---

## 12. Roadmap snapshot

Full detail, acceptance criteria, and sequencing: [`docs/ROADMAP.md`](./docs/ROADMAP.md).

| Phase | Theme | Highest-value outcome |
| --- | --- | --- |
| 0 ✅ | Platform upgrade + agent docs | Next 16 / React 19 / Tailwind 4 / Prisma 7 on stable, verified tooling |
| 1 | Correctness & consolidation | One type system, server-side extraction, settings persistence, solid tests |
| 2 | Persistence | Prisma repositories + server actions; screenings/decisions/audit survive reloads |
| 3 | Real ingestion | PDF/DOCX text extraction, real uploads, batch pipeline wired end to end |
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
| Layer boundaries, runtime topology, provider model | `docs/ARCHITECTURE.md` |
| Weights, thresholds, matching semantics, test anchors | `docs/ENGINE.md` |
| Types, Prisma models, persistence mapping | `docs/DATA-MODEL.md` |
| Priorities, scope, acceptance criteria | `docs/ROADMAP.md` |
| Capability status, commands, conventions, pitfalls | this file (`AGENTS.md`) |
| User-facing setup / feature overview | `README.md` |
