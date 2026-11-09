/**
 * Server-only repository for persisted screenings.
 *
 * The deterministic engine runs here, not in the browser. A screening is
 * stored as a Job, Requirement rows, Candidate facts, and CandidateMatch
 * results; every score can be recomputed from the stored validated profile.
 */

import { randomUUID } from "node:crypto";
import type { BatchCandidateOutcome } from "@/lib/batch";
import type { Prisma } from "@/prisma/generated/client";
import { prisma } from "@/lib/db/prisma";
import type { CandidateProfile, StructuredJobRequirements } from "@/lib/ai/schemas";
import type {
  BatchCandidateStatus,
  BatchScreeningRunSummary,
  CandidateDecisionInput,
  CreateBatchScreeningInput,
  CreateScreeningInput,
  CreateScreeningResult,
} from "@/lib/api/screening-contract";
import { calculateFinalMatchScore } from "@/lib/scoring";
import {
  scoreCandidateProfile,
  structuredJobToRequirements,
} from "@/lib/screening/score-candidate";
import type {
  CandidateScoreResult,
  DecisionStatus,
  JobRequirement,
  JobRequirements,
  JobScreening,
  MatchStatus,
  ScoringWeights,
  SkillGap,
  MatchEvidence,
} from "@/types";

if (typeof window !== "undefined") {
  throw new Error(
    "The screening repository is server-only. Use /api/screenings instead."
  );
}

const screeningInclude = {
  requirements: { orderBy: { orderIndex: "asc" } },
  candidateMatches: {
    include: { candidate: true },
    orderBy: { totalScore: "desc" },
  },
  scoringRuns: { orderBy: { executedAt: "desc" }, take: 1 },
} as const satisfies Prisma.JobInclude;

type ScreeningRow = Prisma.JobGetPayload<{
  include: typeof screeningInclude;
}>;

type MatchRow = ScreeningRow["candidateMatches"][number];

export class ScreeningNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScreeningNotFoundError";
  }
}

export class RecomputeError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "RecomputeError";
    this.details = details;
  }
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function requirementToPresentation(
  requirement: ScreeningRow["requirements"][number]
): JobRequirement {
  const type =
    requirement.type === "education"
      ? "education"
      : requirement.type === "experience"
      ? "experience"
      : requirement.type === "domain"
      ? "domain"
      : requirement.importance === "preferred"
      ? "preferred_skill"
      : "required_skill";

  return {
    id: requirement.id,
    name: requirement.name,
    type,
    description: requirement.description ?? undefined,
    minimumYears: requirement.minimumYears ?? undefined,
    weight: requirement.weight,
  };
}

function rowToRequirements(row: ScreeningRow): JobRequirements {
  const requiredSkills: JobRequirement[] = [];
  const preferredSkills: JobRequirement[] = [];
  const educationRequirements: JobRequirement[] = [];

  for (const requirement of row.requirements) {
    // Certifications and domain notes are stored for audit but are not part
    // of the scored requirement shape. Skipping them keeps recomputation
    // identical to the original deterministic scoring pass.
    if (requirement.type === "certification" || requirement.type === "domain") {
      continue;
    }

    const mapped = requirementToPresentation(requirement);
    if (requirement.type === "education") {
      educationRequirements.push(mapped);
    } else if (requirement.importance === "preferred") {
      preferredSkills.push(mapped);
    } else {
      requiredSkills.push(mapped);
    }
  }

  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    rawDescription: row.rawDescription,
    minimumExperienceYears: row.minimumExperienceYears,
    requiredSkills,
    preferredSkills,
    educationRequirements,
    responsibilities: parseJson<string[]>(row.responsibilitiesJson, []),
  };
}

