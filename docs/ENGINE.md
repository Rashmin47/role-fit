# Deterministic Engine Specification

> The engine is the product. Models extract facts; this engine turns facts into explainable, reproducible points.
>
> Source of truth: `lib/scoring/index.ts`, `lib/matching/index.ts`, `lib/routing/index.ts`, `lib/normalization/skills.ts`.
> Regression suite: `lib/tests/engine.test.ts`.

Last verified: 2026-10-25.

---

## 1. Inputs and outputs

### 1.1 Candidate input (`CandidateExtraction` from `types/index.ts`)

```ts
{
  name: string;
  totalExperienceYears: number;
  skills: { name: string; level?: "Basic" | "Working knowledge" | "Strong" | "Expert"; yearsOfExperience?: number }[];
  experience: { company; title; startDate; endDate?; current?; years; description; technologies: string[] }[];
  education: { institution; degree; field; graduationYear? }[];
  projects?: { name; description; technologies: string[] }[];
  certifications?: { name; issuer; year? }[];
}
```

### 1.2 Job input (`JobRequirements` from `types/index.ts`)

```ts
{
  title: string;
  minimumExperienceYears: number;
  requiredSkills: JobRequirement[];   // type "required_skill"
  preferredSkills: JobRequirement[];  // type "preferred_skill"
  responsibilities: string[];
}
```

### 1.3 Output (`CandidateScoreResult`)

A single object containing:

- `totalScore` and the four component scores + their maxima,
- `calculatedExperienceYears` / `requiredExperienceYears`,
- `status` (`Strong Match` | `Review` | `Needs Verification`),
- `decision` (`pending` by default),
- `matches`: `MatchEvidence[]` (every required/preferred requirement plus the experience row),
- `gaps`: `SkillGap[]`,
- `scoringWeights`: the weights used,
- `calculatedAt`: ISO timestamp,
- `extractionConfidence?: number` and `extractionWarnings?: string[]` when produced by `screenCandidateText()`.

The output is serializable and stored in the screening store. It contains no model-generated narrative.

### 1.4 Extraction assumptions (offline provider)

File: `lib/ai/resume-heuristics.ts`.

- **Honesty over recall.** Missing employers, degrees, dates, and years stay empty. The extractor never inserts a default company, university, or experience duration.
- **Explicit years win.** A statement such as “5 years of experience” sets `totalExperienceYears` directly.
- **Otherwise, date ranges are used.** Closed ranges and `Present` roles are converted to months, merged when they overlap, and rounded to one decimal. `Present` is evaluated at extraction time.
- **Scoring does not read the clock or the resume.** It reads the stored `totalExperienceYears`. Re-extracting an open-ended role later can change that input, so a historical score is only reproducible from its stored extraction, not from the original file.
- **Skills cite a line.** Every extracted skill keeps the resume line that evidenced it. The scorer may still fall back to “Listed in resume skills profile” if a skill has no snippet.
- **Job requirements are line-scoped.** “Preferred” is detected from the requirement’s own line (or a short section header), not from a character window that can bleed into a neighbouring bullet. In “FastAPI or Django”, the later alternative is treated as preferred because the engine has no OR-group type yet.
- **No fallback requirements.** If the job extractor recognizes nothing, the requirement list is empty. The wizard blocks screening until the recruiter adds at least one required skill.

---

## 2. Normalization

File: `lib/normalization/skills.ts`.

### 2.1 Canonical aliases

```text
"psql" | "postgres" | "postgresql" | "postgres sql" → "PostgreSQL"
"py" | "python3" | "python 3"                  → "Python"
"fast-api" | "fast api"                         → "FastAPI"
"k8s"                                           → "Kubernetes"
"js"                                            → "JavaScript"
"ts"                                            → "TypeScript"
"node" | "nodejs" | "node.js"                   → "Node.js"
"rest" | "restful api"                          → "REST APIs"
"ci/cd" | "cicd"                                → "CI/CD"
"agile" | "scrum"                               → "Agile / Scrum"
…
```

The full map is curated and intentionally small. Lookup is case-insensitive on the trimmed input.

### 2.2 Unknown tokens

Unknown input is title-cased word by word:

```text
"unknown tech tool" → "Unknown Tech Tool"
```

This is a display fallback, **not** taxonomy learning. Unknown skills are not persisted to a taxonomy automatically.

### 2.3 Matching predicate

