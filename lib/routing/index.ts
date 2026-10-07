/**
 * Nirman Routing & Decision Engine
 * Pure application logic for triaging candidates into actionable recruiter queues.
 * NO AUTOMATIC REJECTION. Human recruiters make the final decision.
 */

export type RoutingQueueState = "STRONG_MATCH" | "REVIEW" | "NEEDS_VERIFICATION";

export interface RoutingDecision {
  state: RoutingQueueState;
  score: number;
  priorityOrder: number; // 1 = top priority
  headline: string;
  reasons: string[];
  suggestedAction: string;
}

export function determineCandidateRouting(
  score: number,
  missingRequiredCount: number,
  experienceYears: number,
  requiredYears: number,
  reviewFlags: string[] = []
): RoutingDecision {
  // Case 1: Strong Match
  if (score >= 85 && missingRequiredCount === 0 && experienceYears >= requiredYears) {
    return {
      state: "STRONG_MATCH",
      score,
      priorityOrder: 1,
      headline: "Exceeds or satisfies 100% of core role criteria",
      reasons: [
        "All mandatory technical skills verified with concrete evidence",
        `Experience duration (${experienceYears.toFixed(1)}y) meets or exceeds ${requiredYears}y requirement`,
        "No critical competence gaps detected",
      ],
      suggestedAction: "Fast-track to technical screening interview",
    };
  }

  // Case 2: Review (Qualified with minor gaps to probe)
  if (score >= 60 || missingRequiredCount <= 2) {
    const reasons: string[] = [];
    if (experienceYears < requiredYears) {
      reasons.push(
        `Experience slightly below threshold (${experienceYears.toFixed(1)}y vs ${requiredYears}y)`
      );
    }
    if (missingRequiredCount > 0) {
      reasons.push(`${missingRequiredCount} mandatory requirement(s) missing direct keyword verification`);
    }
    if (reasons.length === 0) {
      reasons.push("Meets base criteria; optional preferred capabilities missing");
    }

    return {
      state: "REVIEW",
      score,
      priorityOrder: 2,
      headline: "Qualified candidate with specific areas requiring recruiter review",
      reasons: [...reasons, ...reviewFlags.slice(0, 2)],
      suggestedAction: "Evaluate project depth in technical interview before deciding",
    };
  }

  // Case 3: Needs Verification (Ambiguous, significant gaps, or junior profile)
  return {
    state: "NEEDS_VERIFICATION",
    score,
    priorityOrder: 3,
    headline: "Multiple prerequisite gaps or ambiguous documentation",
    reasons: [
      `${missingRequiredCount} mandatory requirements not verified in provided resume`,
      `Documented timeline shows ${experienceYears.toFixed(1)}y experience`,
      ...reviewFlags.slice(0, 2),
    ],
    suggestedAction: "Verify portfolio repositories or request clarifying technical details",
  };
}
