/**
 * Batch candidate processing.
 *
 * One candidate is extracted, validated, matched, scored, and routed at a time.
 * The pipeline is deliberately server-only and has no persistence side effects:
 * the batch route owns `ScoringRun` / `CandidateProcessingJob` updates so a
 * failure can be isolated, retried once, and recorded without aborting the run.
 *
 * Product boundary:
 *   provider extracts facts -> validator repairs/rejects -> deterministic code
 *   matches, scores, and routes. Providers never return a score.
 */

import type { AIProviderConfig } from "../ai/provider";
import type { CandidateProfile } from "../ai/schemas";
import type { ExtractionProviderInfo } from "../ai/extraction-contract";
import {
  ExtractionError,
  extractCandidateProfileOnServer,
} from "../ai/server-extraction";
import { scoreCandidateProfile } from "../screening/score-candidate";
import {
  MAX_CANDIDATE_TEXT_CHARS,
  MIN_CANDIDATE_TEXT_CHARS,
} from "../api/screening-contract";
import type {
  CandidateScoreResult,
  JobRequirements,
  ScoringWeights,
} from "@/types";

if (typeof window !== "undefined") {
  throw new Error(
    "Batch screening is server-only. Use /api/screenings/batch instead."
  );
}

export type BatchOutcomeStatus = "completed" | "failed";

export interface BatchCandidateSource {
  index: number;
  name: string;
  sourceName: string;
  text: string;
}

export interface BatchCandidateOutcome {
  index: number;
  name: string;
  sourceName: string;
  candidateId: string;
  status: BatchOutcomeStatus;
  attempts: number;
  retryable: boolean;
  provider: ExtractionProviderInfo;
  warnings: string[];
  profile?: CandidateProfile;
  result?: CandidateScoreResult;
  error?: string;
}

export type BatchExtractionFn = typeof extractCandidateProfileOnServer;

export interface ProcessBatchCandidateArgs {
  candidateId: string;
  source: BatchCandidateSource;
  requirements: JobRequirements;
  weights?: ScoringWeights;
  providerConfig?: AIProviderConfig;
  /** One retry by default; pass 1 to disable retries. */
  maxAttempts?: number;
  /** Injectable for tests; production uses the validated server boundary. */
  extract?: BatchExtractionFn;
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "The candidate could not be extracted or scored.";
}

/**
 * Validation failures are deterministic; retrying them only wastes provider
 * calls. Timeouts and provider errors are worth one retry.
 */
function isRetryable(error: unknown): boolean {
  return !(error instanceof ExtractionError && error.code === "validation");
}

/**
 * Extract, validate, and score one resume. This never throws for an individual
 * candidate; the caller records the failure and continues the batch.
 */
export async function processCandidateForBatch({
  candidateId,
  source,
  requirements,
  weights,
  providerConfig,
  maxAttempts = 2,
  extract = extractCandidateProfileOnServer,
}: ProcessBatchCandidateArgs): Promise<BatchCandidateOutcome> {
  const attemptsAllowed = maxAttempts === 1 ? 1 : 2;
  const trimmed = source.text.trim();

  if (trimmed.length < MIN_CANDIDATE_TEXT_CHARS) {
    return {
      index: source.index,
      name: source.name,
      sourceName: source.sourceName,
      candidateId,
      status: "failed",
      attempts: 1,
      retryable: false,
      provider: { name: "none", fallbackUsed: false },
      warnings: [],
      error: `The resume text is shorter than the ${MIN_CANDIDATE_TEXT_CHARS}-character minimum.`,
    };
  }

  if (trimmed.length > MAX_CANDIDATE_TEXT_CHARS) {
    return {
      index: source.index,
      name: source.name,
      sourceName: source.sourceName,
      candidateId,
      status: "failed",
      attempts: 1,
      retryable: false,
      provider: { name: "none", fallbackUsed: false },
      warnings: [],
      error: `The resume text is longer than the ${MAX_CANDIDATE_TEXT_CHARS}-character limit.`,
    };
  }

  let lastError: unknown;
  let attempts = 0;
  let retryable = true;

  while (attempts < attemptsAllowed) {
    attempts += 1;

    try {
      const extraction = await extract(
        trimmed,
        source.name,
        providerConfig
      );

      const warnings = [...extraction.warnings];
      if (extraction.provider.warning) {
        warnings.unshift(extraction.provider.warning);
      }
      const result = scoreCandidateProfile({
        candidateId,
        profile: extraction.profile,
        requirements,
        weights,
        warnings,
      });

      return {
        index: source.index,
        name: source.name,
        sourceName: source.sourceName,
        candidateId,
        status: "completed",
        attempts,
        retryable: false,
        provider: extraction.provider,
        warnings,
        profile: extraction.profile,
        result,
      };
    } catch (error) {
      lastError = error;
      retryable = isRetryable(error);

      if (!retryable || attempts >= attemptsAllowed) {
        break;
      }
    }
  }

  return {
    index: source.index,
    name: source.name,
    sourceName: source.sourceName,
    candidateId,
    status: "failed",
    attempts,
    retryable,
    provider: { name: "unknown", fallbackUsed: false },
    warnings: [],
    error: messageOf(lastError),
  };
}
