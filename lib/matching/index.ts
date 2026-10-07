/**
 * Nirman Matching Engine Foundation
 * Pure deterministic alignment between StructuredJobRequirements and CandidateProfile.
 */

import { StructuredJobRequirements, CandidateProfile } from "../ai/schemas";
import { normalizeSkillName, matchSkills } from "../normalization/skills";

export interface RequirementMatchItem {
  requirementId: string;
  name: string;
  type: "skill" | "experience" | "education" | "domain" | "certification";
  importance: "required" | "preferred" | "bonus";
  status: "MATCH" | "PARTIAL" | "NOT_FOUND";
  candidateStatedValue?: string;
  evidenceSnippet?: string;
  sourceDocument: string;
  confidence: number;
}

export interface CandidateMatchResult {
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  matchedRequirements: RequirementMatchItem[];
  missingRequirements: RequirementMatchItem[];
  partialMatches: RequirementMatchItem[];
  totalRequirementsCount: number;
  matchedCount: number;
  missingRequiredCount: number;
  calculatedExperienceYears: number;
  requiredExperienceYears: number;
  experienceMet: boolean;
  reviewFlags: string[];
  evaluatedAt: string;
}

export function evaluateCandidateMatch(
  candidate: CandidateProfile,
  job: StructuredJobRequirements
): CandidateMatchResult {
  const matchedRequirements: RequirementMatchItem[] = [];
  const missingRequirements: RequirementMatchItem[] = [];
  const partialMatches: RequirementMatchItem[] = [];
  const reviewFlags: string[] = [];

  const allJobRequirements = [
    ...job.requiredSkills,
    ...job.preferredSkills,
  ];

  for (const req of allJobRequirements) {
    const canonicalReq = normalizeSkillName(req.name);

    // 1. Check in candidate explicit skills
    const skillMatch = candidate.skills.find((s) => matchSkills(s.name, canonicalReq));

    // 2. Check in candidate work experience descriptions & technologies
    let expEvidence = "";
    let foundInWork = false;
    for (const exp of candidate.experience) {
      const hasTech = exp.technologies?.some((t) => matchSkills(t, canonicalReq));
      const hasDesc = exp.description?.toLowerCase().includes(canonicalReq.toLowerCase());
      if (hasTech || hasDesc) {
        foundInWork = true;
        expEvidence = `Applied in role as ${exp.title} at ${exp.company} (${exp.years}y): "${exp.description.slice(0, 100)}..."`;
        break;
      }
    }

    if (skillMatch || foundInWork) {
      const isStrong = skillMatch?.level === "Strong" || skillMatch?.level === "Expert" || foundInWork;
      const matchItem: RequirementMatchItem = {
        requirementId: req.id,
        name: canonicalReq,
        type: req.type,
        importance: req.importance,
        status: isStrong ? "MATCH" : "PARTIAL",
        candidateStatedValue: skillMatch?.level || (foundInWork ? "Demonstrated in Work History" : "Present"),
        evidenceSnippet: expEvidence || `Listed in resume profile: "${skillMatch?.name}"`,
        sourceDocument: "Resume",
        confidence: 0.95,
      };

      if (isStrong) {
        matchedRequirements.push(matchItem);
      } else {
        partialMatches.push(matchItem);
        reviewFlags.push(`Partial depth on ${canonicalReq} (${skillMatch?.level})`);
      }
    } else {
      const missingItem: RequirementMatchItem = {
        requirementId: req.id,
        name: canonicalReq,
        type: req.type,
        importance: req.importance,
        status: "NOT_FOUND",
        candidateStatedValue: "Not found",
        evidenceSnippet: "No direct keyword or project citation in candidate documentation",
        sourceDocument: "Resume",
        confidence: 0.9,
      };
      missingRequirements.push(missingItem);

      if (req.importance === "required") {
        reviewFlags.push(`Missing mandatory requirement: ${canonicalReq}`);
      }
    }
  }

  // Evaluate Experience Threshold
  const candidateYears = candidate.totalExperienceYears;
  const requiredYears = job.minimumExperienceYears;
  const experienceMet = candidateYears >= requiredYears;

  if (!experienceMet) {
    reviewFlags.push(
      `Experience duration below minimum requirement (${candidateYears.toFixed(1)}y vs ${requiredYears}y required)`
    );
  }

  const missingRequiredCount = missingRequirements.filter((r) => r.importance === "required").length;

  return {
    candidateId: candidate.id || `cand-${candidate.name.toLowerCase().replace(/\s+/g, "-")}`,
    candidateName: candidate.name,
    jobTitle: job.title,
    matchedRequirements,
    missingRequirements,
    partialMatches,
    totalRequirementsCount: allJobRequirements.length,
    matchedCount: matchedRequirements.length + partialMatches.length,
    missingRequiredCount,
    calculatedExperienceYears: candidateYears,
    requiredExperienceYears: requiredYears,
    experienceMet,
    reviewFlags,
    evaluatedAt: new Date().toISOString(),
  };
}
