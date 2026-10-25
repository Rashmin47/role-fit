# Data Model

> Three representations of the same domain coexist today: **AI extraction contracts**, **presentation types**, and the **Prisma persistence schema**. This document explains each, how they map, and how to migrate safely.

Last verified: 2026-10-19.

---

## 1. The three representations

| Representation | Location | Purpose | Validated? | Persisted? |
| --- | --- | --- | --- | --- |
| **AI contracts** | `lib/ai/schemas.ts` | Boundary between unstructured text and typed facts | Job output: yes. Candidate output: **no** (gap) | No |
| **Presentation/domain types** | `types/index.ts` | UI props, sample data, store, legacy engine API | TypeScript only | `localStorage` (screenings) |
| **Relational schema** | `prisma/schema.prisma` | Target database model | Prisma types after generation | SQLite locally; not used by app yet |

### Why this is intentional (for now)

The UI and deterministic engine were built first to validate the product thesis. Persistence was designed but not wired. A big-bang unification would have mixed a risky UI rewrite with a risky data migration.

### Why it must be fixed

- Two shapes drift (e.g. `JobRequirement` vs `ExtractedRequirement`).
- Conversion code lives in UI and batch layers (`NewScreeningWorkflow`, `lib/batch`).
- Validation exists for jobs but not candidates.
- Prisma cannot be the source of truth until the app reads/writes it.

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

**Gap:** there is no `validateCandidateProfileOutput()`. Ollama candidate output is trusted structurally and only falls back on fetch/parse errors. Add validation before wiring real ingestion.

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

`reviewNotes` and `reviewedAt` are persisted in `localStorage` today and should map to `CandidateMatch.reviewNotes` / `updatedAt` later. `extractionConfidence` and `extractionWarnings` are presentation/audit metadata; they can live in `CandidateMatch.matchesJson` or dedicated columns when persistence lands.

---

## 4. Current client persistence

File: `lib/store/screening-store.ts`.

- Storage key: `rolefit_screenings_state_v1`.
- Legacy key read as fallback: `nirman_screenings_state_v1`.
- Value: `JobScreening[]` serialized as JSON.
- Store implementation: module-level snapshot + listeners + `useSyncExternalStore`.
- Cross-tab sync: `storage` event.
- Server snapshot: `SAMPLE_SCREENINGS` (deterministic hydration).
- Writes: decisions, notes, new screenings, weight recomputation.

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

Uploaded PDF/DOCX/TXT/MD files are parsed by `app/api/ingest/route.ts` and are **not** written to `localStorage` or the database. The request holds file bytes in memory, returns extracted text, and the wizard screens that text. Only the resulting score evidence (short snippets), processing notes, and decisions are persisted in the browser store. There is no `Resume` row yet and no raw document retention.

### Constraints

- Data is per-browser. It does not sync across devices.
- There is no migration/versioning beyond the key suffix.
- Clearing site data destroys screenings and decisions.
- No PII protections. Do not store real candidate data here.
- `candidateCount` must equal `candidates.length` for consistency (the sample fixture was corrected in v0.2).
- Sample screenings must keep `isSample: true` so the UI can label them.

### Versioning rule

