# Role Fit

> **AI understands. Role Fit measures. Humans decide.**

Role Fit is an evidence-based career and recruitment intelligence platform. It connects **what employers require** with **what candidates can actually demonstrate** — using local/open-weight AI to extract structured facts, deterministic code to measure fit, and a human to make every hiring decision.

- **Career Intelligence** — see the real requirements, experience expectations, and skill gaps for a target role.
- **Recruitment Intelligence** — screen candidates against a job description with cited evidence and explainable scores.

Role Fit is intentionally **not** a chatbot, **not** a resume builder, and **not** a black-box hiring oracle.

---

## Why it exists

Candidates often prepare against generic advice instead of the requirements employers actually repeat. Recruiters spend hours re-reading resumes and struggle to explain why one candidate ranks above another.

Role Fit turns that unstructured information into a shared, inspectable model:

```text
Job description / PDF · DOCX · TXT · MD
        │
        ▼
Server text extraction                 /api/ingest · unpdf · mammoth
        │  per-file failures and limits
        ▼
AI extraction (mock | ollama)          unstructured → typed JSON
        │  validated at the boundary (lib/ai/schemas.ts)
        ▼
Skill normalization                    aliases → canonical skills
        │
        ├──────────────► Market / evidence grounding (sample data today)
        ▼
Deterministic matching                 requirement → cited evidence
        │
        ▼
Deterministic scoring                  50 / 25 / 15 / 10 weights
        │
        ▼
Deterministic routing                  Strong Match · Review · Needs Verification
        │
        ▼
Human review                          decision + notes persisted
```

Every matched requirement carries evidence. No candidate is ever automatically rejected.

---

## Status: working demo, not a production pipeline

The product thesis is fully implemented end to end, but the screening path still uses demo data. Be precise about what works today:

| Area | State |
| --- | --- |
| Landing page, dashboard shell, UI system | ✅ Implemented |
| Career Intelligence, Company Intelligence | ✅ Implemented with **sample market data** |
| 4-step new-screening wizard | ✅ UI complete; screens uploaded documents or the labelled sample set |
| Candidate table, detail, evidence citations | ✅ Implemented |
| Deterministic matching, scoring, routing | ✅ Implemented and tested |
| Mock + Ollama providers | ✅ Implemented; both candidate and job output are validated |
| Batch pipeline | ✅ Implemented; **not wired to the wizard** |
| Persistence | ⚠️ Browser `localStorage` only |
| Prisma schema + seed | ⚠️ Work in progress; the app does **not** read/write the DB yet |
| Resume upload/parsing | ✅ PDF/DOCX/TXT/MD parsed server-side; no OCR for scanned PDFs |
| Authentication, organizations, RBAC | ❌ None yet |

Concretely: uploaded files go to `/api/ingest`, where PDF/DOCX/TXT/MD text is extracted and invalid files are reported individually. The wizard then screens each candidate through the validated offline extractor and the deterministic engine. Sample mode skips the upload and uses fictional fixtures, and the resulting screening is labelled **Sample**. Files are parsed per run and not stored. Candidate/provider extraction still runs in the browser, so the implemented Ollama provider is not yet wired through a server route. Screenings and decisions live in `localStorage`. Market data comes from `lib/data/sample-data.ts` and is always labelled **Sample**.

Closing these gaps is the job of [`docs/ROADMAP.md`](./docs/ROADMAP.md).

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js **16.4** (App Router, Turbopack) |
| UI | React **19.3**, Tailwind CSS **4.3** (CSS-first `@theme`) |
| Language | TypeScript **5.9** (strict) |
| Database | Prisma **7.10** + SQLite (`better-sqlite3` adapter) |
| AI | Local/open-weight only — `mock` or `ollama` |
| Tests | Deterministic assertion suite (`tsx`) |
| Node | **22.x** (see `.nvmrc`) |

No proprietary cloud LLM is used or supported. Providers extract facts; they never return a score.

---

## Quick start

```bash
# 1. Install dependencies (Node 22)
nvm use
npm install

# 2. Configure environment
cp .env.example .env

# 3. Generate the Prisma client and prepare the local database
npm run db:generate
npm run db:push
npm run db:seed          # optional: seeds an organization + demo user

# 4. Run the app
npm run dev              # http://localhost:3000
```

The app runs without a database today — Prisma is not yet on the request path — but `db:generate` is required before typechecking or seeding because `prisma/generated/` is git-ignored.

### Environment