```ts
matchSkills(a, b) =
  normalize(a).toLowerCase() === normalize(b).toLowerCase()
  OR normalize(a).contains(normalize(b))
  OR normalize(b).contains(normalize(a))
```

Implications:

- Case, punctuation, and common aliases are handled.
- Bidirectional substring matching can create false positives: `React` ↔ `React Native`, `Java` ↔ `JavaScript` (note: `"javascript".includes("java")` is true), `SQL` ↔ `PostgreSQL` (true), `Go` ↔ `MongoDB` (false, but substring directions matter).
- Match quality is binary; there is no fuzzy score.

**Before tightening this predicate**, add failing/positive cases to `engine.test.ts`. A stricter token-boundary matcher is a valid Phase 1 improvement, but it will change scores.

---

## 3. Required-skill scoring

File: `calculateSkillScore()` in `lib/scoring/index.ts`.

### 3.1 Algorithm

```text
if requiredSkills is empty: return full maxPoints (default 50)

pointPerSkill = maxPoints / requiredSkills.length
earned = 0

for each requirement in requiredSkills (in input order):
  canonical = normalizeSkillName(requirement.name)

  foundInSkills =
    candidate.skills.find(s => matchSkills(s.name, canonical))

  foundInExperience =
    any experience where
      any technology matches canonical
      OR experience.description.toLowerCase().includes(canonical.toLowerCase())

  foundInProject (only if not already found) =
    any project whose technologies match canonical

  if foundInSkills or foundInExperience or foundInProject:
    earned += pointPerSkill
    evidence.status = matched
    evidence.candidateValue =
      foundInSkills?.level
      ?? (foundInExperience ? "Demonstrated in Work History" : "Present")
    evidence.evidenceSnippet =
      experience citation OR project citation OR `Listed in resume skills profile: "…"`
  else:
    evidence.status = not matched
    missing.push(canonical)

score = round(earned)
```

### 3.2 Important semantics

- **No partial credit.** A candidate with `Working knowledge` earns the same required-skill points as `Expert`.
- **Depth is recorded, not scored.** `candidateValue` carries the stated level; the UI can display it.
- **Experience descriptions count.** A requirement can be satisfied by prose evidence even if it is absent from the explicit skills list.
- **Projects count for required skills only**, not preferred skills.
- **Order matters for evidence selection**, not for the point total. The first matching experience/project supplies the citation.
- **Rounding happens once** at the end. With 3 requirements and 2 matches: `round(50 × 2/3) = 33`.
- **Empty required list returns full points.** This is a safety valve for roles with no extracted requirements, but it is dangerous in production: never allow empty extraction to silently produce a perfect skill score. Validation currently reports an error when both required and preferred are empty, but the scorer itself does not.

### 3.3 Worked example

4 required skills (`Python`, `FastAPI`, `PostgreSQL`, `Docker`), all present:

```text
pointPerSkill = 50 / 4 = 12.5
earned = 50
score = round(50) = 50
```

2 of 4 present:

```text
earned = 25 → score 25
```

---

## 4. Preferred-skill scoring

File: `calculatePreferredSkillScore()`.

```text
if preferredSkills is empty: return maxPoints (default 15)

pointPerSkill = maxPoints / preferredSkills.length

for each preferred requirement:
  found = candidate.skills matches canonical
          OR any experience.technologies matches canonical

  if found: earned += pointPerSkill
  matches.push({ matched: found, ... })
```

Differences from required scoring:

- Experience **descriptions** are not searched.
- **Projects are not searched.**
- The function returns evidence for both matched and unmatched preferred skills (unmatched have `matched: false`), unlike required scoring.

Missing preferred skills become `SkillGap` entries with `category: "preferred"`.

---

## 5. Experience scoring

File: `calculateExperienceScore()`.

```text
if requiredYears <= 0:
  score = maxPoints (default 25)

ratio = candidateYears / requiredYears
ratio = min(ratio, 1.25)
score = min(maxPoints, round(ratio × maxPoints))
```

Examples (max 25):

| Candidate years | Required years | Ratio | Score |
| --- | --- | --- | --- |
| 4.0 | 3.0 | 1.33 → capped 1.25 | 25 |
| 3.0 | 3.0 | 1.0 | 25 |
| 2.4 | 3.0 | 0.8 | 20 |
| 1.5 | 3.0 | 0.5 | 13 |
| 0 | 3.0 | 0 | 0 |
| any | 0 | n/a | 25 |

