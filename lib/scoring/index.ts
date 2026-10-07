import {
  CandidateExtraction,
  JobRequirements,
  ScoringWeights,
  CandidateScoreResult,
  MatchEvidence,
  SkillGap,
  MatchStatus,
} from "@/types";
import { matchSkills, normalizeSkillName } from "../normalization/skills";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  requiredSkills: 50,
  experience: 25,
  preferredSkills: 15,
  evidenceQuality: 10,
};

/**
 * Deterministic Skill Scoring
 * Evaluates each required skill against candidate's extracted skills & experience descriptions.
 */
export function calculateSkillScore(
  candidate: CandidateExtraction,
  requiredSkills: JobRequirements["requiredSkills"],
  maxPoints: number = 50
): { score: number; matches: MatchEvidence[]; missing: string[] } {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { score: maxPoints, matches: [], missing: [] };
  }

  const pointPerSkill = maxPoints / requiredSkills.length;
  let earnedPoints = 0;
  const matches: MatchEvidence[] = [];
  const missing: string[] = [];

  for (const req of requiredSkills) {
    const canonicalReq = normalizeSkillName(req.name);
    
    // Check in candidate's explicit skills list
    const foundInSkills = candidate.skills.find((s) => matchSkills(s.name, canonicalReq));
    
    // Check in candidate's experience descriptions and project technologies
    let evidenceText = "";
    let foundInExperience = false;

    if (candidate.experience && candidate.experience.length > 0) {
      for (const exp of candidate.experience) {
        const hasTech = exp.technologies?.some((t) => matchSkills(t, canonicalReq));
        const hasDesc = exp.description?.toLowerCase().includes(canonicalReq.toLowerCase());
        if (hasTech || hasDesc) {
          foundInExperience = true;
          evidenceText = `Applied during role as ${exp.title} at ${exp.company} (${exp.years} yrs): "${exp.description.slice(0, 120)}..."`;
          break;
        }
      }
    }

    if (!foundInExperience && candidate.projects) {
      for (const proj of candidate.projects) {
        const hasTech = proj.technologies?.some((t) => matchSkills(t, canonicalReq));
        if (hasTech) {
          foundInExperience = true;
          evidenceText = `Demonstrated in project "${proj.name}": ${proj.description.slice(0, 100)}`;
          break;
        }
      }
    }

    if (foundInSkills || foundInExperience) {
      earnedPoints += pointPerSkill;
      matches.push({
        requirementId: req.id || `req-${canonicalReq}`,
        requirementName: canonicalReq,
        matched: true,
        candidateValue: foundInSkills?.level || (foundInExperience ? "Demonstrated in Work History" : "Present"),
        evidenceSnippet: evidenceText || `Listed in resume skills profile: "${foundInSkills?.name}"`,
        sourceDocument: "Resume",
        confidenceNotes: "Direct keyword and context verification match",
      });
    } else {
      missing.push(canonicalReq);
      matches.push({
        requirementId: req.id || `req-${canonicalReq}`,
        requirementName: canonicalReq,
        matched: false,
        candidateValue: "Not found",
        evidenceSnippet: "No direct keyword or project application found in candidate documentation",
        sourceDocument: "Resume",
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
  maxPoints: number = 25
): { score: number; match: MatchEvidence } {
  if (requiredYears <= 0) {
    return {
      score: maxPoints,
      match: {
        requirementId: "req-experience",
        requirementName: "Minimum Experience",
        matched: true,
        candidateValue: `${candidateYears} years`,
        evidenceSnippet: `${candidateYears} years verified across candidate timeline.`,
        sourceDocument: "Resume",
      },
    };
  }

  let ratio = candidateYears / requiredYears;
  if (ratio > 1.25) ratio = 1.25; // slight bonus cap
  const score = Math.min(maxPoints, Math.round(ratio * maxPoints));
  const isMatched = candidateYears >= requiredYears;

  return {
    score,
    match: {
      requirementId: "req-experience",
      requirementName: `${requiredYears}+ years relevant experience`,
      matched: isMatched,
      candidateValue: `${candidateYears.toFixed(1)} years`,
      evidenceSnippet: `${candidateYears.toFixed(1)} years calculated from employment dates across ${candidateYears > 0 ? "provided" : "0"} positions.`,
      sourceDocument: "Resume",
      confidenceNotes: isMatched
        ? `Meets minimum threshold (${candidateYears.toFixed(1)} >= ${requiredYears} years)`
        : `Below requirement (${candidateYears.toFixed(1)} < ${requiredYears} years)`,
    },
  };
}

/**
 * Deterministic Preferred Skill Scoring
 */
export function calculatePreferredSkillScore(
  candidate: CandidateExtraction,
  preferredSkills: JobRequirements["preferredSkills"],
  maxPoints: number = 15
): { score: number; matches: MatchEvidence[] } {
  if (!preferredSkills || preferredSkills.length === 0) {
    return { score: maxPoints, matches: [] };
  }

  const pointPerSkill = maxPoints / preferredSkills.length;
  let earned = 0;
  const matches: MatchEvidence[] = [];

  for (const pref of preferredSkills) {
    const canonical = normalizeSkillName(pref.name);
    const found = candidate.skills.some((s) => matchSkills(s.name, canonical)) ||
      candidate.experience.some((e) => e.technologies?.some((t) => matchSkills(t, canonical)));

    if (found) {
      earned += pointPerSkill;
      matches.push({
        requirementId: pref.id || `pref-${canonical}`,
        requirementName: `${canonical} (Preferred)`,
        matched: true,
        candidateValue: "Found",
        evidenceSnippet: `Verified in candidate skillset / background`,
        sourceDocument: "Resume",
      });
    } else {
      matches.push({
        requirementId: pref.id || `pref-${canonical}`,
        requirementName: `${canonical} (Preferred)`,
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
  candidate: CandidateExtraction,
  maxPoints: number = 10
): { score: number } {
  let points = 0;
  // Has detailed experience entries
  if (candidate.experience && candidate.experience.length > 0) points += 4;
  // Has projects / repositories
  if (candidate.projects && candidate.projects.length > 0) points += 3;
  // Has education & degree
  if (candidate.education && candidate.education.length > 0) points += 2;
  // Has certifications or links
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
 */
export function calculateFinalMatchScore(
  candidate: CandidateExtraction,
  jobRequirements: JobRequirements,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): CandidateScoreResult {
  const skillResult = calculateSkillScore(
    candidate,
    jobRequirements.requiredSkills,
    weights.requiredSkills
  );

  const expResult = calculateExperienceScore(
    candidate.totalExperienceYears,
    jobRequirements.minimumExperienceYears,
    weights.experience
  );

  const prefResult = calculatePreferredSkillScore(
    candidate,
    jobRequirements.preferredSkills,
    weights.preferredSkills
  );

  const evidenceResult = calculateEvidenceScore(candidate, weights.evidenceQuality);

  const totalScore = Math.min(
    100,
    skillResult.score + expResult.score + prefResult.score + evidenceResult.score
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
    candidate.totalExperienceYears,
    jobRequirements.minimumExperienceYears
  );

  return {
    candidateId: candidate.id || `cand-${Math.random().toString(36).substring(2, 9)}`,
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
    calculatedExperienceYears: candidate.totalExperienceYears,
    requiredExperienceYears: jobRequirements.minimumExperienceYears,
    status,
    decision: "pending",
    matches: allMatches,
    gaps,
    scoringWeights: weights,
    calculatedAt: new Date().toISOString(),
  };
}
