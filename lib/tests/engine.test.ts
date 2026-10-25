/**
 * Role Fit Core Logic Automated Test Suite
 * Validates normalization, deterministic scoring, matching, routing, and AI schema validation.
 */

import { normalizeSkillName, matchSkills } from "../normalization/skills";
import {
  calculateSkillScore,
  calculateExperienceScore,
  calculatePreferredSkillScore,
  calculateEvidenceScore,
  calculateFinalMatchScore,
  DEFAULT_SCORING_WEIGHTS,
} from "../scoring";
import { determineCandidateRouting } from "../routing";
import {
  validateCandidateProfileOutput,
  validateJobRequirementsOutput,
} from "../ai/schemas";
import { extractCandidateHeuristics } from "../ai/resume-heuristics";
import { MockAIProvider } from "../ai/mock-provider";
import {
  screenCandidateText,
  structuredJobToRequirements,
} from "../screening/screen-candidate";
import {
  DEMO_JOB_DESCRIPTION,
  DEMO_RESUME_POOL,
} from "../data/demo-resumes";

async function runTests() {
  console.log("🧪 Running Role Fit Engine Automated Test Suite...\n");
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✕ FAILED: ${testName}`);
      failed++;
    }
  };

  // 1. Skill Normalization Tests
  console.log("1. Skill Normalization & Aliases:");
  assert(normalizeSkillName("fast-api") === "FastAPI", "Normalizes 'fast-api' to 'FastAPI'");
  assert(normalizeSkillName("postgres") === "PostgreSQL", "Normalizes 'postgres' to 'PostgreSQL'");
  assert(normalizeSkillName("psql") === "PostgreSQL", "Normalizes 'psql' to 'PostgreSQL'");
  assert(normalizeSkillName("py") === "Python", "Normalizes 'py' to 'Python'");
  assert(normalizeSkillName("k8s") === "Kubernetes", "Normalizes 'k8s' to 'Kubernetes'");
  assert(matchSkills("fastapi", "FastAPI") === true, "Matches case-insensitive variations");
  assert(normalizeSkillName("unknown tech tool") === "Unknown Tech Tool", "Fallback title cases unknown tokens");

  // 2. Deterministic Scoring Engine Tests
  console.log("\n2. Deterministic Scoring Logic:");
  const testCandidate = {
    name: "Sanjay Thapa",
    totalExperienceYears: 2.4,
    skills: [
      { name: "Python", level: "Strong" as const },
      { name: "FastAPI", level: "Working knowledge" as const },
      { name: "PostgreSQL", level: "Strong" as const },
      { name: "Docker", level: "Working knowledge" as const },
    ],
    experience: [
      {
        company: "Tech Ltd",
        title: "Backend Engineer",
        startDate: "2023-01",
        years: 2.4,
        description: "Built FastAPI microservices and PostgreSQL schemas.",
        technologies: ["Python", "FastAPI", "PostgreSQL", "Docker"],
      },
    ],
    education: [{ institution: "University", degree: "BE", field: "Computer Science" }],
  };

  const testJobReqs = {
    id: "job-01",
    title: "Python Backend Developer",
    rawDescription: "Role description",
    minimumExperienceYears: 3.0,
    requiredSkills: [
      { id: "req-1", name: "Python", type: "required_skill" as const },
      { id: "req-2", name: "FastAPI", type: "required_skill" as const },
      { id: "req-3", name: "PostgreSQL", type: "required_skill" as const },
      { id: "req-4", name: "Docker", type: "required_skill" as const },
    ],
    preferredSkills: [
      { id: "pref-1", name: "Redis", type: "preferred_skill" as const },
    ],
    responsibilities: ["Build backend APIs"],
  };

  const skillScore = calculateSkillScore(testCandidate, testJobReqs.requiredSkills, 50);
  assert(skillScore.score === 50, "Calculates full 50pts when all 4 required skills are present");
  assert(skillScore.missing.length === 0, "Correctly identifies zero missing required skills");

  const expScoreMet = calculateExperienceScore(4.0, 3.0, 25);
  assert(expScoreMet.score === 25 && expScoreMet.match.matched === true, "Full 25pts when experience meets threshold (4.0 >= 3.0)");

  const expScoreUnder = calculateExperienceScore(2.4, 3.0, 25);
  assert(expScoreUnder.score === 20 && expScoreUnder.match.matched === false, "Pro-rated experience score when under requirement (2.4 < 3.0)");

  const prefScore = calculatePreferredSkillScore(testCandidate, testJobReqs.preferredSkills, 15);
  assert(prefScore.score === 0, "Zero preferred points when optional Redis is missing");

  const evidenceScore = calculateEvidenceScore(testCandidate, 10);
  assert(evidenceScore.score === 6, "Calculates evidence score (6pts) from structured work history and degree");

  const finalMatch = calculateFinalMatchScore(testCandidate, testJobReqs, DEFAULT_SCORING_WEIGHTS);
  assert(finalMatch.totalScore === 76, "Calculates accurate composite total match score (76%)");
  assert(finalMatch.status === "Review", "Assigns 'Review' status due to 2.4y < 3.0y experience");

  // 3. Routing Engine Tests
  console.log("\n3. Decision & Routing Engine:");
  const strongDecision = determineCandidateRouting(92, 0, 4.5, 3.0);
  assert(strongDecision.state === "STRONG_MATCH", "Routes candidate with 92% and 0 gaps to STRONG_MATCH");

  const reviewDecision = determineCandidateRouting(78, 1, 2.4, 3.0);
  assert(reviewDecision.state === "REVIEW", "Routes candidate with minor gaps to REVIEW queue");

  const verifyDecision = determineCandidateRouting(45, 3, 1.0, 3.0);
  assert(verifyDecision.state === "NEEDS_VERIFICATION", "Routes candidate with multiple gaps to NEEDS_VERIFICATION");

  // 4. AI Output Schema Validation Tests
  console.log("\n4. AI Output Schema Validation:");
  const validAIJson = {
    title: "Backend Engineer",
    minimumExperienceYears: 3,
    requiredSkills: [{ name: "Python", importance: "required" }, { name: "PostgreSQL", importance: "required" }],
    preferredSkills: [{ name: "Redis", importance: "preferred" }],
    responsibilities: ["Develop APIs"],
  };
  const validRes = validateJobRequirementsOutput(validAIJson);
  assert(validRes.valid === true, "Validates compliant AI extraction JSON");
  assert(validRes.data?.requiredSkills.length === 2, "Preserves extracted requirement arrays");

  const malformedJson = { somethingElse: true };
  const malformedRes = validateJobRequirementsOutput(malformedJson);
  assert(malformedRes.valid === false, "Rejects malformed AI output without requirements");

  // 5. Candidate Validation & Honest Resume Extraction
  console.log("\n5. Candidate Validation & Resume Heuristics:");
  const rejectedCandidate = validateCandidateProfileOutput("not-an-object");
  assert(rejectedCandidate.valid === false, "Rejects non-object candidate output");

  const repairedCandidate = validateCandidateProfileOutput({
    name: "Jane Doe",
    totalExperienceYears: -2,
    skills: "Python",
    experience: "not-an-array",
    confidence: 1.6,
  });
  assert(
    repairedCandidate.valid === true && repairedCandidate.data?.totalExperienceYears === 0,
    "Repairs negative candidate experience to zero"
  );
  assert(
    repairedCandidate.data?.skills.length === 0 &&
      repairedCandidate.data?.experience.length === 0,
    "Repairs non-array skills and experience instead of crashing"
  );
  assert(
    repairedCandidate.data?.confidence === 1,
    "Clamps out-of-range extraction confidence"
  );
  assert(
    repairedCandidate.warnings?.some((warning) => warning.includes("Skills were not an array")) ===
      true,
    "Reports a warning for malformed skills"
  );

  const stringSkillCandidate = validateCandidateProfileOutput({
    name: "Alex Kim",
    totalExperienceYears: 2,
    skills: ["Python", { name: "PostgreSQL", level: "Expert" }],
  });
  assert(
    stringSkillCandidate.data?.skills.length === 2,
    "Accepts both string and object skill entries"
  );

  const resumeText = `Jane Doe
jane@example.com | +1 555 010 1234

SUMMARY
Backend engineer with 5 years of experience.

EXPERIENCE
Senior Backend Engineer
Acme Corp | Jan 2020 - Dec 2022
- Built FastAPI services with PostgreSQL and Docker.
- Wrote PyTest suites.

EDUCATION
BSc Computer Science
Example University | 2015 - 2019

SKILLS
Python, FastAPI, PostgreSQL, Docker, PyTest`;

  const extracted = extractCandidateHeuristics(
    resumeText,
    undefined,
    { asOf: new Date("2026-10-25T00:00:00Z") }
  );
  assert(extracted.name === "Jane Doe", "Extracts the candidate name from the resume");
  assert(
    extracted.totalExperienceYears === 5,
    "Prefers an explicit experience statement"
  );
  assert(
    extracted.skills.some((skill) => skill.name === "Python") &&
      extracted.skills.every((skill) => Boolean(skill.evidenceSnippet)),
    "Extracts skills with an evidence line"
  );
  assert(
    extracted.experience[0]?.company === "Acme Corp" &&
      extracted.experience[0]?.title === "Senior Backend Engineer",
    "Pairs a dated role with its company and title"
  );
  assert(
    extracted.education[0]?.institution === "Example University" &&
      extracted.education[0]?.graduationYear === 2019,
    "Extracts education without inventing an institution"
  );
  assert(
    !extracted.experience.some((entry) => entry.company === "Tech Systems") &&
      !extracted.education.some((entry) =>
        entry.institution.includes("Tribhuvan")
      ),
    "Does not fabricate the old demo employer or university"
  );

  const genericFilename = extractCandidateHeuristics(
    resumeText,
    "resume_final_v2.pdf"
  );
  assert(
    genericFilename.name === "Jane Doe",
    "Falls back to the resume text when the filename is generic"
  );
  const hintedFilename = extractCandidateHeuristics(
    resumeText,
    "jane_doe_resume.pdf"
  );
  assert(
    hintedFilename.name === "Jane Doe",
    "Uses a specific filename as a name hint"
  );

  const sparse = extractCandidateHeuristics("Alex Kim\nPython developer", "Alex Kim");
  assert(
    sparse.totalExperienceYears === 0 &&
      sparse.experience.length === 0 &&
      sparse.education.length === 0,
    "Leaves unverifiable experience and education empty"
  );

  // 6. End-to-End Sample Screening
  console.log("\n6. End-to-End Sample Screening:");
  const provider = new MockAIProvider();
  const sampleJob = await provider.extractJobRequirements(
    "Python Backend Developer",
    DEMO_JOB_DESCRIPTION
  );
  sampleJob.minimumExperienceYears = 3;

  assert(
    sampleJob.requiredSkills.some((requirement) => requirement.name === "Docker") &&
      !sampleJob.preferredSkills.some(
        (requirement) => requirement.name === "Docker"
      ),
    "Keeps Docker required when only a nearby Redis line is preferred"
  );
  assert(
    sampleJob.requiredSkills.some(
      (requirement) => requirement.name === "FastAPI"
    ) &&
      sampleJob.preferredSkills.some(
        (requirement) => requirement.name === "Django"
      ),
    "Treats the later skill in 'FastAPI or Django' as an alternative"
  );
  assert(
    sampleJob.preferredSkills.some((requirement) => requirement.name === "Redis"),
    "Detects Redis as a preferred requirement"
  );
  assert(
    sampleJob.educationRequirements.length === 0,
    "Does not invent an education requirement"
  );

  const sampleRequirements = structuredJobToRequirements(sampleJob, {
    id: "job-demo",
    title: "Python Backend Developer",
    department: "Core Engineering",
    location: "Kathmandu / Remote",
    rawDescription: DEMO_JOB_DESCRIPTION,
  });

  const sampleResults = [];
  for (let index = 0; index < DEMO_RESUME_POOL.length; index++) {
    const sample = DEMO_RESUME_POOL[index];
    sampleResults.push(
      await screenCandidateText({
        candidateId: `cand-demo-${index + 1}`,
        name: sample.name,
        text: sample.text,
        requirements: sampleRequirements,
      })
    );
  }

  assert(
    sampleResults.length === DEMO_RESUME_POOL.length,
    "Screens every sample resume"
  );
  assert(
    sampleResults.every((result) =>
      result.matches.some((match) => match.matched)
    ),
    "Every sample candidate has at least one cited match"
  );
  assert(
    sampleResults.some((result) => result.status === "Strong Match"),
    "Sample set produces at least one strong match"
  );
  assert(
    sampleResults.some((result) => result.status === "Needs Verification"),
    "Sample set produces at least one needs-verification candidate"
  );
  assert(
    sampleResults.every(
      (result) => (result.extractionConfidence ?? 0) >= 0.6
    ),
    "Sample extractions retain usable confidence"
  );

  console.log(`\n================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