Notes:

- The 1.25 cap prevents extreme over-qualification from inflating the score, but the final `min(maxPoints, …)` means the cap never adds points beyond 25.
- **Scoring reads `candidate.totalExperienceYears` directly.** It never reads employment dates or the clock. The offline extractor is what derives the value from explicit statements or date ranges (see §1.4); the `calculate_experience` tool remains unwired.
- `matches` carries a single synthetic `req-experience` evidence row with the threshold comparison in `confidenceNotes`.

---

## 6. Evidence-quality scoring

File: `calculateEvidenceScore()`.

```text
points = 0
if candidate.experience.length > 0      points += 4
if candidate.projects?.length > 0       points += 3
if candidate.education.length > 0       points += 2
if candidate.certifications?.length > 0 points += 1
score = min(maxPoints, points)           // maxPoints default 10
```

This measures **presence, not quality**. One thin experience entry earns the same 4 points as five detailed ones. It does not inspect `years`, descriptions, dates, or confidence notes. Treat it as a structural completeness signal.

---

## 7. Composite score

File: `calculateFinalMatchScore()`.

```text
total = min(100,
  requiredScore
  + experienceScore
  + preferredScore
  + evidenceScore
)
```

With defaults `50 + 25 + 15 + 10 = 100`, the maximum is exactly 100. Custom weights that sum above 100 are capped at 100; weights that sum below 100 lower the achievable maximum.

The returned `CandidateScoreResult` also includes:

- `status` from `determineRecruiterRecommendation()` (see §8),
- `decision: "pending"` unless the store/human later changes it,
- `gaps` from `generateSkillGaps(missingRequired, missingPreferred)`,
- `matches` = required-skill evidence + experience evidence + preferred evidence.

### Gap generation

`generateSkillGaps()` currently uses fixed explanatory copy:

- required gaps: `importance: "high"`, `marketFrequency: 78`,
- preferred gaps: `importance: "medium"`, `marketFrequency: 45`.

These numbers are **not derived from market data**. Do not present them as observed frequencies. A Phase 1/4 task is to source gap explanations from retrieved market evidence.

---

## 8. Routing and recommendation

There are two mirrored implementations:

1. `determineRecruiterRecommendation()` in `lib/scoring/index.ts` → `MatchStatus` for the UI.
2. `determineCandidateRouting()` in `lib/routing/index.ts` → `RoutingQueueState` with reasons + suggested action for the batch pipeline.

Both encode the same thresholds today. If you change one, change both and update tests.

### 8.1 Score-based recommendation

```text
if total >= 85 AND missingRequired == 0 AND candidateYears >= requiredYears:
  "Strong Match"
else if total >= 60 OR missingRequired <= 2:
  "Review"
else:
  "Needs Verification"
```

### 8.2 Queue routing

```text
if score >= 85 AND missingRequiredCount == 0 AND experienceYears >= requiredYears:
  STRONG_MATCH   (priority 1, "fast-track to technical screening")
else if score >= 60 OR missingRequiredCount <= 2:
  REVIEW         (priority 2, "evaluate project depth in technical interview")
else:
  NEEDS_VERIFICATION (priority 3, "verify portfolio or request clarification")
```

### 8.3 Threshold caveat

Because the second branch uses `OR`, a candidate with a 40% score but only two missing required skills still routes to **Review**. This is intentional current behavior and is tested. It reflects a product stance ("do not bury candidates with incomplete extraction"), but it can overstate readiness. Tightening it is a product decision, not a refactor.

There is deliberately **no rejection state**.

---

## 9. Matching engine (`lib/matching`)

`evaluateCandidateMatch(candidate, job)` is a separate, richer evaluator used by the batch pipeline. It produces `MATCH`, `PARTIAL`, and `NOT_FOUND` items plus review flags.

### 9.1 Algorithm

```text
requirements = requiredSkills + preferredSkills

for each requirement:
  canonical = normalize(requirement.name)
  skillMatch = first candidate skill matching canonical
  workEvidence = first experience where technologies match or description contains canonical

  if skillMatch or workEvidence:
    strong = skillMatch.level ∈ {Strong, Expert} OR workEvidence exists
    status = strong ? MATCH : PARTIAL
  else:
    status = NOT_FOUND
    if importance == required: flag "Missing mandatory requirement: X"
  if status == PARTIAL: flag "Partial depth on X (level)"
```

