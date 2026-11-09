/**
 * Role Fit Canonical Domain Types
 *
 * Single source of truth for recruitment domain entities, deterministic scoring
 * inputs and outputs, and market intelligence.
 *
 * AI output contracts in `lib/ai/schemas.ts` and presentation types in `types/index.ts`
 * resolve to these canonical domain types.
 */

export type MatchStatus = "Strong Match" | "Review" | "Needs Verification";
export type DecisionStatus = "pending" | "shortlisted" | "held" | "not_recommended";

export type RequirementImportance = "required" | "preferred" | "bonus";
export type RequirementType =
  | "skill"
  | "experience"
  | "education"
  | "domain"
  | "certification"
  | "required_skill"
  | "preferred_skill";

export interface Skill {
  name: string;
  canonicalName?: string;
  category?: "language" | "framework" | "database" | "tool" | "cloud" | "methodology" | "other";
  level?: "Basic" | "Working knowledge" | "Strong" | "Expert";
  yearsOfExperience?: number;
  evidenceSnippet?: string;
}

export type ExtractedSkill = Skill;

export interface Experience {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  isCurrent?: boolean;
  years: number;
  description: string;
  technologies: string[];
  evidenceSnippet?: string;
}

export type ExtractedExperience = Experience;

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: number;
}

export type ExtractedEducation = Education;

export interface Project {
  name: string;
  description: string;
  technologies: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  year?: number;
}

export interface CandidateProfile {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  totalExperienceYears: number;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  projects?: Project[];
  certifications?: Certification[];
  rawTextExcerpt?: string;
  rawResumeText?: string;
  confidence?: number;
  extractedAt?: string;
}

/**
 * Backward-compatible alias for CandidateProfile.
 */
export type CandidateExtraction = CandidateProfile;

export interface JobRequirement {
  id: string;
  name: string;
  type: RequirementType;
  importance?: RequirementImportance;
  minimumYears?: number;
  description?: string;
  extractedEvidence?: string;
  confidence?: number;
  weight?: number;
}

export type ExtractedRequirement = JobRequirement;

export interface JobRequirements {
  id: string;
  title: string;
  summary?: string;
  department?: string;
  location?: string;
  rawDescription: string;
  minimumExperienceYears: number;
  requiredSkills: JobRequirement[];
  preferredSkills: JobRequirement[];
  educationRequirements?: JobRequirement[];
  responsibilities: string[];
  certifications?: JobRequirement[];
  domainKnowledge?: string[];
  confidence?: number;
  extractedAt?: string;
}

export interface StructuredJobRequirements {
  id?: string;
  title: string;
  summary?: string;
  department?: string;
  location?: string;
  minimumExperienceYears: number;
  requiredSkills: JobRequirement[];
  preferredSkills: JobRequirement[];
  educationRequirements: JobRequirement[];
  responsibilities: string[];
  certifications: JobRequirement[];
  domainKnowledge: string[];
  rawTextExcerpt?: string;
  rawDescription?: string;
  confidence: number;
  extractedAt: string;
}

export interface MatchEvidence {
  requirementId: string;
  requirementName: string;
  matched: boolean;
  candidateValue?: string;
  evidenceSnippet?: string;
  sourceDocument?: string;
  confidenceNotes?: string;
}

export interface SkillGap {
  skill: string;
  category: "required" | "preferred" | "depth";
  importance: "high" | "medium" | "low";
  marketFrequency?: number;
  whyItMatters: string;
  evidenceFromRequirements: string;
  suggestedLearningDirection: string;
}

export interface ScoringWeights {
  requiredSkills: number; // default 50
  experience: number;     // default 25
  preferredSkills: number;// default 15
  evidenceQuality: number;// default 10
}

export interface CandidateScoreResult {
  candidateId: string;
  candidateName: string;
  totalScore: number;
  skillScore: number;
  maxSkillScore: number;
  experienceScore: number;
  maxExperienceScore: number;
  preferredScore: number;
  maxPreferredScore: number;
  evidenceScore: number;
  maxEvidenceScore: number;
  calculatedExperienceYears: number;
  requiredExperienceYears: number;
  status: MatchStatus;
  decision: DecisionStatus;
  /** Confidence of the underlying candidate extraction (0–1). */
  extractionConfidence?: number;
  /** Non-fatal extraction warnings, e.g. no work history found. */
  extractionWarnings?: string[];
  /** Recruiter notes captured in the detail view. */
  reviewNotes?: string;
  /** ISO timestamp of the last human decision. */
  reviewedAt?: string;
  matches: MatchEvidence[];
  gaps: SkillGap[];
  scoringWeights: ScoringWeights;
  calculatedAt: string;
}

export interface JobScreening {
  id: string;
  title: string;
  department: string;
  location: string;
  createdAt: string;
  status: "draft" | "extracting" | "ready" | "completed";
  candidateCount: number;
  reviewedCount: number;
  shortlistedCount: number;
  requirements: JobRequirements;
  candidates: CandidateScoreResult[];
  /** True when candidates come from the bundled fictional demo set. */
  isSample?: boolean;
  /** Non-fatal ingestion notes: unreadable files or failed candidates. */
  processingNotes?: string[];
}

export interface MarketRequirementStat {
  skill: string;
  frequency: number; // percentage (0-100)
  category: "Language" | "Framework" | "Database" | "Tool" | "Cloud" | "Architecture";
  priority: "High" | "Medium" | "Emerging";
  trend: "growing" | "stable" | "declining";
}

export interface ExperienceDistribution {
  range: string;
  percentage: number;
  description: string;
}

export interface CareerRoleIntelligence {
  roleId: string;
  roleTitle: string;
  summary: string;
  totalPostingsAnalyzed: number;
  lastUpdated: string;
  requirements: MarketRequirementStat[];
  experienceExpectations: ExperienceDistribution[];
  skillPriorities: {
    high: string[];
    medium: string[];
    emerging: string[];
  };
  sampleUserGaps?: {
    userProfileName: string;
    targetRole: string;
    currentSkills: { name: string; level: "Strong" | "Working knowledge" | "Basic" | "Missing" }[];
    priorityGaps: SkillGap[];
  };
}

export interface ObservedCompanyRequirement {
  companyName: string;
  industry: string;
  targetRole: string;
  rolesAnalyzedCount: number;
  topRequestedSkills: { name: string; percentage: number }[];
  recentRequirementChanges: string[];
  experienceDistribution: { range: string; percentage: number }[];
  lastObservedDate: string;
}

