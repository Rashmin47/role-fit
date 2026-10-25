import {
  StructuredJobRequirements,
  CandidateProfile,
  validateJobRequirementsOutput,
  validateCandidateProfileOutput,
} from "./schemas";
import { normalizeSkillName } from "../normalization/skills";
import { extractCandidateHeuristics } from "./resume-heuristics";

export class MockAIProvider {
  name = "Local Rule & Pattern Extractor (Offline)";

  async extractJobRequirements(
    jobTitle: string,
    rawDescription: string
  ): Promise<StructuredJobRequirements> {
    const text = rawDescription || "";
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    // 1. Minimum experience. The wizard overrides this with the recruiter's
    // explicit input; the default here is honest (unknown = 0).
    const expMatch = text.match(
      /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|yr)/i
    );
    const minExp = expMatch ? parseFloat(expMatch[1]) : 0;

    // 2. Technical skill recognition catalog.
    const knownCatalog: Array<{
      name: string;
      category: string;
      aliases: string[];
    }> = [
      { name: "Python", category: "language", aliases: ["python", "python3"] },
      { name: "FastAPI", category: "framework", aliases: ["fastapi", "fast-api", "fast api"] },
      { name: "Django", category: "framework", aliases: ["django"] },
      { name: "Flask", category: "framework", aliases: ["flask"] },
      { name: "PostgreSQL", category: "database", aliases: ["postgresql", "postgres", "psql"] },
      { name: "MySQL", category: "database", aliases: ["mysql", "mariadb"] },
      { name: "MongoDB", category: "database", aliases: ["mongodb", "mongo"] },
      { name: "Redis", category: "database", aliases: ["redis"] },
      { name: "Docker", category: "tool", aliases: ["docker", "containerization", "containers"] },
      { name: "Kubernetes", category: "cloud", aliases: ["k8s", "kubernetes"] },
      { name: "AWS", category: "cloud", aliases: ["aws", "amazon web services"] },
      { name: "GCP", category: "cloud", aliases: ["gcp", "google cloud"] },
      { name: "Azure", category: "cloud", aliases: ["azure", "microsoft azure"] },
      { name: "Testing (PyTest)", category: "tool", aliases: ["pytest", "py.test", "unit testing", "testing"] },
      { name: "CI/CD", category: "tool", aliases: ["ci/cd", "cicd", "continuous integration", "github actions"] },
      { name: "React", category: "framework", aliases: ["react", "react.js", "reactjs"] },
      { name: "TypeScript", category: "language", aliases: ["typescript"] },
      { name: "Node.js", category: "framework", aliases: ["node", "nodejs", "node.js"] },
      { name: "Git", category: "tool", aliases: ["git"] },
      { name: "GraphQL", category: "tool", aliases: ["graphql"] },
      { name: "REST APIs", category: "methodology", aliases: ["rest", "restful", "rest api"] },
      { name: "Kafka", category: "tool", aliases: ["kafka"] },
      { name: "Terraform", category: "tool", aliases: ["terraform"] },
      { name: "Linux", category: "tool", aliases: ["linux"] },
    ];

    const escapeRegex = (value: string): string =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    /**
     * Preferred detection is line-scoped. A window around the keyword used to
     * pick up "preferred" from a nearby bullet and misclassify required skills.
     */
    interface MatchContext {
      context: string;
      before: string;
    }

    const contextFor = (aliases: string[]): MatchContext | null => {
      for (let index = 0; index < lines.length; index++) {
        for (const alias of aliases) {
          const pattern = new RegExp(
            `(^|[^A-Za-z0-9+#])${escapeRegex(alias)}(?=$|[^A-Za-z0-9+#])`,
            "i"
          );
          const match = pattern.exec(lines[index]);
          if (!match) continue;

          const aliasStart = match.index + (match[1]?.length ?? 0);
          const before = lines[index].slice(
            Math.max(0, aliasStart - 40),
            aliasStart
          );
          const previous = lines[index - 1] ?? "";
          const isSectionHeader =
            previous.length <= 80 &&
            !/^[-•*]/.test(previous) &&
            previous.split(/\s+/).length <= 6 &&
            /\b(preferred|nice to have|bonus|optional)\b/i.test(previous);
          return {
            context: `${isSectionHeader ? previous : ""} ${lines[index]}`.trim(),
            before,
          };
        }
      }
      return null;
    };

