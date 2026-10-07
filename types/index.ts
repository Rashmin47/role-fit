export type MatchStatus = "Strong Match" | "Review" | "Needs Verification";
export type DecisionStatus = "pending" | "shortlisted" | "held" | "not_recommended";

export interface Skill {
  name: string;
  category?: "language" | "framework" | "database" | "tool" | "cloud" | "methodology" | "other";
  level?: "Basic" | "Working knowledge" | "Strong" | "Expert";
  yearsOfExperience?: number;
}

export interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  years: number;
  description: string;
  technologies: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: number;
}

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

export interface CandidateExtraction {
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
  rawResumeText?: string;
}

export interface JobRequirement {
  id: string;
  name: string;
  type: "required_skill" | "preferred_skill" | "experience" | "education" | "domain";
  description?: string;
  weight?: number;
  minimumYears?: number;
}

export interface JobRequirements {
  id: string;
  title: string;
  department?: string;
  location?: string;
  rawDescription: string;
  minimumExperienceYears: number;
  requiredSkills: JobRequirement[];
  preferredSkills: JobRequirement[];
  educationRequirements?: JobRequirement[];
  responsibilities: string[];
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