If the persisted shape changes, bump the key to `..._v2` and implement a read-time migration from `v1`. Never silently parse an incompatible shape. Keep the legacy `nirman_` key read for one release.

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
Company (standalone aggregate)
MarketRoleData (standalone aggregate)
```

### 5.3 Models

| Model | Key fields | Notes |
| --- | --- | --- |
| `Organization` | `id`, `name`, `slug @unique` | Tenant boundary (not enforced yet) |
| `User` | `id`, `email @unique`, `role`, `organizationId?` | `role` is a string, not an enum |
| `Job` | `title`, `department`, `location`, `status`, `rawDescription`, `minimumExperienceYears`, `organizationId?` | One screening workspace |
| `Requirement` | `jobId`, `name`, `type`, `importance`, `weight`, `minimumYears?`, `confidence`, `extractedEvidence?` | Structured requirements |
| `Candidate` | `name`, `email?`, `phone?`, `location?`, `headline?`, `totalExperienceYears`, `rawResumeText?`, `extracted*Json` | JSON columns hold extraction snapshots |
| `Resume` | `candidateId`, `filename`, `fileSize`, `mimeType`, `rawText`, `parsedAt` | One row per uploaded document |
| `CandidateSkill` | `candidateId`, `skillName`, `level?`, `years?`, `evidence?` | Normalized skill rows |
| `CandidateExperience` | `candidateId`, `company`, `title`, dates, `years`, `description?` | No technologies column yet; stored in JSON |
| `CandidateMatch` | `jobId`, `candidateId`, component scores, `status`, `decision`, `matchesJson`, `gapsJson`, `weightsJson`, `reviewNotes?` | `@@unique([jobId, candidateId])` |
| `ScoringRun` | `jobId`, `executedAt`, `candidatesCount`, `status`, `weightsJson` | One row per batch run |
| `CandidateProcessingJob` | `scoringRunId`, `candidateName`, `status`, `score?`, `routingState?`, `errorMessage?`, timestamps | Per-candidate progress/retry unit |
| `Skill` | `name @unique`, `category` | Canonical taxonomy |
| `SkillAlias` | `skillId`, `alias @unique` | Lookup table for normalization |
| `JobPosting` | `companyName`, `roleTitle`, `sourceName`, `observedDate`, `extractedSkillsJson`, `minimumExperienceYears`, `descriptionExcerpt` | Market evidence source |
| `EvidenceSource` | `jobPostingId`, `url?`, `title`, `collectedAt` | Provenance/citation |
| `MarketRoleData` | `roleKey @unique`, `title`, counts, JSON aggregates, `lastUpdated` | Career Intelligence aggregates |
| `Company` | `name @unique`, `industry`, `observedDataJson` | Company Intelligence aggregate |

### 5.4 Design notes

- **JSON columns** (`*Json`) are deliberate for evolving extraction payloads. Normalize them into tables only when querying/reporting requires it.
- **`CandidateMatch`** is the durable unit of a screening result. It has the unique `(jobId, candidateId)` constraint needed for idempotent re-runs.
- **`ScoringRun` + `CandidateProcessingJob`** model a batch run and per-candidate failure isolation.
- **`Requirement.type`/`importance`** are strings, not enums. This keeps migrations cheap but weakens integrity. Converting to Prisma enums is a Phase 2 decision.
- **No `AuditLog` model yet.** Add one before production (who changed a decision, when, why).
- **No `Settings`/`ScoringProfile` model yet.** Global weights/provider settings need persistence.
- **`User.role`** is a free string; RBAC is not implemented.

### 5.5 Seed

`prisma/seed.ts` (run by `prisma db seed` via `prisma.config.ts`):

- upserts organization `Apex Engineering` (`slug: "apex-engineering"`),
- upserts demo user `rashmin@rolefit.app` with role `lead_recruiter`.

It does **not** seed jobs/candidates/market data yet. The UI uses `lib/data/sample-data.ts` instead. Phase 2 should seed the same fixtures into Prisma so the UI can switch sources without changing its shape.

---

## 6. Mapping plan: presentation → relational

When wiring persistence, these are the intended mappings.

### `JobRequirements` → `Job` + `Requirement[]`

| Presentation | Relational |
| --- | --- |
| `JobRequirements.id` | `Job.id` (or generate) |
| `title`, `department`, `location`, `rawDescription` | `Job.*` |
| `minimumExperienceYears` | `Job.minimumExperienceYears` |
| `requiredSkills[]` | `Requirement { importance: "required", type: "skill" }` |
| `preferredSkills[]` | `Requirement { importance: "preferred", type: "skill" }` |
| `responsibilities[]` | Not modeled; add `responsibilitiesJson` or a `Responsibility` table |

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
| `max*Score` | Derivable from weights; not stored |
| `status` | `CandidateMatch.status` |
| `decision` | `CandidateMatch.decision` |
| `matches` | `matchesJson` |
| `gaps` | `gapsJson` |
| `scoringWeights` | `weightsJson` (and `ScoringRun.weightsJson`) |
| `reviewNotes` | `reviewNotes` |
| `reviewedAt` | `updatedAt` or a dedicated audit field |

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
| `isSample` | `ScoringRun.source = "sample"` (or an equivalent provenance field) |
| `processingNotes` | `ScoringRun.errorSummary` / `CandidateProcessingJob.lastError` + `Resume` parsing status |
| `extractionConfidence` | `CandidateMatch.confidence` or `matchesJson` |
| `extractionWarnings` | `CandidateMatch.matchesJson` / audit log |

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

## 7. Migration sequence (recommended)

1. **Add a server-only repository layer** (`lib/db/`) exposing domain operations, not raw Prisma types.
2. **Seed Prisma** with the same sample roles/screenings/candidates (or a subset) so both sources can be compared.
3. **Introduce a data-source flag** (e.g. `SCREENING_SOURCE=local|database`) or migrate one route at a time, starting with recruitment list/detail.
4. **Read from DB in server components**, pass serializable view models to client islands. Do not import Prisma into client components.
5. **Write decisions through a server action** with organization scoping + audit entry.
6. **Migrate `localStorage` data** with an explicit import action (opt-in), then bump/retire the key.
7. **Remove the client fallback** once DB reads are authoritative.

Acceptance criteria: reloading on another browser shows the same screening and decisions; no decision exists only in `localStorage`; every mutation is attributable to a user.

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

- Raw resume text is sensitive. Define retention, encryption, and deletion before production.
- Do not log resume text or full candidate objects.
- Organization scoping must be enforced on every query, not just in the UI.
- An audit trail should capture: extraction run, model/provider, score weights, human decision, reviewer identity, timestamp.
- Candidate deletion must cascade through resumes, skills, experiences, and matches (`onDelete: Cascade` is already set for most relations).

---

## 10. Related documents

- [`../AGENTS.md`](../AGENTS.md) — status and pitfalls
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — layer boundaries and target topology
- [`ENGINE.md`](./ENGINE.md) — scoring contracts
- [`ROADMAP.md`](./ROADMAP.md) — persistence and ingestion phases
