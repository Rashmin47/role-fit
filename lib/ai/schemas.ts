/**
 * Role Fit AI Structured Schemas
 * Type definitions, validators, and contract schemas for AI outputs.
 */

import type {
  RequirementImportance,
  RequirementType,
  JobRequirement,
  ExtractedRequirement,
  StructuredJobRequirements,
  Experience,
  ExtractedExperience,
  Education,
  ExtractedEducation,
  Skill,
  ExtractedSkill,
  CandidateProfile,
} from "@/lib/domain/types";

export type {
  RequirementImportance,
  RequirementType,
  JobRequirement,
  ExtractedRequirement,
  StructuredJobRequirements,
  Experience,
  ExtractedExperience,
  Education,
  ExtractedEducation,
  Skill,
  ExtractedSkill,
  CandidateProfile,
};

/**
 * Validates and sanitizes raw AI response into StructuredJobRequirements
 */
export function validateJobRequirementsOutput(data: any): {
  valid: boolean;
  data?: StructuredJobRequirements;
  errors?: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["AI output is not a valid JSON object"] };
  }

  const title = typeof data.title === "string" && data.title.trim().length > 0
    ? data.title.trim()
    : "Untitled Role";

  const minExp = typeof data.minimumExperienceYears === "number" && data.minimumExperienceYears >= 0
    ? data.minimumExperienceYears
    : typeof data.minimumExperience === "number"
    ? data.minimumExperience
    : 2.0;

  const sanitizeRequirements = (list: any[], fallbackImportance: RequirementImportance): ExtractedRequirement[] => {
    if (!Array.isArray(list)) return [];
    return list
      .filter((item) => item && (typeof item.name === "string" || typeof item === "string"))
      .map((item, idx) => {
        const name = typeof item === "string" ? item.trim() : item.name.trim();
        return {
          id: item.id || `req-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${idx}`,
          name,
          type: item.type || "skill",
          importance: item.importance || fallbackImportance,
          minimumYears: item.minimumYears || undefined,
          description: item.description || undefined,
          extractedEvidence: item.evidence || item.extractedEvidence || undefined,
          confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0.9,
        };
      });
  };

  const requiredSkills = sanitizeRequirements(data.requiredSkills, "required");
  const preferredSkills = sanitizeRequirements(data.preferredSkills, "preferred");
  const educationReqs = sanitizeRequirements(data.educationRequirements || data.education, "required");
  const certReqs = sanitizeRequirements(data.certifications, "preferred");

  const responsibilities = Array.isArray(data.responsibilities)
    ? data.responsibilities.filter((r: any) => typeof r === "string")
    : [];

  const domainKnowledge = Array.isArray(data.domainKnowledge)
    ? data.domainKnowledge.filter((d: any) => typeof d === "string")
    : [];

  if (requiredSkills.length === 0 && preferredSkills.length === 0) {
    errors.push("No technical requirements extracted from text");
  }

  const structured: StructuredJobRequirements = {
    title,
    summary: data.summary || undefined,
    department: data.department || "Engineering",
    location: data.location || "Flexible / Remote",
    minimumExperienceYears: minExp,
    requiredSkills,
    preferredSkills,
    educationRequirements: educationReqs,
    responsibilities,
    certifications: certReqs,
    domainKnowledge,
    confidence: typeof data.confidence === "number" ? data.confidence : 0.95,
    extractedAt: new Date().toISOString(),
  };

  return {
    valid: errors.length === 0,
    data: structured,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export interface CandidateValidationResult {
  valid: boolean;
  data?: CandidateProfile;
  errors?: string[];
  warnings?: string[];
}

const SKILL_CATEGORIES = new Set([
  "language",
  "framework",
  "database",
  "tool",
  "cloud",
  "methodology",
  "other",
]);

const SKILL_LEVELS = new Set(["Basic", "Working knowledge", "Strong", "Expert"]);

const MAX_EXPERIENCE_YEARS = 60;
const MAX_RAW_TEXT_CHARS = 20_000;

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item).toLowerCase();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Validates and repairs a provider's candidate extraction before it can enter
 * matching or scoring. Providers are untrusted: they may return strings where
 * arrays are expected, negative years, or confidence values outside 0–1.
 *
 * Structural problems are repaired with warnings where possible. Only a
 * non-object payload is rejected outright. A valid-but-empty profile is
 * allowed on purpose: a resume with no verifiable evidence should still reach
 * the human review queue with a low score rather than disappear.
 */
