# Data Model

> Three representations of the same domain coexist today: **AI extraction contracts**, **presentation types**, and the **Prisma persistence schema**. This document explains each, how they map, and how to migrate safely.

Last verified: 2026-11-05.

---

## 1. The three representations

| Representation | Location | Purpose | Validated? | Persisted? |
| --- | --- | --- | --- | --- |
| **AI contracts** | `lib/ai/schemas.ts` | Boundary between unstructured text and typed facts | Job output: yes. Candidate output: yes, with repair/reject + warnings | Not directly; validated profiles are embedded in `Candidate.profileJson` |
| **Presentation/domain types** | `types/index.ts` | UI props, sample data, store, engine API | TypeScript only | Projection of Prisma rows |
| **Relational schema** | `prisma/schema.prisma` | Database model | Prisma types after generation | SQLite locally; source of truth for screenings and settings |

### Why this still exists

The UI and deterministic engine were built first to validate the product thesis. Persistence now exists, but the two type systems have not been unified: the repository maps validated AI contracts into `Job`/`Requirement`/`CandidateMatch` rows and back into presentation shapes. A big-bang unification would mix a risky UI rewrite with a data migration.

### Why it must still be fixed

- Two shapes drift (e.g. `JobRequirement` vs `ExtractedRequirement`).
- Conversion code lives in the API/repository and batch layers.
- Candidate facts are stored twice: normalized rows (`CandidateSkill`, `CandidateExperience`) and JSON snapshots (`extracted*Json`, `profileJson`).
- There is no server action layer or organization scoping yet.

Phase 1/2 of the roadmap consolidates this. Do not add a fourth shape in the meantime.

---

## 2. AI contracts (`lib/ai/schemas.ts`)

### `StructuredJobRequirements`

```ts
{
  title, summary?, department?, location?,
  minimumExperienceYears: number,
  requiredSkills: ExtractedRequirement[],
  preferredSkills: ExtractedRequirement[],
  educationRequirements: ExtractedRequirement[],
  responsibilities: string[],
  certifications: ExtractedRequirement[],
  domainKnowledge: string[],
  rawTextExcerpt?, confidence, extractedAt
}
```

### `ExtractedRequirement`

```ts
{
  id: string;
  name: string;
  type: "skill" | "experience" | "education" | "domain" | "certification";
  importance: "required" | "preferred" | "bonus";
  minimumYears?: number;
  description?: string;
  extractedEvidence?: string;
  confidence: number; // 0..1
}
```

### `CandidateProfile`

```ts
{
  name, email?, phone?, location?, summary?,
  totalExperienceYears: number,
  skills: ExtractedSkill[],          // name, canonicalName?, category?, level?, yearsOfExperience?, evidenceSnippet?
  experience: ExtractedExperience[], // company, title, dates, years, description, technologies[], evidence
  education: ExtractedEducation[],
  projects?: { name, description, technologies[] }[],
  certifications?: { name, issuer, year? }[],
  rawTextExcerpt?, confidence, extractedAt
}
```

### Validation

`validateJobRequirementsOutput(raw)`:

- rejects non-objects,
- defaults title to `"Untitled Role"`,
- accepts `minimumExperienceYears` or `minimumExperience`, defaults to `2.0`,
- accepts requirements as strings or objects,
- clamps confidence to `[0, 1]`,
- generates IDs from names when missing,
- reports `"No technical requirements extracted from text"` when both required and preferred are empty.

`validateCandidateProfileOutput(raw, nameHint)`:

- rejects non-objects and missing/blank names,
- coerces arrays and drops malformed entries,
- clamps confidence and refuses negative years,
- repairs common shape drift instead of trusting the provider,
- returns structured warnings for every repair/rejection.

Both AI outputs are validated in `lib/ai/server-extraction.ts` before they can reach the engine. The screening route re-validates candidate profiles again through `validateCreateScreeningInput()` so a direct API caller cannot bypass the boundary.

---

## 3. Presentation types (`types/index.ts`)

Used by the UI, sample data, and the legacy scoring API.

