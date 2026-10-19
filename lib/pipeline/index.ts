/**
 * Role Fit multi-step pipeline coordinator.
 *
 * Stage 1: AI/provider extraction of structured requirements.
 * Stage 2: retrieval grounding against observed market postings.
 *
 * Matching, scoring, and routing are intentionally *not* performed here: they
 * are pure functions in `lib/matching`, `lib/scoring`, and `lib/routing`, and
 * are composed by the batch pipeline.
 */

import { getAIProvider, StructuredJobRequirements } from "../ai/provider";
import { retrieveRelevantJobPostings } from "../retrieval";

export async function runJobAnalysisPipeline(
  jobTitle: string,
  rawDescription: string
): Promise<StructuredJobRequirements> {
  const provider = getAIProvider();

  const extracted = await provider.extractJobRequirements(
    jobTitle,
    rawDescription
  );

  const relevantMarketPostings = await retrieveRelevantJobPostings(
    extracted.title,
    extracted.requiredSkills.map((requirement) => requirement.name)
  );

  return {
    ...extracted,
    summary:
      extracted.summary ||
      `Extracted requirements grounded against ${relevantMarketPostings.length} market observations.`,
  };
}
