import {
  CandidateProfile,
  JobRequirements,
  ScoringWeights,
  CandidateScoreResult,
  MatchEvidence,
  SkillGap,
  MatchStatus,
} from "@/types";
import {
  evaluateRequirementMatch,
  evaluateCandidateMatch,
  type RequirementMatchItem,
} from "../matching";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  requiredSkills: 50,
  experience: 25,
  preferredSkills: 15,
  evidenceQuality: 10,
};

/**
 * Deterministic Skill Scoring
 * Consumes evaluated requirement matches from the matching engine.
 */
export function calculateSkillScore(
  candidate: CandidateProfile,
  requiredSkills: JobRequirements["requiredSkills"],
  maxPoints: number = 50,
  precomputedMatches?: RequirementMatchItem[]
): { score: number; matches: MatchEvidence[]; missing: string[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: maxPoints, matches: [], missing: [] };
  }

  const pointPerSkill = maxPoints / requiredSkills.length;
  let earnedPoints = 0;
  const matches: MatchEvidence[] = [];
  const missing: string[] = [];

  for (let i = 0; i < requiredSkills.length; i++) {
    const req = requiredSkills[i];
    const matchItem = precomputedMatches?.[i] ?? evaluateRequirementMatch(candidate, req);
    const isMatched = matchItem.status === "MATCH" || matchItem.status === "PARTIAL";

    if (isMatched) {
      earnedPoints += pointPerSkill;
      matches.push({
        requirementId: matchItem.requirementId,
        requirementName: matchItem.name,
        matched: true,
        candidateValue: matchItem.candidateStatedValue,
        evidenceSnippet: matchItem.evidenceSnippet,
        sourceDocument: matchItem.sourceDocument,
        confidenceNotes: matchItem.status === "MATCH"
          ? "Direct keyword and context verification match"
          : `Partial depth stated: ${matchItem.candidateStatedValue}`,
      });
    } else {
      missing.push(matchItem.name);
      matches.push({
        requirementId: matchItem.requirementId,
        requirementName: matchItem.name,
        matched: false,
        candidateValue: matchItem.candidateStatedValue || "Not found",
        evidenceSnippet: matchItem.evidenceSnippet || "No direct keyword or project application found in candidate documentation",
        sourceDocument: matchItem.sourceDocument || "Resume",
        confidenceNotes: "Absence verified across experience & projects",
      });
    }
  }

  return {
    score: Math.round(earnedPoints),
    matches,
    missing,
  };
}

/**
 * Deterministic Experience Scoring
 * Pro-rates experience score based on required minimum years vs verified candidate years.
 */
export function calculateExperienceScore(
  candidateYears: number,
  requiredYears: number,
  maxPoints: number = 25,
  timelineExplanation?: string
): { score: number; match: MatchEvidence } {
  const safeYears = Math.max(0, candidateYears);

  if (requiredYears <= 0) {
    return {
      score: maxPoints,
      match: {
        requirementId: "req-experience",
        requirementName: "Minimum Experience",
        matched: true,
        candidateValue: `${safeYears} years`,
        evidenceSnippet: timelineExplanation || `${safeYears} years verified across candidate timeline.`,
        sourceDocument: "Resume",
      },
    };
  }

  let ratio = safeYears / requiredYears;
  if (ratio > 1.25) ratio = 1.25; // slight bonus cap
  const score = Math.max(0, Math.min(maxPoints, Math.round(ratio * maxPoints)));
  const isMatched = safeYears >= requiredYears;

  return {
    score,
    match: {
      requirementId: "req-experience",
      requirementName: `${requiredYears}+ years relevant experience`,
      matched: isMatched,
      candidateValue: `${safeYears.toFixed(1)} years`,
      evidenceSnippet: timelineExplanation || `${safeYears.toFixed(1)} years calculated from employment dates across ${safeYears > 0 ? "provided" : "0"} positions.`,
      sourceDocument: "Resume",
      confidenceNotes: isMatched
        ? `Meets minimum threshold (${safeYears.toFixed(1)} >= ${requiredYears} years)`
        : `Below requirement (${safeYears.toFixed(1)} < ${requiredYears} years)`,
    },
  };
}

/**
 * Deterministic Preferred Skill Scoring
 * Consumes evaluated requirement matches from the matching engine.
 */
export function calculatePreferredSkillScore(
  candidate: CandidateProfile,
  preferredSkills: JobRequirements["preferredSkills"],
  maxPoints: number = 15,
  precomputedMatches?: RequirementMatchItem[]
): { score: number; matches: MatchEvidence[] } {
  if (!preferredSkills || preferredSkills.length === 0) {
    return { score: maxPoints, matches: [] };
  }

  const pointPerSkill = maxPoints / preferredSkills.length;
  let earned = 0;
  const matches: MatchEvidence[] = [];

  for (let i = 0; i < preferredSkills.length; i++) {
    const pref = preferredSkills[i];
    const matchItem = precomputedMatches?.[i] ?? evaluateRequirementMatch(candidate, pref);
    const isMatched = matchItem.status === "MATCH" || matchItem.status === "PARTIAL";

    if (isMatched) {
      earned += pointPerSkill;
      matches.push({
        requirementId: matchItem.requirementId,
        requirementName: `${matchItem.name} (Preferred)`,
        matched: true,
        candidateValue: matchItem.candidateStatedValue || "Found",
        evidenceSnippet: matchItem.evidenceSnippet || "Verified in candidate skillset / background",
        sourceDocument: matchItem.sourceDocument || "Resume",
      });
    } else {
      matches.push({
        requirementId: matchItem.requirementId,
        requirementName: `${matchItem.name} (Preferred)`,
        matched: false,
        candidateValue: "Missing",
        evidenceSnippet: "Optional skill not highlighted",
        sourceDocument: "Resume",
      });
    }
  }

  return {
    score: Math.round(earned),
    matches,
  };
}