```dotenv
DATABASE_URL="file:./prisma/dev.db"   # resolved from the project root
AI_PROVIDER="mock"                    # "mock" | "ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
NEXT_PUBLIC_APP_NAME="Role Fit"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

To use a local model, start Ollama and set `AI_PROVIDER="ollama"`. Extraction currently runs in the client; real deployments should move it behind a server route (see roadmap Phase 1.4) so Ollama does not need CORS.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Deterministic engine assertions |
| `npm run verify` | typecheck + lint + test — run before claiming work is done |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:push` | Push the schema to SQLite |
| `npm run db:seed` | Seed organization + demo user |
| `npm run db:studio` | Open Prisma Studio |

CI (`.github/workflows/ci.yml`) runs `npm ci`, `db:generate`, `verify`, and `build` on every push and pull request to `main`.

---

## Routes

| Route | Description |
| --- | --- |
| `/` | Marketing landing page |
| `/dashboard` | Overview of screenings, queues, and activity |
| `/career-intelligence` | Role market explorer (sample data) |
| `/career-intelligence/[role]` | Requirements, experience brackets, gap analysis |
| `/recruitment` | Screening list |
| `/recruitment/new` | 4-step screening wizard |
| `/recruitment/[jobId]` | Candidate shortlist for a screening |
| `/recruitment/[jobId]/candidate/[candidateId]` | Evidence, score breakdown, decision + notes |
| `/candidates` | Global candidate directory with search |
| `/insights` | Observed company requirements (sample data) |
| `/settings` | Provider + default weights UI (not yet persisted) |

---

## How scoring works

Required skills **50** · Experience **25** · Preferred skills **15** · Evidence quality **10** = **100**.

```text
required   = round(50 × matchedRequired / totalRequired)
experience = min(25, round(25 × min(candidateYears / requiredYears, 1.25)))
preferred  = round(15 × matchedPreferred / totalPreferred)
evidence   = min(10, 4·hasExperience + 3·hasProjects + 2·hasEducation + 1·hasCertifications)
total      = min(100, required + experience + preferred + evidence)
```

Routing:

```text
Strong Match        : total >= 85 AND missingRequired == 0 AND candidateYears >= requiredYears
Review              : total >= 60 OR missingRequired <= 2
Needs Verification  : otherwise
```

The engine is deterministic: same candidate, requirements, and weights → same score. The golden test anchor is **76 / Review** and must not drift without a documented product decision.

Full specification: [`docs/ENGINE.md`](./docs/ENGINE.md).

---

## Project structure

```text
app/                    App Router pages (marketing + dashboard shell)
components/             UI primitives, layout shell, recruitment/career views
lib/
  ai/                   Provider interface, schemas, mock + Ollama providers, prompts
  matching/             Requirement ↔ candidate evidence evaluation
  scoring/              Deterministic weighted scoring
  routing/              Queue classification (no auto-reject)
  normalization/        Skill taxonomy + alias matching
  retrieval/            Market grounding (static today)
  batch/                Per-candidate extraction → match → score → route
  pipeline/             Extraction + grounding coordinator
  store/                Shared localStorage-backed client store
  tests/                Deterministic engine assertions
  data/                 Sample market/screening fixtures
types/                  Presentation/domain types used by the UI
prisma/                 Schema, seed, generated client (git-ignored)
docs/                   Architecture, engine, data model, roadmap
```

There are currently two type systems — AI contracts in `lib/ai/schemas.ts` and presentation types in `types/index.ts`. Unifying them is Phase 1 of the roadmap; do not add a third shape in the meantime.

---

## Documentation

| Document | Read it for |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | Operating manual: invariants, status, conventions, pitfalls |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Layer boundaries, current vs. target topology, decisions |
| [`docs/ENGINE.md`](./docs/ENGINE.md) | Formulas, thresholds, matching semantics, test matrix |
| [`docs/DATA-MODEL.md`](./docs/DATA-MODEL.md) | Types, Prisma schema, persistence plan |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Prioritized backlog with acceptance criteria |

Contributors and AI agents should read `AGENTS.md` before changing code.

---

## Principles

1. **AI never computes a score or makes a hiring decision.** It only extracts typed facts.
2. **Every match cites evidence.** No invented citations.
3. **No automatic rejection.** Routing informs; a human decides.
4. **Deterministic in, deterministic out.** No randomness, clock dependence, or model calls in scoring.
5. **Validate at every boundary.** Untrusted provider output is checked before it enters the engine.
6. **Local/open-weight AI only.** No proprietary cloud LLM dependency.
7. **Never present sample data as live market data.** Sample labels stay visible.
8. **Human decisions are persisted state**, not UI decoration.