| Type | Purpose | Production replacement |
| --- | --- | --- |
| `Skill`, `Experience`, `Education`, `Project`, `Certification` | Candidate detail blocks | `CandidateSkill`, `CandidateExperience`, JSON columns |
| `CandidateExtraction` | Legacy scoring input (candidate) | `CandidateProfile` + DB candidate |
| `JobRequirement`, `JobRequirements` | Legacy scoring input (job) | `StructuredJobRequirements` + `Job`/`Requirement` |
| `MatchEvidence` | Per-requirement citation row | `CandidateMatch.matchesJson` |
| `SkillGap` | Gap + rationale + learning direction | `CandidateMatch.gapsJson` |
| `ScoringWeights` | 50/25/15/10 configuration | `ScoringRun.weightsJson`, settings |
| `CandidateScoreResult` | Complete evaluation for one candidate | `CandidateMatch` (+ JSON evidence) |
| `JobScreening` | Screening workspace aggregate | `Job` + `ScoringRun` + `CandidateMatch[]` |
| `CareerRoleIntelligence`, `MarketRequirementStat`, `ExperienceDistribution` | Career views | `MarketRoleData` (JSON for now) |
| `ObservedCompanyRequirement` | Company intelligence | `Company.observedDataJson` |

### `CandidateScoreResult` fields

```ts
{
  candidateId, candidateName,
  totalScore, skillScore, maxSkillScore,
  experienceScore, maxExperienceScore,
  preferredScore, maxPreferredScore,
  evidenceScore, maxEvidenceScore,
  calculatedExperienceYears, requiredExperienceYears,
  status: "Strong Match" | "Review" | "Needs Verification",
  decision: "pending" | "shortlisted" | "held" | "not_recommended",
  reviewNotes?, reviewedAt?,       // added during the v0.2 upgrade
  extractionConfidence?,           // 0–1, from the validated profile
  extractionWarnings?,             // non-fatal extraction issues
  matches: MatchEvidence[],
  gaps: SkillGap[],
  scoringWeights, calculatedAt
}
```

`reviewNotes` and `reviewedAt` map to `CandidateMatch.reviewNotes` / `reviewedAt`. `extractionConfidence` and `extractionWarnings` are stored on `CandidateMatch` as dedicated columns/JSON. `matches`, `gaps`, and `scoringWeights` are stored as JSON so every score remains explainable.

---

## 4. Persisted screenings

The source of truth is Prisma. The browser store is a cache, not a persistence layer.

### Write path

`POST /api/screenings` (see `app/api/screenings/route.ts`):

1. `validateCreateScreeningInput()` re-validates the job requirements and every candidate profile.
2. `lib/db/screenings.ts` prefixes requirement IDs with the screening ID, runs `scoreCandidateProfile()` deterministically, and rejects the request if no candidate can be scored.
3. One transaction writes `Job`, `Requirement[]`, `Candidate[]`, `CandidateSkill[]`, `CandidateExperience[]`, `CandidateMatch[]`, and one `ScoringRun`.
4. `Candidate.profileJson` stores the validated `CandidateProfile` used for future weight recomputation.
5. `failed[]` entries (candidate-level scoring failures) are returned to the UI and also persisted in `Job.processingNotesJson`.

### Read path

`GET /api/screenings` and `GET /api/screenings/[jobId]` map rows back to the presentation `JobScreening` shape:

```text
Job
  + Requirements ordered by orderIndex
  + CandidateMatch[] joined to Candidate, ordered by totalScore
  + latest ScoringRun
  + counts derived from decisions
```

### Updates

- `PATCH /api/screenings/[jobId]/candidates/[candidateId]` updates the decision, notes, and `reviewedAt`.
- `PATCH /api/screenings/[jobId]` re-scores from stored `profileJson` with new weights, writes a new `ScoringRun`, and preserves decisions/notes.
- The client store applies optimistic decisions and rolls back if the server rejects the write.

### Shape

```ts
JobScreening {
  id, title, department, location, createdAt,
  status: "draft" | "extracting" | "ready" | "completed",
  candidateCount, reviewedCount, shortlistedCount,
  requirements: JobRequirements,
  candidates: CandidateScoreResult[],
  isSample?: boolean,           // fictional demo set
  processingNotes?: string[]    // unreadable/truncated files, failed candidates
}
```

### Ingestion boundary

Uploaded PDF/DOCX/TXT/MD files are parsed by `app/api/ingest/route.ts` and are **not** written to disk or the database. The request holds file bytes in memory and returns extracted text. The wizard sends that text to `app/api/extract/candidate/route.ts`; the server calls the configured provider, validates the result, and returns structured data plus warnings. Extracted profiles and short evidence snippets are persisted through `/api/screenings`. Raw documents are not.

### Constraints