function matchToCandidateScore(match: MatchRow): CandidateScoreResult {
  return {
    candidateId: match.candidateId,
    candidateName: match.candidate.name,
    totalScore: match.totalScore,
    skillScore: match.skillScore,
    maxSkillScore: match.maxSkillScore,
    experienceScore: match.experienceScore,
    maxExperienceScore: match.maxExperienceScore,
    preferredScore: match.preferredScore,
    maxPreferredScore: match.maxPreferredScore,
    evidenceScore: match.evidenceScore,
    maxEvidenceScore: match.maxEvidenceScore,
    calculatedExperienceYears: match.calculatedExperienceYears,
    requiredExperienceYears: match.requiredExperienceYears,
    status: match.status as MatchStatus,
    decision: match.decision as DecisionStatus,
    extractionConfidence: match.extractionConfidence ?? undefined,
    extractionWarnings:
      parseJson<string[]>(match.extractionWarningsJson, []).length > 0
        ? parseJson<string[]>(match.extractionWarningsJson, [])
        : undefined,
    reviewNotes: match.reviewNotes ?? undefined,
    reviewedAt: match.reviewedAt?.toISOString(),
    matches: parseJson<MatchEvidence[]>(match.matchesJson, []),
    gaps: parseJson<SkillGap[]>(match.gapsJson, []),
    scoringWeights: parseJson<ScoringWeights>(match.weightsJson, {
      requiredSkills: 50,
      experience: 25,
      preferredSkills: 15,
      evidenceQuality: 10,
    }),
    calculatedAt: match.createdAt.toISOString(),
  };
}

function rowToScreening(row: ScreeningRow): JobScreening {
  const candidates = row.candidateMatches.map(matchToCandidateScore);
  const reviewedCount = candidates.filter(
    (candidate) => candidate.decision !== "pending"
  ).length;
  const shortlistedCount = candidates.filter(
    (candidate) => candidate.decision === "shortlisted"
  ).length;

  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    createdAt: row.createdAt.toISOString(),
    status: row.status as JobScreening["status"],
    candidateCount: candidates.length,
    reviewedCount,
    shortlistedCount,
    requirements: rowToRequirements(row),
    candidates,
    isSample: row.isSample || undefined,
    processingNotes:
      parseJson<string[]>(row.processingNotesJson, []).length > 0
        ? parseJson<string[]>(row.processingNotesJson, [])
        : undefined,
  };
}

export async function listScreenings(): Promise<JobScreening[]> {
  const rows = await prisma.job.findMany({
    include: screeningInclude,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(rowToScreening);
}

export async function beginBatchScreening(input: CreateBatchScreeningInput, provider: string, model?: string) {
  const id = `screening-${randomUUID()}`;
  const structured = prefixStructuredRequirements(input.requirements, `${id}-`);
  const run = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({ where: { slug: "apex-engineering" } });
    await tx.job.create({ data: {
      id, title: input.title, department: input.department, location: input.location,
      rawDescription: input.rawDescription, status: "extracting", isSample: input.isSample === true,
      minimumExperienceYears: structured.minimumExperienceYears,
      summary: structured.summary, responsibilitiesJson: JSON.stringify(structured.responsibilities),
      processingNotesJson: JSON.stringify(input.processingNotes ?? []), organizationId: organization?.id,
    } });
    for (const data of requirementRows(id, structured)) await tx.requirement.create({ data });
    return tx.scoringRun.create({ data: {
      jobId: id, candidatesCount: input.candidates.length, status: "PROCESSING",
      provider, model, weightsJson: JSON.stringify(input.weights),
      processingJobs: { create: input.candidates.map((source, candidateIndex) => ({
        candidateIndex, candidateName: source.name, sourceName: source.sourceName,
      })) },
    }, include: { processingJobs: { orderBy: { candidateIndex: "asc" } } } });
  });
  return { run, requirements: structuredJobToRequirements(structured, { id, ...input }) };
}

export async function markBatchCandidateProcessing(id: string) {
  await prisma.candidateProcessingJob.update({ where: { id }, data: { status: "PROCESSING", startedAt: new Date() } });
}