It also flags experience below the minimum:

```text
if candidate.totalExperienceYears < job.minimumExperienceYears:
  flag "Experience duration below minimum requirement (X y vs Y y required)"
```

### 9.2 Relationship to scoring

- Matching treats `Basic` / `Working knowledge` as a **partial** match.
- Scoring still awards **full** required-skill points for any presence.
- This inconsistency is known. The long-term fix is to have scoring consume match results (or vice versa) so there is one definition.

### 9.3 Scope

Only `requiredSkills` and `preferredSkills` are evaluated. `educationRequirements`, `domainKnowledge`, and `certifications` exist in `StructuredJobRequirements` but are not yet matched or scored.

---

## 10. Deterministic test anchors

`lib/tests/engine.test.ts` is the contract. Current expectations:

### Normalization

| Input | Expected |
| --- | --- |
| `fast-api` | `FastAPI` |
| `postgres` / `psql` | `PostgreSQL` |
| `py` | `Python` |
| `k8s` | `Kubernetes` |
| `fastapi` vs `FastAPI` | match |
| `unknown tech tool` | `Unknown Tech Tool` |

### Fixture

- Candidate: 2.4 years, skills Python (Strong), FastAPI (Working knowledge), PostgreSQL (Strong), Docker (Working knowledge), one backend experience, one degree.
- Requirements: 4 required skills, 1 preferred (Redis), minimum 3 years.

| Assertion | Expected |
| --- | --- |
| Required skills | 50 |
| Experience (4.0 vs 3.0) | 25 and met |
| Experience (2.4 vs 3.0) | 20 and not met |
| Preferred (Redis missing) | 0 |
| Evidence | 6 |
| **Total** | **76** |
| Status | **Review** |

### Routing

| Score | Missing required | Candidate years | Required years | Expected |
| --- | --- | --- | --- | --- |
| 92 | 0 | 4.5 | 3.0 | `STRONG_MATCH` |
| 78 | 1 | 2.4 | 3.0 | `REVIEW` |
| 45 | 3 | 1.0 | 3.0 | `NEEDS_VERIFICATION` |

### Schema validation

- A compliant job JSON object with 2 required + 1 preferred validates and preserves array lengths.
- `{ somethingElse: true }` is invalid (no requirements).
- Candidate validation rejects non-objects; repairs negative years to 0, non-array skills/experience to empty arrays, and confidence outside 0–1 to the boundary.
- String and object skill entries are both accepted.

### Resume heuristics and end-to-end sample run

- The fixture resume extracts “Jane Doe”, 5 explicit years, `Acme Corp` / `Senior Backend Engineer`, `Example University` / 2019, and skills with evidence lines.
- The old fabricated “Tech Systems” employer and “Tribhuvan University” degree are asserted absent.
- A sparse resume leaves experience and education empty rather than inventing them.
- Generic filenames (`resume_final_v2.pdf`) fall back to the resume’s name; specific filenames (`jane_doe_resume.pdf`) are used as hints.
- Screening all six demo resumes produces a Strong Match and a Needs Verification candidate; every candidate has at least one cited match.
- The demo job keeps Docker required when only a nearby Redis bullet is preferred, treats “FastAPI or Django” as an alternative, and does not invent an education requirement.

Any change to these numbers is a **product change**, not a test fix. Update the fixture, the docs, and the roadmap together.

Current suite: **45 assertions, 0 failures**.

---

## 11. Weight configuration

`DEFAULT_SCORING_WEIGHTS`:

```ts
{ requiredSkills: 50, experience: 25, preferredSkills: 15, evidenceQuality: 10 }
```

The UI allows per-screening and global weight changes:

- `app/(dashboard)/settings/page.tsx` (global UI state, not persisted yet)
- `app/(dashboard)/recruitment/[jobId]/page.tsx` (per-screening, recomputes and persists to the store)

Rules:

1. Weights must total exactly 100 before the UI allows recomputation/save.
2. Pass the weights object through `calculateFinalMatchScore(candidate, job, weights)`.
3. The routing thresholds (`85`, `60`) are absolute and do **not** scale with weights. Changing weights can therefore change classification for the same candidate facts.
4. `recomputeScoresWithWeights()` in the store reconstructs a pseudo-profile from stored evidence; it is a demonstration of weight sensitivity, not an audit-grade re-score.

