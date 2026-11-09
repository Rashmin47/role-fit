/**
 * Deterministic candidate scoring boundary.
 *
 * This module is safe to run in the browser or on the server: it contains no
 * provider code, network calls, or environment access. Candidate facts must
 * already be validated before they reach `scoreCandidateProfile`.
 */

import type {
  CandidateProfile,
  StructuredJobRequirements,
} from "@/lib/ai/schemas";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import type {
  CandidateScoreResult,
  JobRequirements,
  ScoringWeights,
} from "@/types";

export interface ScreeningJobMeta {
  id: string;
  title: string;
  department: string;
  location: string;
  rawDescription: string;
}

/**
 * Convert validated AI job output into the presentation/engine shape.
 * This adapter is deliberately one-directional: AI DTOs stop at this boundary.
 */
export function structuredJobToRequirements(
  structured: StructuredJobRequirements,
  meta: ScreeningJobMeta
): JobRequirements {
  return {
    id: meta.id,
    title: meta.title || structured.title,
    department: meta.department || structured.department,
    location: meta.location || structured.location,
    rawDescription: meta.rawDescription,
    minimumExperienceYears: structured.minimumExperienceYears,
    requiredSkills: structured.requiredSkills.map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      type: "required_skill" as const,
      description: requirement.description,
      minimumYears: requirement.minimumYears,
    })),
    preferredSkills: structured.preferredSkills.map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      type: "preferred_skill" as const,
      description: requirement.description,
      minimumYears: requirement.minimumYears,
    })),
    educationRequirements: structured.educationRequirements.map((requirement) => ({
      id: requirement.id,
      name: requirement.name,
      type: "education" as const,
      description: requirement.description,
    })),
    responsibilities: structured.responsibilities,
  };
}

/**
 * @deprecated CandidateProfile is now the unified canonical type.
 * Kept for backward compatibility.
 */
export function candidateProfileToExtraction(
  profile: CandidateProfile,
  candidateId?: string
): CandidateProfile {
  return candidateId ? { ...profile, id: candidateId } : profile;
}

export interface ScoreCandidateProfileArgs {
  candidateId: string;
  profile: CandidateProfile;
  requirements: JobRequirements;
  weights?: ScoringWeights;
  warnings?: string[];
}

/**
 * Score an already-validated profile. This is the deterministic half of
 * screening; extraction happens at the server boundary before this runs.
 */
export function scoreCandidateProfile({
  candidateId,
  profile,
  requirements,
  weights = DEFAULT_SCORING_WEIGHTS,
  warnings = [],
}: ScoreCandidateProfileArgs): CandidateScoreResult {
  const profileWithId = candidateId ? { ...profile, id: candidateId } : profile;
  const result = calculateFinalMatchScore(profileWithId, requirements, weights);

  return {
    ...result,
    candidateId,
    candidateName: profile.name,
    extractionConfidence: profile.confidence,
    extractionWarnings: warnings.length > 0 ? warnings : undefined,
  };
}