export async function persistBatchOutcome(jobId: string, runId: string, processingId: string, outcome: BatchCandidateOutcome) {
  await prisma.$transaction(async (tx) => {
    const { profile, result } = outcome;
    if (outcome.status === "completed" && profile && result) {
      await tx.candidate.create({ data: {
        id: outcome.candidateId, name: profile.name, email: profile.email, phone: profile.phone,
        location: profile.location, summary: profile.summary, totalExperienceYears: profile.totalExperienceYears,
        rawResumeText: profile.rawTextExcerpt, profileJson: JSON.stringify(profile),
        extractedSkillsJson: JSON.stringify(profile.skills), extractedWorkJson: JSON.stringify(profile.experience),
        extractedEducationJson: JSON.stringify(profile.education),
        candidateSkills: { create: profile.skills.map((skill) => ({ skillName: skill.canonicalName ?? skill.name, level: skill.level, years: skill.yearsOfExperience, evidence: skill.evidenceSnippet })) },
        candidateExperiences: { create: profile.experience.map((item) => ({ company: item.company, title: item.title, startDate: item.startDate, endDate: item.endDate, years: item.years, description: item.description })) },
      } });
      await tx.candidateMatch.create({ data: {
        jobId, scoringRunId: runId, candidateId: outcome.candidateId,
        totalScore: result.totalScore, skillScore: result.skillScore, maxSkillScore: result.maxSkillScore,
        experienceScore: result.experienceScore, maxExperienceScore: result.maxExperienceScore,
        preferredScore: result.preferredScore, maxPreferredScore: result.maxPreferredScore,
        evidenceScore: result.evidenceScore, maxEvidenceScore: result.maxEvidenceScore,
        calculatedExperienceYears: result.calculatedExperienceYears, requiredExperienceYears: result.requiredExperienceYears,
        status: result.status, matchesJson: JSON.stringify(result.matches), gapsJson: JSON.stringify(result.gaps),
        weightsJson: JSON.stringify(result.scoringWeights), extractionConfidence: result.extractionConfidence,
        extractionWarningsJson: JSON.stringify(outcome.warnings),
      } });
    }
    await tx.candidateProcessingJob.update({ where: { id: processingId }, data: {
      status: outcome.status === "completed" ? "COMPLETED" : "FAILED",
      candidateId: result ? outcome.candidateId : null, score: result?.totalScore,
      routingState: result?.status, attempts: outcome.attempts, errorMessage: outcome.error,
      providerName: outcome.provider.name, fallbackUsed: outcome.provider.fallbackUsed,
      warningsJson: JSON.stringify(outcome.warnings), completedAt: new Date(),
    } });
  });
}

export async function getBatchRun(jobId: string, runId: string): Promise<BatchScreeningRunSummary | null> {
  const row = await prisma.scoringRun.findFirst({ where: { id: runId, jobId }, include: { processingJobs: { orderBy: { candidateIndex: "asc" } } } });
  if (!row) return null;
  return {
    id: row.id, jobId, status: row.status as BatchScreeningRunSummary["status"],
    totalCandidates: row.candidatesCount,
    completedCandidates: row.processingJobs.filter((item) => item.status === "COMPLETED").length,
    failedCandidates: row.processingJobs.filter((item) => item.status === "FAILED").length,
    provider: row.provider ?? undefined, model: row.model ?? undefined,
    startedAt: row.executedAt.toISOString(), completedAt: row.completedAt?.toISOString(),
    candidates: row.processingJobs.map((item) => ({
      index: item.candidateIndex, name: item.candidateName, sourceName: item.sourceName ?? item.candidateName,
      status: item.status as BatchCandidateStatus, candidateId: item.candidateId ?? undefined,
      score: item.score ?? undefined, routingState: item.routingState ?? undefined,
      error: item.errorMessage ?? undefined, attempts: item.attempts,
      providerName: item.providerName ?? undefined, fallbackUsed: item.fallbackUsed,
      warnings: parseJson<string[]>(item.warningsJson, []),
    })),
  };
}