    const requiredSkills: any[] = [];
    const preferredSkills: any[] = [];

    for (const item of knownCatalog) {
      const match = contextFor(item.aliases);
      if (!match) continue;

      const canonical = normalizeSkillName(item.name);
      // "FastAPI or Django" is an alternative, not a second mandatory skill.
      // The engine has no OR-group type, so the later alternative earns
      // preferred credit instead of creating a false required gap.
      const isAlternative = /\bor\s*$/i.test(match.before);
      const isPreferred =
        isAlternative ||
        /\b(preferred|plus|nice to have|optional|bonus)\b/i.test(match.context);
      const requirement = {
        id: `req-${canonical.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        name: canonical,
        type: "skill" as const,
        importance: isPreferred ? ("preferred" as const) : ("required" as const),
        description: isAlternative
          ? `Alternative to another listed requirement in the ${jobTitle || "role"} description.`
          : `Listed in the ${jobTitle || "role"} description.`,
        extractedEvidence: match.context.slice(0, 220),
        confidence: isPreferred ? 0.85 : 0.9,
      };

      if (isPreferred) preferredSkills.push(requirement);
      else requiredSkills.push(requirement);
    }

    // 3. Education is only extracted when the description actually mentions a
    // degree. No default bachelor's requirement is invented.
    const educationLine = lines.find((line) =>
      /\b(bachelor(?:'s)?|master(?:'s)?|degree|bsc|msc|b\.?\s?tech|m\.?\s?tech|ph\.?\s?d|doctorate)\b/i.test(
        line
      )
    );
    const educationRequirements = educationLine
      ? [
          {
            id: "req-education",
            name: educationLine.replace(/^[-•*]\s*/, "").slice(0, 160),
            type: "education" as const,
            importance: "required" as const,
            confidence: 0.8,
            extractedEvidence: educationLine.slice(0, 220),
          },
        ]
      : [];

    // 4. Responsibilities are bullet lines with action verbs. If the
    // description has none, the array stays empty rather than being invented.
    const responsibilities = lines
      .filter(
        (line) =>
          /^[-•*]\s+/.test(line) &&
          /\b(build|design|develop|maintain|collaborate|lead|implement|manage|own|deliver|architect)\b/i.test(
            line
          )
      )
      .map((line) => line.replace(/^[-•*]\s+/, "").slice(0, 220))
      .slice(0, 6);

    const structured: StructuredJobRequirements = {
      title: jobTitle || "Software Engineer",
      minimumExperienceYears: minExp,
      requiredSkills,
      preferredSkills,
      educationRequirements,
      responsibilities,
      certifications: [],
      domainKnowledge: [],
      confidence:
        requiredSkills.length + preferredSkills.length > 0 ? 0.9 : 0.4,
      extractedAt: new Date().toISOString(),
    };

    return validateJobRequirementsOutput(structured).data ?? structured;
  }

  async extractCandidateProfile(
    rawResumeText: string,
    candidateNameHint?: string
  ): Promise<CandidateProfile> {
    // Extract only what the document actually contains. No invented employer,
    // degree, or experience years. The validator repairs malformed shapes and
    // returns warnings that the UI can surface.
    const heuristic = extractCandidateHeuristics(
      rawResumeText,
      candidateNameHint
    );
    const validated = validateCandidateProfileOutput(heuristic, candidateNameHint);

    if (validated.data) return validated.data;

    // The heuristic always produces a shaped profile; this guard is defensive
    // for future changes to the heuristics module.
    return heuristic;
  }
}