export function validateCandidateProfileOutput(
  data: any,
  fallbackName?: string
): CandidateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(data)) {
    return {
      valid: false,
      errors: ["Candidate extraction output is not a valid JSON object"],
    };
  }

  let name = cleanString(data.name) ?? cleanString(fallbackName);
  if (!name) {
    name = "Unnamed candidate";
    warnings.push("Candidate name was missing; using a neutral placeholder.");
  }

  let totalExperienceYears = finiteNumber(data.totalExperienceYears);
  if (totalExperienceYears === undefined) {
    totalExperienceYears = 0;
    warnings.push("Total experience was missing; defaulting to 0 years.");
  } else if (totalExperienceYears < 0) {
    warnings.push("Total experience was negative; clamped to 0.");
    totalExperienceYears = 0;
  } else if (totalExperienceYears > MAX_EXPERIENCE_YEARS) {
    warnings.push(
      `Total experience exceeded ${MAX_EXPERIENCE_YEARS} years; capped for sanity.`
    );
    totalExperienceYears = MAX_EXPERIENCE_YEARS;
  }
  totalExperienceYears = Math.round(totalExperienceYears * 10) / 10;

  if (data.skills !== undefined && !Array.isArray(data.skills)) {
    warnings.push("Skills were not an array; ignoring the malformed value.");
  }
  const skills: ExtractedSkill[] = dedupeBy(
    (Array.isArray(data.skills) ? data.skills : [])
      .map((item: any): ExtractedSkill | null => {
        if (typeof item === "string") {
          const skillName = cleanString(item);
          return skillName ? { name: skillName } : null;
        }
        if (!isRecord(item)) return null;
        const skillName = cleanString(item.name);
        if (!skillName) return null;

        const category =
          typeof item.category === "string" && SKILL_CATEGORIES.has(item.category)
            ? (item.category as ExtractedSkill["category"])
            : undefined;
        const level =
          typeof item.level === "string" && SKILL_LEVELS.has(item.level)
            ? (item.level as ExtractedSkill["level"])
            : undefined;
        const years = finiteNumber(item.yearsOfExperience);

        return {
          name: skillName,
          canonicalName: cleanString(item.canonicalName),
          category,
          level,
          yearsOfExperience:
            years === undefined
              ? undefined
              : Math.round(
                  clamp(years, 0, MAX_EXPERIENCE_YEARS) * 10
                ) / 10,
          evidenceSnippet: cleanString(item.evidenceSnippet),
        };
      })
      .filter((item: ExtractedSkill | null): item is ExtractedSkill => !!item),
    (item) => item.name
  );

  if (data.experience !== undefined && !Array.isArray(data.experience)) {
    warnings.push("Experience was not an array; ignoring the malformed value.");
  }
  const experience: ExtractedExperience[] = dedupeBy(
    (Array.isArray(data.experience) ? data.experience : [])
      .map((item: any): ExtractedExperience | null => {
        if (!isRecord(item)) return null;
        const company = cleanString(item.company) ?? "";
        const title = cleanString(item.title) ?? "";
        if (!company && !title) return null;

        const years = finiteNumber(item.years);
        if (years !== undefined && years < 0) {
          warnings.push("An experience entry had negative years; clamped to 0.");
        }

        return {
          company,
          title,
          startDate: cleanString(item.startDate),
          endDate: cleanString(item.endDate),
          isCurrent:
            typeof item.isCurrent === "boolean" ? item.isCurrent : undefined,
          years: Math.round(clamp(years ?? 0, 0, MAX_EXPERIENCE_YEARS) * 10) / 10,
          description: cleanString(item.description) ?? "",
          technologies: cleanStringArray(item.technologies),
          evidenceSnippet: cleanString(item.evidenceSnippet),
        };
      })
      .filter((item: ExtractedExperience | null): item is ExtractedExperience => !!item),
    (item) => `${item.title}|${item.company}|${item.startDate ?? ""}`
  );

  if (data.education !== undefined && !Array.isArray(data.education)) {
    warnings.push("Education was not an array; ignoring the malformed value.");
  }
  const education: ExtractedEducation[] = dedupeBy(
    (Array.isArray(data.education) ? data.education : [])
      .map((item: any): ExtractedEducation | null => {
        if (!isRecord(item)) return null;
        const institution = cleanString(item.institution) ?? "";
        const degree = cleanString(item.degree) ?? "";
        const field = cleanString(item.field) ?? "";
        if (!institution && !degree && !field) return null;

        const graduationYear = finiteNumber(item.graduationYear);

        return {
          institution,
          degree,
          field,
          graduationYear:
            graduationYear === undefined
              ? undefined
              : Math.round(clamp(graduationYear, 1900, 2100)),
        };
      })
      .filter((item: ExtractedEducation | null): item is ExtractedEducation => !!item),
    (item) => `${item.institution}|${item.degree}`
  );

  const projects = (Array.isArray(data.projects) ? data.projects : [])
    .map((item: any) => {
      if (!isRecord(item)) return null;
      const projectName = cleanString(item.name);
      const description = cleanString(item.description);
      if (!projectName && !description) return null;
      return {
        name: projectName ?? "Untitled project",
        description: description ?? "",
        technologies: cleanStringArray(item.technologies),
      };
    })
    .filter(
      (
        item: { name: string; description: string; technologies: string[] } | null
      ): item is { name: string; description: string; technologies: string[] } =>
        !!item
    );

  const certifications: Array<{
    name: string;
    issuer: string;
    year?: number;
  }> = (Array.isArray(data.certifications) ? data.certifications : [])
    .map((item: any): { name: string; issuer: string; year?: number } | null => {
      if (!isRecord(item)) return null;
      const certName = cleanString(item.name);
      if (!certName) return null;
      const year = finiteNumber(item.year);
      return {
        name: certName,
        issuer: cleanString(item.issuer) ?? "Not specified",
        year:
          year === undefined ? undefined : Math.round(clamp(year, 1900, 2100)),
      };
    })
    .filter(
      (item: { name: string; issuer: string; year?: number } | null): item is {
        name: string;
        issuer: string;
        year?: number;
      } => item !== null
    );

  let confidence = finiteNumber(data.confidence);
  if (confidence === undefined) {
    confidence = 0.5;
    warnings.push("Extraction confidence was missing; defaulting to 0.5.");
  } else if (confidence < 0 || confidence > 1) {
    warnings.push("Extraction confidence was outside 0–1; clamped.");
    confidence = clamp(confidence, 0, 1);
  }

  if (skills.length === 0) {
    warnings.push("No structured skills were extracted.");
  }
  if (experience.length === 0) {
    warnings.push("No work-history entries were extracted.");
  }
  if (education.length === 0) {
    warnings.push("No education entries were extracted.");
  }

  const structured: CandidateProfile = {
    id: cleanString(data.id),
    name,
    email: cleanString(data.email),
    phone: cleanString(data.phone),
    location: cleanString(data.location),
    summary: cleanString(data.summary),
    totalExperienceYears,
    skills,
    experience,
    education,
    projects: projects.length > 0 ? projects : undefined,
    certifications: certifications.length > 0 ? certifications : undefined,
    rawTextExcerpt: cleanString(data.rawTextExcerpt)?.slice(0, MAX_RAW_TEXT_CHARS),
    confidence: Math.round(confidence * 100) / 100,
    extractedAt: cleanString(data.extractedAt) ?? new Date().toISOString(),
  };

  return {
    valid: errors.length === 0,
    data: structured,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
