/**
 * Nirman Retrieval & RAG Foundation
 * Grounds AI reasoning and market intelligence on structured, verifiable job postings.
 */

import { SAMPLE_CAREER_ROLES, SAMPLE_COMPANIES } from "../data/sample-data";

export interface RetrievedJobPosting {
  id: string;
  companyName: string;
  roleTitle: string;
  source: string; // e.g. "Public Engineering Job Board"
  observedDate: string;
  extractedSkills: string[];
  minimumExperienceYears: number;
  snippet: string;
}

export interface RetrievedMarketEvidence {
  roleTitle: string;
  postingsCount: number;
  topSkillsWithFrequency: Array<{ skill: string; frequencyPercent: number }>;
  experienceBrackets: Array<{ range: string; percentage: number }>;
  citations: Array<{ company: string; excerpt: string; date: string }>;
  evidenceLabel: "Sample market dataset";
}

const SAMPLE_POSTINGS_REPOSITORY: RetrievedJobPosting[] = [
  {
    id: "post-01",
    companyName: "Apex FinTech Services",
    roleTitle: "Python Backend Developer",
    source: "Company Career Page",
    observedDate: "2026-10-01",
    extractedSkills: ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis"],
    minimumExperienceYears: 3,
    snippet: "Seeking 3+ years backend experience with Python, FastAPI, and PostgreSQL ledger schemas.",
  },
  {
    id: "post-02",
    companyName: "CloudScale Systems",
    roleTitle: "Backend Software Engineer",
    source: "Tech Jobs Board",
    observedDate: "2026-09-28",
    extractedSkills: ["Python", "PostgreSQL", "Docker", "AWS", "CI/CD"],
    minimumExperienceYears: 3,
    snippet: "Building high-performance distributed systems using Python and containerized microservices.",
  },
  {
    id: "post-03",
    companyName: "DataPulse Analytics",
    roleTitle: "Python Platform Engineer",
    source: "Verified Job Posting",
    observedDate: "2026-09-25",
    extractedSkills: ["Python", "FastAPI", "PostgreSQL", "Redis", "Testing (PyTest)"],
    minimumExperienceYears: 2,
    snippet: "Focus on API performance, Redis cache-aside strategies, and automated PyTest validation.",
  },
];

/**
 * Retrieves relevant structured job postings matching a target role and technical capabilities
 */
export async function retrieveRelevantJobPostings(
  role: string,
  skills: string[] = []
): Promise<RetrievedJobPosting[]> {
  const roleLower = (role || "").toLowerCase();
  return SAMPLE_POSTINGS_REPOSITORY.filter((post) => {
    const titleMatch = post.roleTitle.toLowerCase().includes(roleLower) || roleLower.includes("backend");
    const skillMatch = skills.length === 0 || post.extractedSkills.some((s) => skills.includes(s));
    return titleMatch || skillMatch;
  });
}

/**
 * Retrieves aggregated market evidence and source citations for grounded explanations
 */
export async function retrieveMarketEvidence(roleId: string): Promise<RetrievedMarketEvidence> {
  const roleData = SAMPLE_CAREER_ROLES[roleId] || SAMPLE_CAREER_ROLES["python-backend-developer"];

  const citations = SAMPLE_POSTINGS_REPOSITORY.map((p) => ({
    company: p.companyName,
    excerpt: p.snippet,
    date: p.observedDate,
  }));

  return {
    roleTitle: roleData.roleTitle,
    postingsCount: roleData.totalPostingsAnalyzed,
    topSkillsWithFrequency: roleData.requirements.map((r) => ({
      skill: r.skill,
      frequencyPercent: r.frequency,
    })),
    experienceBrackets: roleData.experienceExpectations.map((e) => ({
      range: e.range,
      percentage: e.percentage,
    })),
    citations,
    evidenceLabel: "Sample market dataset",
  };
}
