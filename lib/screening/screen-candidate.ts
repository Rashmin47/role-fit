/**
 * Server-side candidate screening orchestration.
 *
 * This module is for server use only (batch jobs, tests, and future server
 * actions). The browser calls `/api/extract/candidate` and then uses
 * `scoreCandidateProfile()` from `score-candidate.ts`; it must never import
 * provider code or environment configuration.
 *
 * Product boundary:
 *   provider extracts facts -> validator repairs/rejects -> deterministic code
 *   matches, scores, and routes.
 *
 * Providers are never allowed to return a score.
 */

import { extractCandidateProfileOnServer } from "@/lib/ai/server-extraction";
import type { CandidateScoreResult, JobRequirements, ScoringWeights } from "@/types";
import { scoreCandidateProfile } from "./score-candidate";

export {
  structuredJobToRequirements,
  candidateProfileToExtraction,
  scoreCandidateProfile,
} from "./score-candidate";

export interface ScreenCandidateTextArgs {
  candidateId: string;
  name: string;
  text: string;
  requirements: JobRequirements;
  weights?: ScoringWeights;
}

/**
 * Extract, validate, and score one resume text.
 *
 * Throws when the provider output cannot be validated. Callers should isolate
 * per-candidate failures so one malformed resume does not abort a whole run.
 */
export async function screenCandidateText({
  candidateId,
  name,
  text,
  requirements,
  weights,
}: ScreenCandidateTextArgs): Promise<CandidateScoreResult> {
  const extraction = await extractCandidateProfileOnServer(text, name);

  return scoreCandidateProfile({
    candidateId,
    profile: extraction.profile,
    requirements,
    weights,
    warnings: extraction.provider.warning
      ? [extraction.provider.warning, ...extraction.warnings]
      : extraction.warnings,
  });
}