export async function finishBatchScreening(jobId: string, runId: string, interrupted = false) {
  await prisma.$transaction(async (tx) => {
    await tx.candidateProcessingJob.updateMany({ where: { scoringRunId: runId, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "FAILED", errorMessage: "The run was interrupted before this candidate completed.", completedAt: new Date() } });
    const jobs = await tx.candidateProcessingJob.findMany({ where: { scoringRunId: runId } });
    const successCount = jobs.filter((item) => item.status === "COMPLETED").length;
    await tx.scoringRun.update({ where: { id: runId }, data: { status: interrupted || successCount === 0 ? "FAILED" : "COMPLETED", successCount, failureCount: jobs.length - successCount, completedAt: new Date() } });
    const job = await tx.job.findUniqueOrThrow({ where: { id: jobId } });
    const notes = parseJson<string[]>(job.processingNotesJson, []);
    for (const item of jobs) {
      if (item.errorMessage) notes.push(`${item.sourceName ?? item.candidateName}: ${item.errorMessage}`);
      if (item.fallbackUsed) notes.push(`${item.sourceName ?? item.candidateName}: offline extraction fallback used.`);
    }
    await tx.job.update({ where: { id: jobId }, data: { status: successCount > 0 ? "ready" : "draft", processingNotesJson: JSON.stringify(notes) } });
  });
}

export async function getScreeningById(
  jobId: string
): Promise<JobScreening | null> {
  const row = await prisma.job.findUnique({
    where: { id: jobId },
    include: screeningInclude,
  });
  return row ? rowToScreening(row) : null;
}

function prefixStructuredRequirements(
  structured: StructuredJobRequirements,
  prefix: string
): StructuredJobRequirements {
  const prefixList = (
    requirements: StructuredJobRequirements["requiredSkills"]
  ) =>
    requirements.map((requirement) => ({
      ...requirement,
      id: `${prefix}${requirement.id}`,
    }));

  return {
    ...structured,
    requiredSkills: prefixList(structured.requiredSkills),
    preferredSkills: prefixList(structured.preferredSkills),
    educationRequirements: prefixList(structured.educationRequirements),
    certifications: prefixList(structured.certifications),
  };
}

function requirementRows(
  jobId: string,
  structured: StructuredJobRequirements
): Prisma.RequirementCreateManyInput[] {
  const rows: Prisma.RequirementCreateManyInput[] = [];
  let orderIndex = 0;

  const add = (
    requirements: StructuredJobRequirements["requiredSkills"],
    importance: "required" | "preferred"
  ) => {
    for (const requirement of requirements) {
      rows.push({
        id: requirement.id,
        jobId,
        name: requirement.name,
        type: requirement.type,
        importance: requirement.importance ?? importance,
        minimumYears: requirement.minimumYears,
        description: requirement.description,
        extractedEvidence: requirement.extractedEvidence,
        confidence: requirement.confidence,
        orderIndex: orderIndex++,
      });
    }
  };

  add(structured.requiredSkills, "required");
  add(structured.preferredSkills, "preferred");
  add(structured.educationRequirements, "required");
  add(structured.certifications, "preferred");

  return rows;
}

/**
 * Persist one screening. The client supplies validated extraction facts only;
 * matching, scoring, and routing are recomputed here.
 */
