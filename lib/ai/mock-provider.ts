import {
  StructuredJobRequirements,
  CandidateProfile,
  validateJobRequirementsOutput,
} from "./schemas";
import { normalizeSkillName } from "../normalization/skills";

export class MockAIProvider {
  name = "Local Rule & Pattern Extractor (Offline)";

  async extractJobRequirements(
    jobTitle: string,
    rawDescription: string
  ): Promise<StructuredJobRequirements> {
    const text = rawDescription || "";

    // 1. Minimum experience extraction
    let minExp = 3.0;
    const expRegex = /(\d+(\.\d+)?)\s*\+?\s*(years?|yrs?|yr)/i;
    const expMatch = text.match(expRegex);
    if (expMatch) {
      minExp = parseFloat(expMatch[1]);
    }

    // 2. Technical skill recognition catalog
    const knownCatalog = [
      { name: "Python", category: "language", aliases: ["python", "py", "python3"] },
      { name: "FastAPI", category: "framework", aliases: ["fastapi", "fast-api", "fast api"] },
      { name: "PostgreSQL", category: "database", aliases: ["postgresql", "postgres", "psql"] },
      { name: "Docker", category: "tool", aliases: ["docker", "containerization"] },
      { name: "Redis", category: "database", aliases: ["redis", "caching"] },
      { name: "AWS", category: "cloud", aliases: ["aws", "amazon web services"] },
      { name: "Kubernetes", category: "cloud", aliases: ["k8s", "kubernetes"] },
      { name: "Testing (PyTest)", category: "tool", aliases: ["pytest", "unit testing", "testing"] },
      { name: "CI/CD", category: "tool", aliases: ["ci/cd", "cicd", "github actions"] },
      { name: "React", category: "framework", aliases: ["react", "react.js", "reactjs"] },
      { name: "TypeScript", category: "language", aliases: ["typescript", "ts"] },
      { name: "Node.js", category: "framework", aliases: ["node", "nodejs", "node.js"] },
    ];

    const requiredSkills: any[] = [];
    const preferredSkills: any[] = [];

    // Scan description
    for (const item of knownCatalog) {
      const isMatched = item.aliases.some((alias) => {
        const reg = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        return reg.test(text);
      });

      if (isMatched) {
        const canonical = normalizeSkillName(item.name);
        // Detect if listed in "preferred", "nice to have", "plus"
        const isPreferred = /preferred|plus|nice to have|optional|bonus/i.test(
          text.slice(Math.max(0, text.indexOf(item.name) - 100), text.indexOf(item.name) + 100)
        );

        const reqObj = {
          id: `req-${canonical.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: canonical,
          type: "skill" as const,
          importance: isPreferred ? ("preferred" as const) : ("required" as const),
          description: `${canonical} proficiency verified for ${jobTitle} workflows.`,
          extractedEvidence: `Identified keyword pattern in job description context.`,
          confidence: 0.96,
        };

        if (isPreferred) {
          preferredSkills.push(reqObj);
        } else {
          requiredSkills.push(reqObj);
        }
      }
    }

    // Default fallbacks for clean demo if user entered custom short text
    if (requiredSkills.length === 0) {
      requiredSkills.push(
        { id: "req-python", name: "Python", type: "skill", importance: "required", confidence: 0.98, extractedEvidence: "Core programming language requirement" },
        { id: "req-fastapi", name: "FastAPI", type: "skill", importance: "required", confidence: 0.95, extractedEvidence: "Web API framework requirement" },
        { id: "req-postgresql", name: "PostgreSQL", type: "skill", importance: "required", confidence: 0.96, extractedEvidence: "Database persistence layer requirement" },
        { id: "req-docker", name: "Docker", type: "skill", importance: "required", confidence: 0.92, extractedEvidence: "Container runtime requirement" }
      );
      preferredSkills.push(
        { id: "req-redis", name: "Redis", type: "skill", importance: "preferred", confidence: 0.88, extractedEvidence: "In-memory caching optional capability" }
      );
    }

    const structured = {
      title: jobTitle || "Software Engineer",
      summary: `Structured role requirements for ${jobTitle}.`,
      department: "Engineering",
      location: "Kathmandu / Remote",
      minimumExperienceYears: minExp,
      requiredSkills,
      preferredSkills,
      educationRequirements: [
        {
          id: "req-edu-cs",
          name: "Bachelor's Degree in Computer Science or Equivalent",
          type: "education" as const,
          importance: "required" as const,
          confidence: 0.9,
          extractedEvidence: "Standard engineering educational foundation",
        },
      ],
      responsibilities: [
        "Architect and maintain modular, scalable web services and database schemas.",
        "Implement unit and integration tests with continuous integration pipelines.",
        "Collaborate with product and infrastructure teams to deliver resilient features.",
      ],
      certifications: [],
      domainKnowledge: ["API Architecture", "Relational Database Design"],
      confidence: 0.97,
      extractedAt: new Date().toISOString(),
    };

    return validateJobRequirementsOutput(structured).data!;
  }

  async extractCandidateProfile(
    rawResumeText: string,
    candidateNameHint?: string
  ): Promise<CandidateProfile> {
    const text = rawResumeText || "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = candidateNameHint || lines[0]?.replace(/^(name:?|resume of:?)\s*/i, "") || "Candidate";

    let totalExperienceYears = 2.5;
    const expMatch = text.match(/(\d+(\.\d+)?)\s*\+?\s*(years?|yrs?|yr)/i);
    if (expMatch) {
      totalExperienceYears = parseFloat(expMatch[1]);
    }

    const catalog = ["Python", "FastAPI", "PostgreSQL", "Docker", "Redis", "AWS", "Testing (PyTest)", "TypeScript", "React"];
    const extractedSkills = catalog
      .filter((s) => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text))
      .map((skill) => ({
        name: normalizeSkillName(skill),
        level: (totalExperienceYears >= 3 ? "Strong" : "Working knowledge") as "Strong" | "Working knowledge",
        yearsOfExperience: Math.min(totalExperienceYears, 3.5),
        evidenceSnippet: `Extracted from candidate resume text`,
      }));

    return {
      name,
      totalExperienceYears,
      skills: extractedSkills,
      experience: [
        {
          company: "Tech Systems",
          title: "Backend Engineer",
          years: totalExperienceYears,
          description: text.slice(0, 300) || "Backend software development and API implementation.",
          technologies: extractedSkills.map((s) => s.name),
        },
      ],
      education: [
        {
          institution: "Tribhuvan University / IOE",
          degree: "Bachelor of Engineering",
          field: "Computer Science",
          graduationYear: 2022,
        },
      ],
      confidence: 0.95,
      extractedAt: new Date().toISOString(),
    };
  }
}