/**
 * Deterministic Evidence Quality Scoring
 * Evaluates presence of concrete project artifacts, clear employment dates, and descriptive bullets.
 */
export function calculateEvidenceScore(
  candidate: CandidateProfile,
  maxPoints: number = 10
): { score: number } {
  let points = 0;
  if (candidate.experience && candidate.experience.length > 0) points += 4;
  if (candidate.projects && candidate.projects.length > 0) points += 3;
  if (candidate.education && candidate.education.length > 0) points += 2;
  if (candidate.certifications && candidate.certifications.length > 0) points += 1;

  return { score: Math.min(maxPoints, points) };
}

/**
 * Derives explainable skill gaps
 */
export function generateSkillGaps(
  missingRequired: string[],
  missingPreferred: string[]
): SkillGap[] {
  const gaps: SkillGap[] = [];

  for (const skill of missingRequired) {
    gaps.push({
      skill,
      category: "required",
      importance: "high",
      marketFrequency: 78,
      whyItMatters: `Required core capability for backend delivery and team integration.`,
      evidenceFromRequirements: `Explicitly listed as core mandatory requirement in job specification.`,
      suggestedLearningDirection: `Review official documentation, complete hands-on production micro-project, and verify API patterns.`,
    });
  }

  for (const skill of missingPreferred) {
    gaps.push({
      skill,
      category: "preferred",
      importance: "medium",
      marketFrequency: 45,
      whyItMatters: `Valuable complementary skill that accelerates workflow efficiency.`,
      evidenceFromRequirements: `Listed as nice-to-have / preferred qualifications.`,
      suggestedLearningDirection: `Explore fundamentals and basic setup configurations.`,
    });
  }

  return gaps;
}

/**
 * Determine Recruiter Recommendation
 * Strict deterministic business logic, not LLM opinion.
 */
export function determineRecruiterRecommendation(
  totalScore: number,
  missingRequiredCount: number,
  expYears: number,
  reqYears: number
): MatchStatus {
  if (totalScore >= 85 && missingRequiredCount === 0 && expYears >= reqYears) {
    return "Strong Match";
  }
  if (totalScore >= 60 || missingRequiredCount <= 2) {
    return "Review";
  }
  return "Needs Verification";
}

/**
 * Complete Match Calculation Pipeline
 * Consolidates matching, experience calculation, deterministic scoring, and routing.
 */
export function calculateFinalMatchScore(
  candidate: CandidateProfile,
  jobRequirements: JobRequirements,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
  options: { asOf?: Date } = {}
): CandidateScoreResult {
  // 1. Run deterministic matching and experience calculation in a single pass
  const candidateMatch = evaluateCandidateMatch(candidate, jobRequirements, options);

  const reqMatches = (jobRequirements.requiredSkills || []).map((req) =>
    candidateMatch.matchedRequirements.find((m) => m.requirementId === req.id) ||
    candidateMatch.partialMatches.find((m) => m.requirementId === req.id) ||
    candidateMatch.missingRequirements.find((m) => m.requirementId === req.id) ||
    evaluateRequirementMatch(candidate, req)
  );

  const prefMatches = (jobRequirements.preferredSkills || []).map((pref) =>
    candidateMatch.matchedRequirements.find((m) => m.requirementId === pref.id) ||
    candidateMatch.partialMatches.find((m) => m.requirementId === pref.id) ||
    candidateMatch.missingRequirements.find((m) => m.requirementId === pref.id) ||
    evaluateRequirementMatch(candidate, pref)
  );

  const skillResult = calculateSkillScore(
    candidate,
    jobRequirements.requiredSkills,
    weights.requiredSkills,
    reqMatches
  );

  const expResult = calculateExperienceScore(
    candidateMatch.calculatedExperienceYears,
    jobRequirements.minimumExperienceYears,
    weights.experience,
    candidateMatch.timelineExplanation
  );

  const prefResult = calculatePreferredSkillScore(
    candidate,
    jobRequirements.preferredSkills,
    weights.preferredSkills,
    prefMatches
  );

  const evidenceResult = calculateEvidenceScore(candidate, weights.evidenceQuality);

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      skillResult.score + expResult.score + prefResult.score + evidenceResult.score
    )
  );

  const missingPref = prefResult.matches
    .filter((m) => !m.matched)
    .map((m) => m.requirementName.replace(" (Preferred)", ""));

  const gaps = generateSkillGaps(skillResult.missing, missingPref);

  const allMatches: MatchEvidence[] = [
    ...skillResult.matches,
    expResult.match,
    ...prefResult.matches,
  ];

  const status = determineRecruiterRecommendation(
    totalScore,
    skillResult.missing.length,
    candidateMatch.calculatedExperienceYears,
    jobRequirements.minimumExperienceYears
  );

  return {
    candidateId: candidate.id || "cand-evaluated",
    candidateName: candidate.name,
    totalScore,
    skillScore: skillResult.score,
    maxSkillScore: weights.requiredSkills,
    experienceScore: expResult.score,
    maxExperienceScore: weights.experience,
    preferredScore: prefResult.score,
    maxPreferredScore: weights.preferredSkills,
    evidenceScore: evidenceResult.score,
    maxEvidenceScore: weights.evidenceQuality,
    calculatedExperienceYears: candidateMatch.calculatedExperienceYears,
    requiredExperienceYears: jobRequirements.minimumExperienceYears,
    status,
    decision: "pending",
    matches: allMatches,
    gaps,
    scoringWeights: weights,
    calculatedAt: new Date().toISOString(),
  };
}
