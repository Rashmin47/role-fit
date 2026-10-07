/**
 * Nirman AI Structured Schemas
 * Type definitions, validators, and contract schemas for AI outputs.
 */

export type RequirementImportance = "required" | "preferred" | "bonus";
export type RequirementType = "skill" | "experience" | "education" | "domain" | "certification";

export interface ExtractedRequirement {
  id: string;
  name: string;
  type: RequirementType;
  importance: RequirementImportance;
  minimumYears?: number;
  description?: string;
  extractedEvidence?: string;
  confidence: number; // 0.0 to 1.0
}

export interface StructuredJobRequirements {
  title: string;
  summary?: string;
  department?: string;
  location?: string;
  minimumExperienceYears: number;
  requiredSkills: ExtractedRequirement[];
  preferredSkills: ExtractedRequirement[];
  educationRequirements: ExtractedRequirement[];
  responsibilities: string[];
  certifications: ExtractedRequirement[];
  domainKnowledge: string[];
  rawTextExcerpt?: string;
  confidence: number;
  extractedAt: string;
}

export interface ExtractedExperience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  years: number;
  description: string;
  technologies: string[];
  evidenceSnippet?: string;
}

export interface ExtractedEducation {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: number;
}

export interface ExtractedSkill {
  name: string;
  canonicalName?: string;
  category?: "language" | "framework" | "database" | "tool" | "cloud" | "methodology" | "other";
  level?: "Basic" | "Working knowledge" | "Strong" | "Expert";
  yearsOfExperience?: number;
  evidenceSnippet?: string;
}

export interface CandidateProfile {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  totalExperienceYears: number;
  skills: ExtractedSkill[];
  experience: ExtractedExperience[];
  education: ExtractedEducation[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    year?: number;
  }>;
  rawTextExcerpt?: string;
  confidence: number;
  extractedAt: string;
}

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