export async function createScreening(
  input: CreateScreeningInput
): Promise<CreateScreeningResult> {
  const screeningId = `screening-${Date.now().toString(36)}-${randomUUID().slice(
    0,
    8
  )}`;
  const structured = prefixStructuredRequirements(
    input.requirements,
    `${screeningId}-`
  );
  const requirements = structuredJobToRequirements(structured, {
    id: screeningId,
    title: input.title,
    department: input.department,
    location: input.location,
    rawDescription: input.rawDescription,
  });
  const weights = input.weights ?? {
    requiredSkills: 50,
    experience: 25,
    preferredSkills: 15,
    evidenceQuality: 10,
  };

  const failed: Array<{ name: string; error: string }> = [];
  const scored: Array<{
    candidateId: string;
    profile: CandidateProfile;
    warnings: string[];
    result: CandidateScoreResult;
  }> = [];

  input.candidates.forEach((candidate, index) => {
    try {
      const candidateId = `cand-${screeningId}-${index + 1}`;
      const result = scoreCandidateProfile({
        candidateId,
        profile: candidate.profile,
        requirements,
        weights,
        warnings: candidate.warnings ?? [],
      });
      scored.push({
        candidateId,
        profile: candidate.profile,
        warnings: candidate.warnings ?? [],
        result,
      });
    } catch (error) {
      failed.push({
        name: candidate.sourceName ?? `candidate-${index + 1}`,
        error:
          error instanceof Error
            ? error.message
            : "The candidate could not be scored.",
      });
    }
  });

  if (scored.length === 0) {
    throw new RecomputeError(
      "No candidate could be scored from the validated profiles.",
      failed.map((failure) => `${failure.name}: ${failure.error}`)
    );
  }

  const extractedAt = new Date(input.requirements.extractedAt);
  const validExtractedAt = Number.isNaN(extractedAt.getTime())
    ? new Date()
    : extractedAt;

  const persistedNotes = [
    ...(input.processingNotes ?? []),
    ...failed.map(
      (failure) => `${failure.name}: ${failure.error}`
    ),
  ];

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { slug: "apex-engineering" },
      select: { id: true },
    });

    await tx.job.create({
      data: {
        id: screeningId,
        title: input.title,
        department: input.department,
        location: input.location,
        status: "ready",
        rawDescription: input.rawDescription,
        minimumExperienceYears: input.requirements.minimumExperienceYears,
        summary: input.requirements.summary,
        responsibilitiesJson: JSON.stringify(
          input.requirements.responsibilities
        ),
        domainKnowledgeJson: JSON.stringify(
          input.requirements.domainKnowledge
        ),
        certificationsJson: JSON.stringify(
          input.requirements.certifications
        ),
        processingNotesJson:
          persistedNotes.length > 0
            ? JSON.stringify(persistedNotes)
            : null,
        isSample: input.isSample === true,
        extractionConfidence: input.requirements.confidence,
        extractedAt: validExtractedAt,
        organizationId: organization?.id ?? null,
      },
    });

    const requirementData = requirementRows(screeningId, structured);
    for (const row of requirementData) {
      await tx.requirement.create({ data: row });
    }

    const run = await tx.scoringRun.create({
      data: {
        jobId: screeningId,
        candidatesCount: scored.length,
        status: "COMPLETED",
        weightsJson: JSON.stringify(weights),
      },
    });

    for (const candidate of scored) {
      const profile = candidate.profile;
      const { result } = candidate;

      await tx.candidate.create({
        data: {
          id: candidate.candidateId,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          summary: profile.summary,
          totalExperienceYears: profile.totalExperienceYears,
          rawResumeText: profile.rawTextExcerpt,
          extractedSkillsJson: JSON.stringify(profile.skills),
          extractedWorkJson: JSON.stringify(profile.experience),
          extractedEducationJson: JSON.stringify(profile.education),
          profileJson: JSON.stringify(profile),
        },
      });

      if (profile.skills.length > 0) {
        await tx.candidateSkill.createMany({
          data: profile.skills.map((skill) => ({
            candidateId: candidate.candidateId,
            skillName: skill.canonicalName ?? skill.name,
            level: skill.level,
            years: skill.yearsOfExperience,
            evidence: skill.evidenceSnippet,
          })),
        });
      }

      if (profile.experience.length > 0) {
        await tx.candidateExperience.createMany({
          data: profile.experience.map((experience) => ({
            candidateId: candidate.candidateId,
            company: experience.company,
            title: experience.title,
            startDate: experience.startDate,
            endDate: experience.endDate,
            years: experience.years,
            description: experience.description,
          })),
        });
      }

      await tx.candidateMatch.create({
        data: {
          jobId: screeningId,
          candidateId: candidate.candidateId,
          scoringRunId: run.id,
          totalScore: result.totalScore,
          skillScore: result.skillScore,
          maxSkillScore: result.maxSkillScore,
          experienceScore: result.experienceScore,
          maxExperienceScore: result.maxExperienceScore,
          preferredScore: result.preferredScore,
          maxPreferredScore: result.maxPreferredScore,
          evidenceScore: result.evidenceScore,
          maxEvidenceScore: result.maxEvidenceScore,
          calculatedExperienceYears: result.calculatedExperienceYears,
          requiredExperienceYears: result.requiredExperienceYears,
          status: result.status,
          decision: "pending",
          matchesJson: JSON.stringify(result.matches),
          gapsJson: JSON.stringify(result.gaps),
          weightsJson: JSON.stringify(result.scoringWeights),
          extractionConfidence: result.extractionConfidence,
          extractionWarningsJson:
            candidate.warnings.length > 0
              ? JSON.stringify(candidate.warnings)
              : null,
        },
      });
    }
  });

  const screening = await getScreeningById(screeningId);
  if (!screening) {
    throw new ScreeningNotFoundError(
      "The screening was written but could not be read back."
    );
  }

  return { screening, failed };
}

