/**
 * Nirman Multi-Step Pipeline Coordinator
 * Integrates: Unstructured Text -> AI Extraction -> Normalization -> Retrieval -> Matching -> Scoring -> Routing -> Human Decision
 */

import { getAIProvider, StructuredJobRequirements } from "../ai/provider";
import { evaluateCandidateMatch, CandidateMatchResult } from "../matching";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "../scoring";
import { determineCandidateRouting, RoutingDecision } from "../routing";
import { retrieveRelevantJobPostings } from "../retrieval";

export interface PipelineExecutionResult {
  stage: "EXTRACTED" | "MATCHED" | "SCORED" | "ROUTED";
  jobRequirements: StructuredJobRequirements;
  candidatesCount: number;
  durationMs: number;
}

export async function runJobAnalysisPipeline(
  jobTitle: string,
  rawDescription: string
): Promise<StructuredJobRequirements> {
  const startTime = Date.now();
  const provider = getAIProvider();

  // Stage 1: AI Structured Extraction
  const extracted = await provider.extractJobRequirements(jobTitle, rawDescription);

  // Stage 2: Grounding & Retrieval Verification
  const relevantMarketPostings = await retrieveRelevantJobPostings(
    extracted.title,
    extracted.requiredSkills.map((r) => r.name)
  );

  return {
    ...extracted,
    summary: extracted.summary || `Extracted requirements grounded against ${relevantMarketPostings.length} market observations.`,
  };
}