- No authentication or organization scoping; all screenings attach to the seeded demo organization when present.
- No duplicate detection or multi-resume merge.
- Data is unencrypted SQLite locally. Do not store real candidate data without a privacy review.
- `candidateCount` is derived from `CandidateMatch` rows.
- Sample screenings must keep `isSample: true` so the UI can label them.
- If the database is not initialized, routes return `503 database_not_initialized` with setup instructions.

---

## 5. Prisma schema (`prisma/schema.prisma`)

### 5.1 Configuration

Prisma ORM **7.10.1**, Rust-free client.

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "sqlite"
}
```

- The database URL lives in `prisma.config.ts` via `env("DATABASE_URL")`.
- The generated client is **git-ignored** (`prisma/generated/`).
- SQLite for local dev; switch the provider and adapter for PostgreSQL in production.
- `prisma generate` must run after install/clone.
- Prisma 7 no longer auto-seeds on `migrate`/`db push`; use `npm run db:seed`.

### 5.2 Entity map

```text
Organization 1 ── * User
Organization 1 ── * Job

Job 1 ── * Requirement
Job 1 ── * CandidateMatch
Job 1 ── * ScoringRun

Candidate 1 ── * Resume
Candidate 1 ── * CandidateSkill
Candidate 1 ── * CandidateExperience
Candidate 1 ── * CandidateMatch

ScoringRun 1 ── * CandidateMatch
ScoringRun 1 ── * CandidateProcessingJob

JobPosting 1 ── * EvidenceSource