export async function updateCandidateDecision(
  jobId: string,
  candidateId: string,
  input: CandidateDecisionInput
): Promise<CandidateScoreResult> {
  const existing = await prisma.candidateMatch.findUnique({
    where: { jobId_candidateId: { jobId, candidateId } },
  });

  if (!existing) {
    throw new ScreeningNotFoundError(
      "That candidate does not belong to this screening."
    );
  }

  const match = await prisma.candidateMatch.update({
    where: { jobId_candidateId: { jobId, candidateId } },
    data: {
      decision: input.decision,
      reviewNotes:
        input.notes === undefined ? existing.reviewNotes : input.notes || null,
      reviewedAt: input.decision === "pending" ? null : new Date(),
    },
    include: { candidate: true },
  });

  return matchToCandidateScore(match);
}

/**
 * Recompute every candidate from stored validated profiles with new weights.
 * A new ScoringRun preserves the audit trail; decisions and notes are kept.
 */
export async function recomputeScreeningWeights(
  jobId: string,
  weights: ScoringWeights
): Promise<JobScreening> {
  const row = await prisma.job.findUnique({
    where: { id: jobId },
    include: screeningInclude,
  });

  if (!row) {
    throw new ScreeningNotFoundError("That screening does not exist.");
  }

  const requirements = rowToRequirements(row);
  const details: string[] = [];
  const recalculated: Array<{
    candidateId: string;
    result: CandidateScoreResult;
    decision: DecisionStatus;
    reviewNotes: string | null;
    reviewedAt: Date | null;
  }> = [];

  for (const match of row.candidateMatches) {
    const profile = parseJson<CandidateProfile | null>(
      match.candidate.profileJson,
      null
    );

    if (!profile) {
      details.push(
        `${match.candidate.name}: no stored validated profile; score left unchanged.`
      );
      continue;
    }

    const profileWithId = { ...profile, id: match.candidateId };
    const result = calculateFinalMatchScore(profileWithId, requirements, weights);

    recalculated.push({
      candidateId: match.candidateId,
      result,
      decision: match.decision as DecisionStatus,
      reviewNotes: match.reviewNotes,
      reviewedAt: match.reviewedAt,
    });
  }

  if (recalculated.length === 0) {
    throw new RecomputeError(
      "No candidate had a stored profile that could be recomputed.",
      details
    );
  }

  await prisma.$transaction(async (tx) => {
    const run = await tx.scoringRun.create({
      data: {
        jobId,
        candidatesCount: recalculated.length,
        status: "COMPLETED",
        weightsJson: JSON.stringify(weights),
      },
    });

    for (const item of recalculated) {
      await tx.candidateMatch.update({
        where: {
          jobId_candidateId: { jobId, candidateId: item.candidateId },
        },
        data: {
          scoringRunId: run.id,
          totalScore: item.result.totalScore,
          skillScore: item.result.skillScore,
          maxSkillScore: item.result.maxSkillScore,
          experienceScore: item.result.experienceScore,
          maxExperienceScore: item.result.maxExperienceScore,
          preferredScore: item.result.preferredScore,
          maxPreferredScore: item.result.maxPreferredScore,
          evidenceScore: item.result.evidenceScore,
          maxEvidenceScore: item.result.maxEvidenceScore,
          calculatedExperienceYears: item.result.calculatedExperienceYears,
          requiredExperienceYears: item.result.requiredExperienceYears,
          status: item.result.status,
          matchesJson: JSON.stringify(item.result.matches),
          gapsJson: JSON.stringify(item.result.gaps),
          weightsJson: JSON.stringify(weights),
          decision: item.decision,
          reviewNotes: item.reviewNotes,
          reviewedAt: item.reviewedAt,
        },
      });
    }
  });

  const updated = await getScreeningById(jobId);
  if (!updated) {
    throw new ScreeningNotFoundError(
      "The screening was recomputed but could not be read back."
    );
  }
  return updated;
}