---

## 12. How to extend the engine

### Add a skill alias

1. Add the alias → canonical mapping in `CANONICAL_SKILL_MAP`.
2. Add an assertion in `engine.test.ts`.
3. If the alias is ambiguous (`go`, `r`, `c`), add a comment explaining the choice and test the false-positive risk.

### Add a scoring dimension

1. Extend `ScoringWeights` and `DEFAULT_SCORING_WEIGHTS` (keep sum 100).
2. Add a pure `calculateXScore()` with an explicit max-points parameter.
3. Compose it in `calculateFinalMatchScore()`.
4. Extend `CandidateScoreResult` and the UI score tiles.
5. Add UI controls and validation in settings + screening detail.
6. Add tests, including an over-100 cap case.
7. Update this document and `AGENTS.md`.

### Tighten matching

1. Write failing tests for the desired behavior (e.g. `Java` must not match `JavaScript`).
2. Change `matchSkills` once, not at every call site.
3. Re-run the full suite and inspect the 76-point anchor.
4. Document the semantic change here.

### Add a provider

1. Implement `AIProvider` in `lib/ai/`.
2. Return only `StructuredJobRequirements` / `CandidateProfile`.
3. Validate output before returning.
4. Fall back to the mock provider on failure.
5. Add a contract test with a recorded response.
6. Document configuration in `AGENTS.md` and `README.md`.

---

## 13. Edge cases and failure modes

| Case | Current behavior | Guidance |
| --- | --- | --- |
| No required skills | Required score = full 50 | The wizard blocks screening until at least one required skill is added; the scorer itself still returns full points |
| No preferred skills | Preferred score = full 15 | Expected for some roles |
| Required years = 0 | Experience score = full 25 | Expected for internships/junior roles |
| Duplicate requirements | Each duplicate earns points separately | De-duplicate before scoring |
| Candidate years > 1.25× required | Capped at max points | No bonus beyond 25 |
| Candidate skill level Basic | Full required points in scoring; PARTIAL in matching | Intentional inconsistency, documented |
| Preferred skill in project only | Not counted | Extend if product requires it |
| Requirement name unknown | Title-cased and matched literally | Add aliases |
| `matchSkills` substring collision | Possible false positive | Tighten with tests |
| Weights ≠ 100 | UI blocks; engine still computes and caps at 100 | Keep validation |
| Missing candidate ID | `calculateFinalMatchScore` generates `cand-<random>` | Pass stable IDs from persistence |
| No evidence snippet | Falls back to "Listed in resume skills profile" | Never invent a quote |
| Extraction returns malformed JSON | Validation rejects; Ollama falls back to mock | Keep fallbacks explicit |
| Scanned or image-only PDF | `/api/ingest` returns a per-file error; no candidate is scored | Add OCR before claiming support |
| File over size/count limit | Request or file is rejected with a readable error | Limits live in `app/api/ingest/route.ts` |
| Document over 200k characters | Text is truncated; the screening gets a processing note | Do not silently truncate in a future persistence layer |
| Open-ended role (`Present`) | Years are derived at extraction time and stored | Store the extraction timestamp for audit; re-extraction can change the value |
| `FastAPI or Django` | Later alternative becomes preferred, not a second hard requirement | Model OR groups explicitly before tightening |
| Extraction confidence < 0.6 | Candidate detail shows a low-confidence callout | Verify the source document before deciding |
| Generic filename (`resume.pdf`) | Falls back to the resume’s first name-like line | Do not trust filenames as identity |

---

## 14. Open engine work

Tracked in [`ROADMAP.md`](./ROADMAP.md):

1. Unify `lib/matching` and `lib/scoring` so "matched" means one thing.
2. Decide how date-derived experience becomes audit-grade: persist the extraction timestamp, keep the original text, and define a re-extraction policy.
3. Model alternative requirements (`X or Y`) explicitly instead of treating the later skill as preferred.
4. Score skill depth (Basic/Working/Strong/Expert) or explicitly document that depth is display-only.
5. Source gap `marketFrequency` and explanations from retrieved evidence instead of fixed constants.
6. Make routing thresholds configurable and covered by a decision table.
7. Add education/domain/certification scoring or remove them from the contract.
8. Replace the custom assertion script with Vitest + coverage and add property-based tests for score bounds (`0 ≤ total ≤ 100`).
