/**
 * Role Fit Core Logic Automated Test Suite (Vitest)
 * Validates normalization, deterministic scoring, matching, routing, AI schema validation,
 * server extraction boundary, end-to-end sample screening, batch screening, and score-bound properties.
 */

import { describe, it, expect } from "vitest";
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
import { processCandidateForBatch } from "../batch";
import { ExtractionError } from "../ai/server-extraction";
import { validateCreateBatchScreeningInput } from "../api/screening-contract";
import {
  extractCandidateProfileOnServer,
  extractJobRequirementsOnServer,
} from "../ai/server-extraction";
import { screenCandidateText } from "../screening/screen-candidate";
import {
  scoreCandidateProfile,
  structuredJobToRequirements,
} from "../screening/score-candidate";
import {
  evaluateRequirementMatch,
  evaluateCandidateMatch,
} from "../matching";
import { calculateExperienceFromDates } from "../normalization/experience";
import {
  DEMO_JOB_DESCRIPTION,
  DEMO_RESUME_POOL,
} from "../data/demo-resumes";
import type { CandidateProfile, JobRequirements } from "@/types";

describe("1. Skill Normalization & Aliases", () => {
  it("normalizes 'fast-api' to 'FastAPI'", () => {
    expect(normalizeSkillName("fast-api")).toBe("FastAPI");
  });

  it("normalizes 'postgres' to 'PostgreSQL'", () => {
    expect(normalizeSkillName("postgres")).toBe("PostgreSQL");
  });

  it("normalizes 'psql' to 'PostgreSQL'", () => {
    expect(normalizeSkillName("psql")).toBe("PostgreSQL");
  });

  it("normalizes 'py' to 'Python'", () => {
    expect(normalizeSkillName("py")).toBe("Python");
  });

  it("normalizes 'k8s' to 'Kubernetes'", () => {
    expect(normalizeSkillName("k8s")).toBe("Kubernetes");
  });

  it("matches case-insensitive variations", () => {
    expect(matchSkills("fastapi", "FastAPI")).toBe(true);
  });

  it("fallback title cases unknown tokens", () => {
    expect(normalizeSkillName("unknown tech tool")).toBe("Unknown Tech Tool");
  });
});

