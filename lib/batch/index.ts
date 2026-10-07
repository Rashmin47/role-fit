/**
 * Nirman Batch Processing Architecture
 * Coordinates scalable screening runs across batches of 10 to 200+ resumes.
 * Processes each candidate independently to prevent monolithic context exhaustion.
 */

import { StructuredJobRequirements, CandidateProfile } from "../ai/schemas";
import { evaluateCandidateMatch, CandidateMatchResult } from "../matching";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "../scoring";
import { determineCandidateRouting, RoutingDecision } from "../routing";
import { getAIProvider } from "../ai/provider";

export type ProcessingStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface CandidateProcessingJob {
  id: string;
  screeningRunId: string;
  candidateName: string;
  rawResumeText: string;
  status: ProcessingStatus;
  extractedProfile?: CandidateProfile;
  matchResult?: CandidateMatchResult;
  calculatedScore?: number;
  routingDecision?: RoutingDecision;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ScreeningRun {
  id: string;
  jobId: string;
  jobRequirements: StructuredJobRequirements;
  status: ProcessingStatus;
  totalCandidates: number;
  processedCandidates: number;
  successfulCandidates: number;
  errorCount: number;
  jobs: CandidateProcessingJob[];
  startedAt: string;
  completedAt?: string;
}

export class BatchScreeningPipeline {
  /**
   * Processes a single candidate document independently
   */
  async processCandidateItem(
    job: CandidateProcessingJob,
    requirements: StructuredJobRequirements
  ): Promise<CandidateProcessingJob> {
    job.status = "PROCESSING";
    job.startedAt = new Date().toISOString();

    try {
      const provider = getAIProvider();

      // 1. Structured extraction
      const profile = await provider.extractCandidateProfile(
        job.rawResumeText,
        job.candidateName
      );
      job.extractedProfile = profile;

      // 2. Deterministic matching
      const match = evaluateCandidateMatch(profile, requirements);
      job.matchResult = match;

      // 3. Deterministic scoring
      const legacyCandidate = {
        id: profile.id,
        name: profile.name,
        totalExperienceYears: profile.totalExperienceYears,
        skills: profile.skills.map((s) => ({ name: s.name, level: s.level || "Strong" })),
        experience: profile.experience.map((e) => ({
          company: e.company,
          title: e.title,
          startDate: "2023-01",
          years: e.years,
          description: e.description,
          technologies: e.technologies,
        })),
        education: profile.education.map((ed) => ({
          institution: ed.institution,
          degree: ed.degree,
          field: ed.field,
        })),
      };

      const legacyReqs = {
        id: "job-req",
        title: requirements.title,
        rawDescription: requirements.summary || "",
        minimumExperienceYears: requirements.minimumExperienceYears,
        requiredSkills: requirements.requiredSkills.map((r) => ({
          id: r.id,
          name: r.name,
          type: "required_skill" as const,
        })),
        preferredSkills: requirements.preferredSkills.map((r) => ({
          id: r.id,
          name: r.name,
          type: "preferred_skill" as const,
        })),
        responsibilities: requirements.responsibilities,
      };

      const scoreResult = calculateFinalMatchScore(
        legacyCandidate,
        legacyReqs,
        DEFAULT_SCORING_WEIGHTS
      );

      job.calculatedScore = scoreResult.totalScore;

      // 4. Deterministic routing
      job.routingDecision = determineCandidateRouting(
        scoreResult.totalScore,
        match.missingRequiredCount,
        profile.totalExperienceYears,
        requirements.minimumExperienceYears,
        match.reviewFlags
      );

      job.status = "COMPLETED";
      job.completedAt = new Date().toISOString();
      return job;
    } catch (err: any) {
      job.status = "FAILED";
      job.errorMessage = err.message || "Failed during candidate extraction/scoring stage.";
      job.completedAt = new Date().toISOString();
      return job;
    }
  }

  /**
   * Orchestrates a batch screening run with progressive status updates
   */
  async executeBatch(
    screeningRun: ScreeningRun,
    onProgress?: (progress: number, currentJob: CandidateProcessingJob) => void
  ): Promise<ScreeningRun> {
    screeningRun.status = "PROCESSING";

    for (let i = 0; i < screeningRun.jobs.length; i++) {
      const job = screeningRun.jobs[i];
      await this.processCandidateItem(job, screeningRun.jobRequirements);

      screeningRun.processedCandidates += 1;
      if (job.status === "COMPLETED") {
        screeningRun.successfulCandidates += 1;
      } else {
        screeningRun.errorCount += 1;
      }

      const progressPct = Math.round(((i + 1) / screeningRun.totalCandidates) * 100);
      onProgress?.(progressPct, job);
    }

    screeningRun.status = "COMPLETED";
    screeningRun.completedAt = new Date().toISOString();
    return screeningRun;
  }
}
