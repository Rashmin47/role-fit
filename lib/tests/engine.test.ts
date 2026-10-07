/**
 * Nirman Core Logic Automated Test Suite
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
import { evaluateCandidateMatch } from "../matching";
import { determineCandidateRouting } from "../routing";
import { validateJobRequirementsOutput } from "../ai/schemas";

function runTests() {
  console.log("🧪 Running Nirman Engine Automated Test Suite...\n");
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

  console.log(`\n================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