describe("2. Deterministic Scoring Logic", () => {
  const testCandidate: CandidateProfile = {
    name: "Sanjay Thapa",
    totalExperienceYears: 2.4,
    skills: [
      { name: "Python", level: "Strong" },
      { name: "FastAPI", level: "Working knowledge" },
      { name: "PostgreSQL", level: "Strong" },
      { name: "Docker", level: "Working knowledge" },
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

  const testJobReqs: JobRequirements = {
    id: "job-01",
    title: "Python Backend Developer",
    rawDescription: "Role description",
    minimumExperienceYears: 3.0,
    requiredSkills: [
      { id: "req-1", name: "Python", type: "required_skill" },
      { id: "req-2", name: "FastAPI", type: "required_skill" },
      { id: "req-3", name: "PostgreSQL", type: "required_skill" },
      { id: "req-4", name: "Docker", type: "required_skill" },
    ],
    preferredSkills: [
      { id: "pref-1", name: "Redis", type: "preferred_skill" },
    ],
    responsibilities: ["Build backend APIs"],
  };

  it("calculates full 50pts when all 4 required skills are present", () => {
    const skillScore = calculateSkillScore(testCandidate, testJobReqs.requiredSkills, 50);
    expect(skillScore.score).toBe(50);
  });

  it("correctly identifies zero missing required skills", () => {
    const skillScore = calculateSkillScore(testCandidate, testJobReqs.requiredSkills, 50);
    expect(skillScore.missing.length).toBe(0);
  });

  it("gives full 25pts when experience meets threshold (4.0 >= 3.0)", () => {
    const expScoreMet = calculateExperienceScore(4.0, 3.0, 25);
    expect(expScoreMet.score).toBe(25);
    expect(expScoreMet.match.matched).toBe(true);
  });

  it("pro-rates experience score when under requirement (2.4 < 3.0)", () => {
    const expScoreUnder = calculateExperienceScore(2.4, 3.0, 25);
    expect(expScoreUnder.score).toBe(20);
    expect(expScoreUnder.match.matched).toBe(false);
  });

  it("gives zero preferred points when optional Redis is missing", () => {
    const prefScore = calculatePreferredSkillScore(testCandidate, testJobReqs.preferredSkills, 15);
    expect(prefScore.score).toBe(0);
  });

  it("calculates evidence score (6pts) from structured work history and degree", () => {
    const evidenceScore = calculateEvidenceScore(testCandidate, 10);
    expect(evidenceScore.score).toBe(6);
  });

  it("calculates accurate composite total match score (76%) anchor", () => {
    const finalMatch = calculateFinalMatchScore(testCandidate, testJobReqs, DEFAULT_SCORING_WEIGHTS);
    expect(finalMatch.totalScore).toBe(76);
  });

  it("assigns 'Review' status due to 2.4y < 3.0y experience", () => {
    const finalMatch = calculateFinalMatchScore(testCandidate, testJobReqs, DEFAULT_SCORING_WEIGHTS);
    expect(finalMatch.status).toBe("Review");
  });
});

describe("3. Decision & Routing Engine", () => {
  it("routes candidate with 92% and 0 gaps to STRONG_MATCH", () => {
    const strongDecision = determineCandidateRouting(92, 0, 4.5, 3.0);
    expect(strongDecision.state).toBe("STRONG_MATCH");
  });

  it("routes candidate with minor gaps to REVIEW queue", () => {
    const reviewDecision = determineCandidateRouting(78, 1, 2.4, 3.0);
    expect(reviewDecision.state).toBe("REVIEW");
  });

  it("routes candidate with multiple gaps to NEEDS_VERIFICATION", () => {
    const verifyDecision = determineCandidateRouting(45, 3, 1.0, 3.0);
    expect(verifyDecision.state).toBe("NEEDS_VERIFICATION");
  });
});

describe("4. AI Output Schema Validation", () => {
  it("validates compliant AI extraction JSON", () => {
    const validAIJson = {
      title: "Backend Engineer",
      minimumExperienceYears: 3,
      requiredSkills: [{ name: "Python", importance: "required" }, { name: "PostgreSQL", importance: "required" }],
      preferredSkills: [{ name: "Redis", importance: "preferred" }],
      responsibilities: ["Develop APIs"],
    };
    const validRes = validateJobRequirementsOutput(validAIJson);
    expect(validRes.valid).toBe(true);
  });

  it("preserves extracted requirement arrays", () => {
    const validAIJson = {
      title: "Backend Engineer",
      minimumExperienceYears: 3,
      requiredSkills: [{ name: "Python", importance: "required" }, { name: "PostgreSQL", importance: "required" }],
      preferredSkills: [{ name: "Redis", importance: "preferred" }],
      responsibilities: ["Develop APIs"],
    };
    const validRes = validateJobRequirementsOutput(validAIJson);
    expect(validRes.data?.requiredSkills.length).toBe(2);
  });

  it("rejects malformed AI output without requirements", () => {
    const malformedJson = { somethingElse: true };
    const malformedRes = validateJobRequirementsOutput(malformedJson);
    expect(malformedRes.valid).toBe(false);
  });
});

describe("5. Candidate Validation & Resume Heuristics", () => {
  it("rejects non-object candidate output", () => {
    const rejectedCandidate = validateCandidateProfileOutput("not-an-object");
    expect(rejectedCandidate.valid).toBe(false);
  });

  it("repairs negative candidate experience to zero", () => {
    const repairedCandidate = validateCandidateProfileOutput({
      name: "Jane Doe",
      totalExperienceYears: -2,
      skills: "Python",
      experience: "not-an-array",
      confidence: 1.6,
    });
    expect(repairedCandidate.valid).toBe(true);
    expect(repairedCandidate.data?.totalExperienceYears).toBe(0);
  });

  it("repairs non-array skills and experience instead of crashing", () => {
    const repairedCandidate = validateCandidateProfileOutput({
      name: "Jane Doe",
      totalExperienceYears: -2,
      skills: "Python",
      experience: "not-an-array",
      confidence: 1.6,
    });
    expect(repairedCandidate.data?.skills.length).toBe(0);
    expect(repairedCandidate.data?.experience.length).toBe(0);
  });

  it("clamps out-of-range extraction confidence", () => {
    const repairedCandidate = validateCandidateProfileOutput({
      name: "Jane Doe",
      totalExperienceYears: -2,
      skills: "Python",
      experience: "not-an-array",
      confidence: 1.6,
    });
    expect(repairedCandidate.data?.confidence).toBe(1);
  });

  it("reports a warning for malformed skills", () => {
    const repairedCandidate = validateCandidateProfileOutput({
      name: "Jane Doe",
      totalExperienceYears: -2,
      skills: "Python",
      experience: "not-an-array",
      confidence: 1.6,
    });
    expect(repairedCandidate.warnings?.some((warning) => warning.includes("Skills were not an array"))).toBe(true);
  });

  it("accepts both string and object skill entries", () => {
    const stringSkillCandidate = validateCandidateProfileOutput({
      name: "Alex Kim",
      totalExperienceYears: 2,
      skills: ["Python", { name: "PostgreSQL", level: "Expert" }],
    });
    expect(stringSkillCandidate.data?.skills.length).toBe(2);
  });

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

  it("extracts the candidate name from the resume", () => {
    expect(extracted.name).toBe("Jane Doe");
  });

  it("prefers an explicit experience statement", () => {
    expect(extracted.totalExperienceYears).toBe(5);
  });

  it("extracts skills with an evidence line", () => {
    expect(extracted.skills.some((skill) => skill.name === "Python")).toBe(true);
    expect(extracted.skills.every((skill) => Boolean(skill.evidenceSnippet))).toBe(true);
  });

  it("pairs a dated role with its company and title", () => {
    expect(extracted.experience[0]?.company).toBe("Acme Corp");
    expect(extracted.experience[0]?.title).toBe("Senior Backend Engineer");
  });

  it("extracts education without inventing an institution", () => {
    expect(extracted.education[0]?.institution).toBe("Example University");
    expect(extracted.education[0]?.graduationYear).toBe(2019);
  });

  it("does not fabricate the old demo employer or university", () => {
    expect(extracted.experience.some((entry) => entry.company === "Tech Systems")).toBe(false);
    expect(extracted.education.some((entry) => entry.institution.includes("Tribhuvan"))).toBe(false);
  });

  it("falls back to the resume text when the filename is generic", () => {
    const genericFilename = extractCandidateHeuristics(resumeText, "resume_final_v2.pdf");
    expect(genericFilename.name).toBe("Jane Doe");
  });

  it("uses a specific filename as a name hint", () => {
    const hintedFilename = extractCandidateHeuristics(resumeText, "jane_doe_resume.pdf");
    expect(hintedFilename.name).toBe("Jane Doe");
  });

  it("leaves unverifiable experience and education empty", () => {
    const sparse = extractCandidateHeuristics("Alex Kim\nPython developer", "Alex Kim");
    expect(sparse.totalExperienceYears).toBe(0);
    expect(sparse.experience.length).toBe(0);
    expect(sparse.education.length).toBe(0);
  });
});

describe("6. Server Extraction Boundary", () => {
  it("server job extraction returns validated requirements and warnings", async () => {
    const serverJob = await extractJobRequirementsOnServer(
      "Python Backend Developer",
      DEMO_JOB_DESCRIPTION
    );
    expect(serverJob.requirements.requiredSkills.length).toBeGreaterThan(0);
    expect(serverJob.provider.fallbackUsed).toBe(false);
    expect(Array.isArray(serverJob.warnings)).toBe(true);
  });

  it("server job extraction does not invent skills for generic text", async () => {
    const emptyJob = await extractJobRequirementsOnServer(
      "Support Engineer",
      "We are hiring a motivated person to join our team."
    );
    expect(emptyJob.requirements.requiredSkills.length).toBe(0);
    expect(emptyJob.requirements.preferredSkills.length).toBe(0);
    expect(emptyJob.warnings).toContain("No technical requirements extracted from text");
  });

  it("server candidate extraction returns a validated profile", async () => {
    const serverCandidate = await extractCandidateProfileOnServer(
      DEMO_RESUME_POOL[0].text,
      DEMO_RESUME_POOL[0].name
    );
    expect(serverCandidate.profile.name.length).toBeGreaterThan(0);
    expect(serverCandidate.profile.skills.length).toBeGreaterThan(0);
  });

  it("score profile produces deterministic cited matches", async () => {
    const serverJob = await extractJobRequirementsOnServer(
      "Python Backend Developer",
      DEMO_JOB_DESCRIPTION
    );
    serverJob.requirements.minimumExperienceYears = 3;
    const serverCandidate = await extractCandidateProfileOnServer(
      DEMO_RESUME_POOL[0].text,
      DEMO_RESUME_POOL[0].name
    );
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const serverScored = scoreCandidateProfile({
      candidateId: "cand-server-demo",
      profile: serverCandidate.profile,
      requirements: serverRequirements,
      warnings: serverCandidate.warnings,
    });
    expect(serverScored.totalScore).toBeGreaterThan(0);
    expect(serverScored.matches.some((match) => match.matched)).toBe(true);
  });
});

describe("7. End-to-End Sample Screening", () => {
  it("extracts expected requirement structure from demo job description", async () => {
    const provider = new MockAIProvider();
    const sampleJob = await provider.extractJobRequirements(
      "Python Backend Developer",
      DEMO_JOB_DESCRIPTION
    );
    sampleJob.minimumExperienceYears = 3;

    expect(sampleJob.requiredSkills.some((req) => req.name === "Docker")).toBe(true);
    expect(sampleJob.preferredSkills.some((req) => req.name === "Docker")).toBe(false);
    expect(sampleJob.requiredSkills.some((req) => req.name === "FastAPI")).toBe(true);
    expect(sampleJob.preferredSkills.some((req) => req.name === "Django")).toBe(true);
    expect(sampleJob.preferredSkills.some((req) => req.name === "Redis")).toBe(true);
    expect(sampleJob.educationRequirements.length).toBe(0);
  });

  it("screens every sample resume and verifies distributions and confidence", async () => {
    const provider = new MockAIProvider();
    const sampleJob = await provider.extractJobRequirements(
      "Python Backend Developer",
      DEMO_JOB_DESCRIPTION
    );
    sampleJob.minimumExperienceYears = 3;

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

    expect(sampleResults.length).toBe(DEMO_RESUME_POOL.length);
    expect(sampleResults.every((result) => result.matches.some((match) => match.matched))).toBe(true);
    expect(sampleResults.some((result) => result.status === "Strong Match")).toBe(true);
    expect(sampleResults.some((result) => result.status === "Needs Verification")).toBe(true);
    expect(sampleResults.every((result) => (result.extractionConfidence ?? 0) >= 0.6)).toBe(true);
  });
});

describe("8. Batch Screening", () => {
  it("scores identical facts identically across single and batch screening", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    serverJob.requirements.minimumExperienceYears = 3;
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const serverCandidate = await extractCandidateProfileOnServer(DEMO_RESUME_POOL[0].text, DEMO_RESUME_POOL[0].name);
    const serverScored = scoreCandidateProfile({
      candidateId: "batch-test",
      profile: serverCandidate.profile,
      requirements: serverRequirements,
    });

    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchArgs = { candidateId: "batch-test", source, requirements: serverRequirements, providerConfig: { provider: "mock" as const } };
    const batchResult = await processCandidateForBatch(batchArgs);

    expect(batchResult.status).toBe("completed");
    expect(batchResult.result?.totalScore).toBe(serverScored.totalScore);
    expect(batchResult.result?.matches.some((match) => match.matched)).toBe(true);
  });

  it("retries a transient extraction failure once", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const serverCandidate = await extractCandidateProfileOnServer(DEMO_RESUME_POOL[0].text, DEMO_RESUME_POOL[0].name);
    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchArgs = { candidateId: "batch-test", source, requirements: serverRequirements, providerConfig: { provider: "mock" as const } };

    let attempts = 0;
    const retried = await processCandidateForBatch({
      ...batchArgs,
      extract: async () => {
        attempts++;
        if (attempts === 1) throw new ExtractionError("Temporary failure", "provider");
        return serverCandidate;
      },
    });
    expect(retried.status).toBe("completed");
    expect(retried.attempts).toBe(2);
  });

  it("caps transient retries and returns an isolated failure", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchArgs = { candidateId: "batch-test", source, requirements: serverRequirements, providerConfig: { provider: "mock" as const } };

    let attempts = 0;
    const failedBatch = await processCandidateForBatch({
      ...batchArgs,
      extract: async () => {
        attempts++;
        throw new ExtractionError("Unavailable", "provider");
      },
    });
    expect(failedBatch.status).toBe("failed");
    expect(attempts).toBe(2);
  });

  it("does not retry deterministic validation failures", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchArgs = { candidateId: "batch-test", source, requirements: serverRequirements, providerConfig: { provider: "mock" as const } };

    let attempts = 0;
    const invalidBatch = await processCandidateForBatch({
      ...batchArgs,
      extract: async () => {
        attempts++;
        throw new ExtractionError("Malformed profile", "validation");
      },
    });
    expect(invalidBatch.status).toBe("failed");
    expect(attempts).toBe(1);
  });

  it("rejects short text without calling a provider", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    const serverRequirements = structuredJobToRequirements(serverJob.requirements, {
      id: "job-server-demo",
      title: "Python Backend Developer",
      department: "Core Engineering",
      location: "Kathmandu / Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
    });
    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchArgs = { candidateId: "batch-test", source, requirements: serverRequirements, providerConfig: { provider: "mock" as const } };

    const shortBatch = await processCandidateForBatch({ ...batchArgs, source: { ...source, text: "tiny" } });
    expect(shortBatch.status).toBe("failed");
    expect(shortBatch.provider.name).toBe("none");
  });

  it("validates batch input schema bounds and flags", async () => {
    const serverJob = await extractJobRequirementsOnServer("Python Backend Developer", DEMO_JOB_DESCRIPTION);
    const source = { index: 0, name: DEMO_RESUME_POOL[0].name, sourceName: "resume.txt", text: DEMO_RESUME_POOL[0].text };
    const batchPayload = {
      title: "Batch test",
      department: "Engineering",
      location: "Remote",
      rawDescription: DEMO_JOB_DESCRIPTION,
      requirements: serverJob.requirements,
      candidates: [source],
      isSample: true,
    };

    expect(validateCreateBatchScreeningInput(batchPayload).value?.isSample).toBe(true);
    expect(validateCreateBatchScreeningInput({ ...batchPayload, candidates: Array(201).fill(source) }).valid).toBe(false);
    expect(
      validateCreateBatchScreeningInput({
        ...batchPayload,
        weights: { requiredSkills: 99, experience: 0, preferredSkills: 0, evidenceQuality: 0 },
      }).valid
    ).toBe(false);
    expect(
      validateCreateBatchScreeningInput({ ...batchPayload, candidates: [{ ...source, text: "tiny" }] }).valid
    ).toBe(true);
  });
});

