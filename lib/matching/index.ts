/**
 * Role Fit Matching Engine Foundation
 * Pure deterministic alignment between JobRequirements and CandidateProfile.
 *
 * Single source of truth for:
 * 1. Matching candidate facts (skills, experience, projects) to job requirements.
 * 2. Citing deterministic evidence snippets and depth levels.
 * 3. Verifying experience duration and flagging timeline discrepancies.
 */

import type {
  CandidateProfile,
  JobRequirement,
  JobRequirements,
  StructuredJobRequirements,
  RequirementType,
  RequirementImportance,
} from "@/types";
import { normalizeSkillName, matchSkills } from "../normalization/skills";
import { calculateExperienceFromDates } from "../normalization/experience";

export interface RequirementMatchItem {
  requirementId: string;
  name: string;
  type: RequirementType;
  importance: RequirementImportance;
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
  timelineExplanation?: string;
  evaluatedAt: string;
}

export interface EvaluateMatchOptions {
  asOf?: Date;
}

/**
 * Evaluates a single job requirement against candidate profile evidence.
 * Scans candidate explicit skills, experience technologies & descriptions, and project technologies.
 */
export function evaluateRequirementMatch(
  candidate: CandidateProfile,
  req: JobRequirement
): RequirementMatchItem {
  const canonicalReq = normalizeSkillName(req.name);
  const importance: RequirementImportance = req.importance || (req.type === "preferred_skill" ? "preferred" : "required");

  // 1. Check in candidate explicit skills
  const skillMatch = candidate.skills?.find((s) => matchSkills(s.name, canonicalReq));

  // 2. Check in candidate work experience descriptions & technologies
  let expEvidence = "";
  let foundInWork = false;
  if (candidate.experience && candidate.experience.length > 0) {
    for (const exp of candidate.experience) {
      const hasTech = exp.technologies?.some((t) => matchSkills(t, canonicalReq));
      const hasDesc = exp.description?.toLowerCase().includes(canonicalReq.toLowerCase());
      if (hasTech || hasDesc) {
        foundInWork = true;
        const yearsStr = typeof exp.years === "number" && exp.years > 0 ? ` (${exp.years}y)` : "";
        expEvidence = `Applied in role as ${exp.title} at ${exp.company}${yearsStr}: "${exp.description.slice(0, 100)}..."`;
        break;
      }
    }
  }

  // 3. Check in candidate projects (technologies and description)
  let projEvidence = "";
  let foundInProjects = false;
  if (!foundInWork && candidate.projects && candidate.projects.length > 0) {
    for (const proj of candidate.projects) {
      const hasTech = proj.technologies?.some((t) => matchSkills(t, canonicalReq));
      const hasDesc = proj.description?.toLowerCase().includes(canonicalReq.toLowerCase());
      if (hasTech || hasDesc) {
        foundInProjects = true;
        projEvidence = `Demonstrated in project "${proj.name}": ${proj.description.slice(0, 100)}`;
        break;
      }
    }
  }

  const isPresent = Boolean(skillMatch || foundInWork || foundInProjects);

  if (isPresent) {
    const isStrong =
      skillMatch?.level === "Strong" ||
      skillMatch?.level === "Expert" ||
      foundInWork ||
      foundInProjects;

    const statedValue =
      skillMatch?.level ||
      (foundInWork ? "Demonstrated in Work History" : foundInProjects ? "Demonstrated in Projects" : "Present");

    const snippet =
      expEvidence ||
      projEvidence ||
      skillMatch?.evidenceSnippet ||
      `Listed in resume profile: "${skillMatch?.name}"`;

    return {
      requirementId: req.id || `req-${canonicalReq.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      name: canonicalReq,
      type: req.type,
      importance,
      status: isStrong ? "MATCH" : "PARTIAL",
      candidateStatedValue: statedValue,
      evidenceSnippet: snippet,
      sourceDocument: "Resume",
      confidence: 0.95,
    };
  }

  return {
    requirementId: req.id || `req-${canonicalReq.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    name: canonicalReq,
    type: req.type,
    importance,
    status: "NOT_FOUND",
    candidateStatedValue: "Not found",
    evidenceSnippet: "No direct keyword or project citation in candidate documentation",
    sourceDocument: "Resume",
    confidence: 0.9,
  };
}

/**
 * Pure deterministic alignment between JobRequirements and CandidateProfile.
 */
export function evaluateCandidateMatch(
  candidate: CandidateProfile,
  job: JobRequirements | StructuredJobRequirements,
  options: EvaluateMatchOptions = {}
): CandidateMatchResult {
  const matchedRequirements: RequirementMatchItem[] = [];
  const missingRequirements: RequirementMatchItem[] = [];
  const partialMatches: RequirementMatchItem[] = [];
  const reviewFlags: string[] = [];

  const allJobRequirements: JobRequirement[] = [
    ...(job.requiredSkills || []),
    ...(job.preferredSkills || []),
  ];

  for (const req of allJobRequirements) {
    const matchItem = evaluateRequirementMatch(candidate, req);

    if (matchItem.status === "MATCH") {
      matchedRequirements.push(matchItem);
    } else if (matchItem.status === "PARTIAL") {
      partialMatches.push(matchItem);
      reviewFlags.push(`Partial depth on ${matchItem.name} (${matchItem.candidateStatedValue})`);
    } else {
      missingRequirements.push(matchItem);
      if (matchItem.importance === "required") {
        reviewFlags.push(`Missing mandatory requirement: ${matchItem.name}`);
      }
    }
  }

  // Calculate experience from date intervals with overlap deduplication
  const expCalc = calculateExperienceFromDates(
    candidate.experience || [],
    candidate.totalExperienceYears,
    { asOf: options.asOf }
  );

  const candidateYears = expCalc.calculatedYears;
  const requiredYears = job.minimumExperienceYears;
  const experienceMet = candidateYears >= requiredYears;

  if (!experienceMet) {
    reviewFlags.push(
      `Experience duration below minimum requirement (${candidateYears.toFixed(1)}y vs ${requiredYears.toFixed(1)}y required)`
    );
  }

  if (expCalc.discrepancy?.isSignificant) {
    reviewFlags.push(expCalc.discrepancy.note);
  }

  if (expCalc.hasOverlaps) {
    reviewFlags.push(
      `Candidate has overlapping positions (${(expCalc.overlappingMonths / 12).toFixed(1)}y concurrent experience merged)`
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
    timelineExplanation: expCalc.timelineExplanation,
    evaluatedAt: new Date().toISOString(),
  };
}