Skill 1 ── * SkillAlias
WorkspaceSettings (single row, id = "default")
Company (standalone aggregate)
MarketRoleData (standalone aggregate)
```

### 5.3 Models

| Model | Key fields | Notes |
| --- | --- | --- |
| `Organization` | `id`, `name`, `slug @unique` | Tenant boundary (not enforced yet) |
| `User` | `id`, `email @unique`, `role`, `organizationId?` | `role` is a string, not an enum |
| `Job` | `title`, `department`, `location`, `status`, `rawDescription`, `minimumExperienceYears`, `summary?`, `responsibilitiesJson`, `domainKnowledgeJson`, `certificationsJson`, `processingNotesJson`, `isSample`, `extractionConfidence?`, `extractedAt?`, `organizationId?` | One screening workspace |
| `Requirement` | `jobId`, `name`, `type`, `importance`, `weight`, `minimumYears?`, `confidence`, `extractedEvidence?`, `orderIndex` | Structured requirements; `orderIndex` preserves source order |
| `Candidate` | `name`, `email?`, `phone?`, `location?`, `headline?`, `summary?`, `totalExperienceYears`, `rawResumeText?`, `extracted*Json`, `profileJson?` | JSON columns hold extraction snapshots; `profileJson` powers deterministic recompute |
| `Resume` | `candidateId`, `filename`, `fileSize`, `mimeType`, `rawText`, `parsedAt` | Reserved; uploads are not persisted yet |
| `CandidateSkill` | `candidateId`, `skillName`, `level?`, `years?`, `evidence?` | Normalized skill rows |
| `CandidateExperience` | `candidateId`, `company`, `title`, dates, `years`, `description?` | No technologies column yet; stored in JSON |
| `CandidateMatch` | `jobId`, `candidateId`, component scores, `max*Score`, experience years, `status`, `decision`, `matchesJson`, `gapsJson`, `weightsJson`, `extractionConfidence?`, `extractionWarningsJson?`, `reviewNotes?`, `reviewedAt?` | `@@unique([jobId, candidateId])` |
| `ScoringRun` | `jobId`, `executedAt`, `candidatesCount`, `status`, `weightsJson` | One row per create or weight recompute |
| `CandidateProcessingJob` | `scoringRunId`, `candidateIndex`, `candidateName`, `sourceName`, `candidateId?`, `status`, `score?`, `routingState?`, `providerName?`, `fallbackUsed`, `warningsJson?`, `attempts`, `errorMessage?`, timestamps | Durable per-candidate batch progress and outcomes; raw source text is not stored here |
| `WorkspaceSettings` | `id = "default"`, `provider`, `ollamaBaseUrl`, `ollamaModel`, four weight ints | Single-row runtime configuration; env is fallback |
| `Skill` | `name @unique`, `category` | Canonical taxonomy |
| `SkillAlias` | `skillId`, `alias @unique` | Lookup table for normalization |
| `JobPosting` | `companyName`, `roleTitle`, `sourceName`, `observedDate`, `extractedSkillsJson`, `minimumExperienceYears`, `descriptionExcerpt` | Market evidence source |
| `EvidenceSource` | `jobPostingId`, `url?`, `title`, `collectedAt` | Provenance/citation |
| `MarketRoleData` | `roleKey @unique`, `title`, counts, JSON aggregates, `lastUpdated` | Career Intelligence aggregates |
| `Company` | `name @unique`, `industry`, `observedDataJson` | Company Intelligence aggregate |

### 5.4 Design notes

- **JSON columns** (`*Json`) are deliberate for evolving extraction payloads. Normalize them into tables only when querying/reporting requires it.
- **`CandidateMatch`** is the durable unit of a screening result. It has the unique `(jobId, candidateId)` constraint needed for idempotent re-runs.
- **`ScoringRun` + `CandidateProcessingJob`** now drive wizard batch processing. Runs include provider/model, weights, completion time and success/failure counts; per-candidate rows store progress, attempts and extraction fallback metadata. Candidate facts, matches and successful job status commit together. Weight recomputes still create a separate run. No durable worker/resume or cross-request deduplication is implemented.
- **`Requirement.type`/`importance`** are strings, not enums. This keeps migrations cheap but weakens integrity. Converting to Prisma enums is a future decision.
- **`WorkspaceSettings`** is global, not per-user or per-organization. Add a scope key before real multi-tenant use.
- **No `AuditLog` model yet.** `ScoringRun` preserves weight history, but decision changes are not individually audited. Add an audit log before production (who changed a decision, when, why).
- **`User.role`** is a free string; RBAC is not implemented.

### 5.5 Seed

`prisma/seed.ts` (run by `prisma db seed` via `prisma.config.ts`):

- upserts organization `Apex Engineering` (`slug: "apex-engineering"`),
- upserts demo user `rashmin@rolefit.app` with role `lead_recruiter`,
- upserts the default `WorkspaceSettings` row from `AI_PROVIDER` / `OLLAMA_*` with 50/25/15/10 weights.

It does **not** seed jobs/candidates/market data. The UI uses `lib/data/sample-data.ts` for market data and the wizard’s bundled fictional resumes for sample screenings. Seeding those fixtures into Prisma remains a future step.

---

## 6. Mapping: presentation ↔ relational

These are the mappings implemented by `lib/db/screenings.ts`.

### `JobRequirements` → `Job` + `Requirement[]`

| Presentation | Relational |
| --- | --- |
| `JobRequirements.id` | `Job.id` (or generate) |
| `title`, `department`, `location`, `rawDescription` | `Job.*` |
| `minimumExperienceYears` | `Job.minimumExperienceYears` |
| `requiredSkills[]` | `Requirement { importance: "required", type: "skill" }` |
| `preferredSkills[]` | `Requirement { importance: "preferred", type: "skill" }` |
| `responsibilities[]` | `Job.responsibilitiesJson` |
| `domainKnowledge[]`, `certifications[]` | `Job.domainKnowledgeJson`, `Job.certificationsJson` |
| `summary`, `confidence`, `extractedAt` | `Job.summary`, `Job.extractionConfidence`, `Job.extractedAt` |

### `CandidateExtraction` / `CandidateProfile` → `Candidate` + children

| Presentation | Relational |
| --- | --- |
| `name`, `email`, `phone`, `location` | `Candidate.*` |
| `totalExperienceYears` | `Candidate.totalExperienceYears` |
| `skills[]` | `CandidateSkill[]` + optional `Skill`/`SkillAlias` |
| `experience[]` | `CandidateExperience[]` |
| `education[]` | `Candidate.educationJson` (no education table yet) |
| `projects[]`, `certifications[]` | `Candidate.extracted*Json` or new tables |
| `rawResumeText` | `Resume.rawText` + `Candidate.rawResumeText` |

### `CandidateScoreResult` → `CandidateMatch`

| Presentation | Relational |
| --- | --- |
| `candidateId`, `jobId` | `CandidateMatch.candidateId/jobId` |
| `totalScore`, `skillScore`, `experienceScore`, `preferredScore`, `evidenceScore` | same-named columns |
| `max*Score` | Stored for audit: `CandidateMatch.max*` |
| `status` | `CandidateMatch.status` |
| `decision` | `CandidateMatch.decision` |
| `matches` | `matchesJson` |
| `gaps` | `gapsJson` |
| `scoringWeights` | `weightsJson` (and `ScoringRun.weightsJson`) |
| `reviewNotes` | `reviewNotes` |
| `reviewedAt` | Dedicated `reviewedAt` |
| `extractionConfidence`, `extractionWarnings` | `extractionConfidence`, `extractionWarningsJson` |

### `JobScreening` → aggregate

`JobScreening` is not a table. It is a projection of:

```text
Job
  + latest ScoringRun
  + CandidateMatch[] joined to Candidate
  + counts derived from decisions