describe("9. Score Property Invariants", () => {
  const dummyJob: JobRequirements = {
    id: "job-property",
    title: "Test Job",
    rawDescription: "Testing properties",
    minimumExperienceYears: 3.0,
    requiredSkills: [
      { id: "r1", name: "Python", type: "required_skill" },
      { id: "r2", name: "PostgreSQL", type: "required_skill" },
    ],
    preferredSkills: [
      { id: "p1", name: "Redis", type: "preferred_skill" },
    ],
    responsibilities: [],
  };

  it("guarantees 0 <= totalScore <= 100 for all candidate configurations", () => {
    const testCases: CandidateProfile[] = [
      // Empty candidate
      { name: "Zero", totalExperienceYears: 0, skills: [], experience: [], education: [] },
      // Negative years
      { name: "Negative", totalExperienceYears: -5, skills: [], experience: [], education: [] },
      // Extremely large years (100 years)
      {
        name: "Max Exp",
        totalExperienceYears: 100,
        skills: [{ name: "Python" }, { name: "PostgreSQL" }, { name: "Redis" }],
        experience: [{ company: "Old Corp", title: "Dev", years: 40, description: "Python", technologies: ["Python"] }],
        education: [{ institution: "College", degree: "BS", field: "CS" }],
      },
      // Non-matching skills
      {
        name: "Irrelevant",
        totalExperienceYears: 10,
        skills: [{ name: "Ruby" }, { name: "Cobol" }],
        experience: [],
        education: [],
      },
    ];

    for (const cand of testCases) {
      const score = calculateFinalMatchScore(cand, dummyJob, DEFAULT_SCORING_WEIGHTS);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
      expect(Number.isFinite(score.totalScore)).toBe(true);
      expect(Number.isNaN(score.totalScore)).toBe(false);
      expect(score.skillScore + score.experienceScore + score.preferredScore + score.evidenceScore).toBeGreaterThanOrEqual(score.totalScore);
    }
  });

  it("guarantees 0 <= totalScore <= 100 across custom valid weights", () => {
    const candidate: CandidateProfile = {
      name: "Varied Candidate",
      totalExperienceYears: 5,
      skills: [{ name: "Python" }],
      experience: [{ company: "Co", title: "Role", years: 5, description: "Python", technologies: ["Python"] }],
      education: [],
    };

    const weightSets = [
      { requiredSkills: 70, experience: 10, preferredSkills: 10, evidenceQuality: 10 },
      { requiredSkills: 25, experience: 25, preferredSkills: 25, evidenceQuality: 25 },
      { requiredSkills: 100, experience: 0, preferredSkills: 0, evidenceQuality: 0 },
      { requiredSkills: 0, experience: 100, preferredSkills: 0, evidenceQuality: 0 },
      { requiredSkills: 0, experience: 0, preferredSkills: 100, evidenceQuality: 0 },
      { requiredSkills: 0, experience: 0, preferredSkills: 0, evidenceQuality: 100 },
    ];

    for (const weights of weightSets) {
      const score = calculateFinalMatchScore(candidate, dummyJob, weights);
      expect(score.totalScore).toBeGreaterThanOrEqual(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    }
  });
});

describe("10. Consolidated Matching & Depth Semantics", () => {
  const reqPython: JobRequirements["requiredSkills"][0] = {
    id: "req-py",
    name: "Python",
    type: "required_skill",
  };
  const prefRedis: JobRequirements["preferredSkills"][0] = {
    id: "pref-redis",
    name: "Redis",
    type: "preferred_skill",
  };

  it("identifies 'Strong' and 'Expert' levels as MATCH with full depth", () => {
    const candidateStrong: CandidateProfile = {
      name: "Strong Dev",
      totalExperienceYears: 3,
      skills: [{ name: "Python", level: "Strong" }],
      experience: [],
      education: [],
    };
    const matchStrong = evaluateRequirementMatch(candidateStrong, reqPython);
    expect(matchStrong.status).toBe("MATCH");
    expect(matchStrong.candidateStatedValue).toBe("Strong");

    const candidateExpert: CandidateProfile = {
      name: "Expert Dev",
      totalExperienceYears: 5,
      skills: [{ name: "Python", level: "Expert" }],
      experience: [],
      education: [],
    };
    const matchExpert = evaluateRequirementMatch(candidateExpert, reqPython);
    expect(matchExpert.status).toBe("MATCH");
    expect(matchExpert.candidateStatedValue).toBe("Expert");
  });

  it("marks 'Basic' and 'Working knowledge' as PARTIAL depth when absent from work history", () => {
    const candidateBasic: CandidateProfile = {
      name: "Basic Dev",
      totalExperienceYears: 1,
      skills: [{ name: "Python", level: "Basic" }],
      experience: [],
      education: [],
    };
    const matchBasic = evaluateRequirementMatch(candidateBasic, reqPython);
    expect(matchBasic.status).toBe("PARTIAL");
    expect(matchBasic.candidateStatedValue).toBe("Basic");

    // But under our non-penalizing depth invariant, PARTIAL still awards points in scoring
    const skillScore = calculateSkillScore(candidateBasic, [reqPython], 50);
    expect(skillScore.score).toBe(50);
    expect(skillScore.matches[0].matched).toBe(true);
  });

  it("promotes 'Basic' depth to MATCH when backed by practical work experience", () => {
    const candidateWithWork: CandidateProfile = {
      name: "Work Dev",
      totalExperienceYears: 2,
      skills: [{ name: "Python", level: "Basic" }],
      experience: [
        {
          company: "Cloud Corp",
          title: "Backend Dev",
          startDate: "2022-01",
          endDate: "2024-01",
          years: 2,
          description: "Engineered scalable Python APIs.",
          technologies: ["Python"],
        },
      ],
      education: [],
    };
    const match = evaluateRequirementMatch(candidateWithWork, reqPython);
    expect(match.status).toBe("MATCH");
    expect(match.candidateStatedValue).toBe("Basic");
    expect(match.evidenceSnippet).toContain("Cloud Corp");
  });

  it("finds evidence in project technologies when absent from skills and roles", () => {
    const candidateProject: CandidateProfile = {
      name: "Project Dev",
      totalExperienceYears: 1,
      skills: [],
      experience: [],
      education: [],
      projects: [
        {
          name: "Open-Source Redis Cache",
          description: "Implemented custom Redis caching module.",
          technologies: ["Redis"],
        },
      ],
    };
    const matchPref = evaluateRequirementMatch(candidateProject, prefRedis);
    expect(matchPref.status).toBe("MATCH");
    expect(matchPref.evidenceSnippet).toContain("Open-Source Redis Cache");
  });

  it("evaluates a full candidate against a job profile with unified matching", () => {
    const candidate: CandidateProfile = {
      name: "Full Dev",
      totalExperienceYears: 3,
      skills: [{ name: "Python", level: "Strong" }],
      experience: [],
      education: [],
    };
    const job: JobRequirements = {
      id: "j1",
      title: "Backend Dev",
      rawDescription: "",
      minimumExperienceYears: 2,
      requiredSkills: [reqPython],
      preferredSkills: [prefRedis],
      responsibilities: [],
    };
    const result = evaluateCandidateMatch(candidate, job);
    expect(result.matchedRequirements.length).toBe(1);
    expect(result.missingRequirements.length).toBe(1);
    expect(result.experienceMet).toBe(true);
  });
});

describe("11. Experience Calculation from Dates", () => {
  const asOf = new Date("2025-06-01T00:00:00Z");

  it("calculates experience from YYYY-MM dates", () => {
    const experience = [
      {
        company: "A Corp",
        title: "Engineer",
        startDate: "2023-01",
        endDate: "2024-12",
        years: 2,
        description: "",
        technologies: [],
      },
    ];
    const result = calculateExperienceFromDates(experience, 2, { asOf });
    expect(result.calculatedYears).toBe(2);
    expect(result.totalMonths).toBe(24);
    expect(result.hasOverlaps).toBe(false);
  });

  it("deduplicates overlapping concurrent positions", () => {
    const overlappingExperience = [
      {
        company: "Company Primary",
        title: "Full-Time Dev",
        startDate: "2021-01",
        endDate: "2022-12", // 24 months (Jan 2021 - Dec 2022)
        years: 2,
        description: "",
        technologies: [],
      },
      {
        company: "Startup Co",
        title: "Contractor",
        startDate: "2022-06",
        endDate: "2023-06", // 13 months (Jun 2022 - Jun 2023), 7 months overlap with Primary
        years: 1,
        description: "",
        technologies: [],
      },
    ];

    // Raw sum = 24 + 13 = 37 months (3.1y)
    // Merged span = Jan 2021 to Jun 2023 = 30 months (2.5y)
    const result = calculateExperienceFromDates(overlappingExperience, 2.5, { asOf });
    expect(result.hasOverlaps).toBe(true);
    expect(result.calculatedYears).toBe(2.5);
    expect(result.totalMonths).toBe(30);
    expect(result.rawMonthsWithoutDedupe).toBe(37);
    expect(result.overlappingMonths).toBe(7);
  });

  it("correctly handles gaps between employment roles", () => {
    const gappedExperience = [
      {
        company: "Role 1",
        title: "Junior",
        startDate: "2020-01",
        endDate: "2020-12", // 12 months
        years: 1,
        description: "",
        technologies: [],
      },
      // 1 year gap in 2021
      {
        company: "Role 2",
        title: "Mid",
        startDate: "2022-01",
        endDate: "2022-12", // 12 months
        years: 1,
        description: "",
        technologies: [],
      },
    ];

    const result = calculateExperienceFromDates(gappedExperience, 2.0, { asOf });
    expect(result.calculatedYears).toBe(2.0);
    expect(result.totalMonths).toBe(24);
    expect(result.hasOverlaps).toBe(false);
  });

  it("computes current/present roles relative to asOf date", () => {
    const currentExperience = [
      {
        company: "Current Corp",
        title: "Senior Dev",
        startDate: "2024-01",
        endDate: "Present",
        isCurrent: true,
        years: 1.5,
        description: "",
        technologies: [],
      },
    ];

    // From Jan 2024 through Jun 2025 (asOf is June 2025) = 18 months = 1.5 years
    const result = calculateExperienceFromDates(currentExperience, 1.5, { asOf });
    expect(result.hasCurrentRole).toBe(true);
    expect(result.calculatedYears).toBe(1.5);
    expect(result.totalMonths).toBe(18);
  });

  it("detects and flags significant discrepancies (> 6 months) between stated and calculated years", () => {
    const experience = [
      {
        company: "One Year Corp",
        title: "Dev",
        startDate: "2022-01",
        endDate: "2022-12",
        years: 1,
        description: "",
        technologies: [],
      },
    ];

    // Stated 4 years, but timeline only has 1 year -> 3.0 year discrepancy
    const result = calculateExperienceFromDates(experience, 4.0, { asOf });
    expect(result.discrepancy?.isSignificant).toBe(true);
    expect(result.discrepancy?.differenceYears).toBe(3.0);
    expect(result.discrepancy?.note).toContain("differs from calculated work timeline");
  });
});
