/**
 * Candidate screening orchestration.
 *
 * This is the one place the UI should call to turn resume text into a scored
 * candidate. It enforces the product boundary:
 *
 *   provider extracts facts -> validator repairs/rejects -> deterministic code
 *   matches, scores, and routes.
 *
 * Providers are never allowed to return a score.
 */

import { getAIProvider } from "@/lib/ai/provider";
import {
  CandidateProfile,
  StructuredJobRequirements,
  validateCandidateProfileOutput,
} from "@/lib/ai/schemas";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import type {
  CandidateExtraction,
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
 * Convert a validated candidate profile into the deterministic engine shape.
 * No fabricated fields: optional values stay optional.
 */
export function candidateProfileToExtraction(
  profile: CandidateProfile,
  candidateId: string
): CandidateExtraction {
  return {
    id: candidateId,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    summary: profile.summary,
    totalExperienceYears: profile.totalExperienceYears,
    skills: profile.skills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      level: skill.level,
      yearsOfExperience: skill.yearsOfExperience,
    })),
    experience: profile.experience.map((experience) => ({
      company: experience.company,
      title: experience.title,
      startDate: experience.startDate ?? "",
      endDate: experience.endDate,
      current: experience.isCurrent,
      years: experience.years,
      description: experience.description,
      technologies: experience.technologies,
    })),
    education: profile.education.map((education) => ({
      institution: education.institution,
      degree: education.degree,
      field: education.field,
      graduationYear: education.graduationYear,
    })),
    projects: profile.projects,
    certifications: profile.certifications,
    rawResumeText: profile.rawTextExcerpt,
  };
}

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
  weights = DEFAULT_SCORING_WEIGHTS,
}: ScreenCandidateTextArgs): Promise<CandidateScoreResult> {
  const provider = getAIProvider();
  const rawProfile = await provider.extractCandidateProfile(text, name);
  const validated = validateCandidateProfileOutput(rawProfile, name);

  if (!validated.valid || !validated.data) {
    throw new Error(
      validated.errors?.join("; ") ||
        "Candidate extraction failed validation and was not scored."
    );
  }

  const extraction = candidateProfileToExtraction(
    validated.data,
    candidateId
  );

  const result = calculateFinalMatchScore(extraction, requirements, weights);

  return {
    ...result,
    candidateId,
    candidateName: validated.data.name,
    extractionConfidence: validated.data.confidence,
    extractionWarnings: validated.warnings,
  };
}