```

Additional projection fields:

| Presentation | Relational |
| --- | --- |
| `isSample` | `Job.isSample` |
| `processingNotes` | `Job.processingNotesJson` |
| `status` | `Job.status` |
| `createdAt` | `Job.createdAt` |
| counts | Derived from `CandidateMatch.decision` |

### Market types → aggregate tables

| Presentation | Relational |
| --- | --- |
| `CareerRoleIntelligence` | `MarketRoleData` |
| `MarketRequirementStat[]` | `MarketRoleData.requirementsJson` |
| `ExperienceDistribution[]` | `MarketRoleData.experienceJson` |
| `skillPriorities` | `MarketRoleData.prioritiesJson` |
| `ObservedCompanyRequirement` | `Company.observedDataJson` |
| Individual postings/citations | `JobPosting` + `EvidenceSource` |

---

## 7. Migration status

Shipped:

1. **Server-only repository layer** (`lib/db/`) exposing domain operations, not raw Prisma types.
2. **Prisma is authoritative** for screenings, matches, scoring runs, decisions, and settings.
3. **The client store reads and writes through `/api/screenings`;** `localStorage` is no longer used.
4. **Decisions and weight recomputes persist** and survive reloads/restarts.

Still required:

1. **Organization scoping** on every repository query and mutation.
2. **Server actions** or a typed mutation layer for decisions, with an audit entry per change.
3. **Extraction history**: persist provider/model/version per extraction so audit-grade reproducibility does not depend on re-reading the source.
4. **Seed parity**: seed sample roles/screenings/candidates into Prisma so the UI can stop importing fixtures directly.
5. **Optional import** of legacy `localStorage` data, then retire the key permanently.

Acceptance criteria: reloading in another browser shows the same screening and decisions; no decision exists only in the browser; every mutation is attributable to a user.

---

## 8. Conventions

### IDs

- Sample data: readable (`cand-01`, `req-1`, `job-screening-py-01`).
- Prisma: `cuid()`.
- Never parse IDs as numbers. Treat them as opaque strings.
- Use stable IDs when persisting; do not rely on the scorer's random fallback.

### Timestamps

- Prisma: `DateTime`.
- JSON/presentation: ISO 8601 strings.
- Human-facing dates: format at the edge, not in the domain.

### Enums vs strings

- `MatchStatus`, `DecisionStatus`, `ScoringWeights` are typed unions in TypeScript.
- Prisma stores related states as strings today. If you switch to Prisma enums, map values explicitly and migrate existing rows.

### JSON payloads

- Always store the full evidence/gap payloads, not just the score. Explainability requires the citations.
- Version JSON payloads when their shape changes (add a `schemaVersion` field).
- Never store a score without the weights that produced it.

### Provenance

Any data shown as market evidence must be traceable to a `JobPosting` + `EvidenceSource`. Until then, label it as sample data.

---

## 9. Privacy and compliance notes

- Raw resume text is sensitive. The app currently stores only `rawTextExcerpt`/`profileJson` evidence, but that is still candidate PII. Define retention, encryption, and deletion before production.
- Do not log resume text or full candidate objects.
- Organization scoping must be enforced on every query, not just in the UI.
- An audit trail should capture: extraction run, model/provider, score weights, human decision, reviewer identity, timestamp. `ScoringRun` covers weights; the rest is not stored yet.
- Candidate deletion must cascade through skills, experiences, and matches (`onDelete: Cascade` is already set for most relations). `Candidate.profileJson` must be deleted with the candidate.

---

## 10. Related documents

- [`../AGENTS.md`](../AGENTS.md) — status and pitfalls
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layer boundaries and target topology
- [`ENGINE.md`](./ENGINE.md) — scoring contracts
- [`ROADMAP.md`](./ROADMAP.md) — persistence and ingestion phases
