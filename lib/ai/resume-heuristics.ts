/**
 * Deterministic resume heuristics for the offline provider.
 *
 * The goal is honesty, not completeness: extract only what the document
 * actually contains. A missing employer or degree stays missing rather than
 * being invented. Every skill keeps the line that evidenced it so the review
 * UI can cite it.
 */

import {
  CandidateProfile,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedSkill,
} from "./schemas";
import { normalizeSkillName } from "../normalization/skills";

interface CatalogItem {
  name: string;
  category: NonNullable<ExtractedSkill["category"]>;
  aliases: string[];
}

const SKILL_CATALOG: CatalogItem[] = [
  { name: "Python", category: "language", aliases: ["python", "python3"] },
  { name: "JavaScript", category: "language", aliases: ["javascript", "ecmascript"] },
  { name: "TypeScript", category: "language", aliases: ["typescript"] },
  { name: "Java", category: "language", aliases: ["java"] },
  { name: "C++", category: "language", aliases: ["c++", "cpp"] },
  { name: "C#", category: "language", aliases: ["c#", "csharp"] },
  { name: "Go", category: "language", aliases: ["golang"] },
  { name: "Ruby", category: "language", aliases: ["ruby"] },
  { name: "PHP", category: "language", aliases: ["php"] },
  { name: "Rust", category: "language", aliases: ["rust"] },
  { name: "Kotlin", category: "language", aliases: ["kotlin"] },
  { name: "Swift", category: "language", aliases: ["swift"] },
  { name: "SQL", category: "language", aliases: ["sql"] },
  { name: "FastAPI", category: "framework", aliases: ["fastapi", "fast api", "fast-api"] },
  { name: "Django", category: "framework", aliases: ["django", "django rest framework"] },
  { name: "Flask", category: "framework", aliases: ["flask"] },
  { name: "React", category: "framework", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", category: "framework", aliases: ["next.js", "nextjs", "next js"] },
  { name: "Node.js", category: "framework", aliases: ["node.js", "nodejs", "node js"] },
  { name: "Express", category: "framework", aliases: ["express.js", "expressjs", "express"] },
  { name: "Spring Boot", category: "framework", aliases: ["spring boot", "springboot"] },
  { name: ".NET", category: "framework", aliases: [".net", "dotnet", "asp.net"] },
  { name: "Rails", category: "framework", aliases: ["ruby on rails", "rails"] },
  { name: "Vue.js", category: "framework", aliases: ["vue.js", "vuejs", "vue"] },
  { name: "Angular", category: "framework", aliases: ["angular"] },
  { name: "Svelte", category: "framework", aliases: ["svelte", "sveltekit"] },
  { name: "PostgreSQL", category: "database", aliases: ["postgresql", "postgres", "psql"] },
  { name: "MySQL", category: "database", aliases: ["mysql", "mariadb"] },
  { name: "MongoDB", category: "database", aliases: ["mongodb", "mongo"] },
  { name: "Redis", category: "database", aliases: ["redis"] },
  { name: "SQLite", category: "database", aliases: ["sqlite"] },
  { name: "DynamoDB", category: "database", aliases: ["dynamodb"] },
  { name: "Elasticsearch", category: "database", aliases: ["elasticsearch", "elastic search"] },
  { name: "Docker", category: "tool", aliases: ["docker", "containerization", "containers"] },
  { name: "Kubernetes", category: "tool", aliases: ["kubernetes", "k8s"] },
  { name: "Git", category: "tool", aliases: ["git"] },
  { name: "GitHub Actions", category: "tool", aliases: ["github actions"] },
  { name: "CI/CD", category: "tool", aliases: ["ci/cd", "cicd", "continuous integration", "continuous delivery"] },
  { name: "Jenkins", category: "tool", aliases: ["jenkins"] },
  { name: "Terraform", category: "tool", aliases: ["terraform"] },
  { name: "Ansible", category: "tool", aliases: ["ansible"] },
  { name: "Linux", category: "tool", aliases: ["linux", "unix"] },
  { name: "PyTest", category: "tool", aliases: ["pytest", "py.test"] },
  { name: "Jest", category: "tool", aliases: ["jest"] },
  { name: "Playwright", category: "tool", aliases: ["playwright"] },
  { name: "Cypress", category: "tool", aliases: ["cypress"] },
  { name: "Kafka", category: "tool", aliases: ["kafka"] },
  { name: "RabbitMQ", category: "tool", aliases: ["rabbitmq"] },
  { name: "GraphQL", category: "tool", aliases: ["graphql"] },
  { name: "REST", category: "methodology", aliases: ["rest", "restful", "rest api"] },
  { name: "gRPC", category: "tool", aliases: ["grpc"] },
  { name: "Agile", category: "methodology", aliases: ["agile", "scrum", "kanban"] },
  { name: "AWS", category: "cloud", aliases: ["aws", "amazon web services"] },
  { name: "GCP", category: "cloud", aliases: ["gcp", "google cloud"] },
  { name: "Azure", category: "cloud", aliases: ["azure", "microsoft azure"] },
  { name: "Vercel", category: "cloud", aliases: ["vercel"] },
];

type SectionKey =
  | "summary"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "skills";

const SECTION_ALIASES: Record<SectionKey, string[]> = {
  summary: [
    "summary",
    "professional summary",
    "profile",
    "about",
    "about me",
    "objective",
    "career objective",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
    "relevant experience",
  ],
  education: [
    "education",
    "academic background",
    "academics",
    "educational background",
    "qualifications",
  ],
  projects: [
    "projects",
    "personal projects",
    "side projects",
    "selected projects",
    "technical projects",
  ],
  certifications: [
    "certifications",
    "certificates",
    "licenses",
    "credentials",
    "certifications and licenses",
    "certifications & licenses",
  ],
  skills: [
    "skills",
    "technical skills",
    "core skills",
    "core competencies",
    "technologies",
    "tech stack",
    "tools and technologies",
    "tools & technologies",
  ],
};

const MONTH_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const DATE_TOKEN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)?[\\s,.'’-]*\\d{4}";
const RANGE_SOURCE = `(${DATE_TOKEN})\\s*(?:-|–|—|to|through|until)\\s*(${DATE_TOKEN}|present|current|now)`;

const RESUME_NOISE =
  /\b(resume|curriculum|vitae|email|e-mail|phone|mobile|address|linkedin|github|portfolio|summary|profile)\b/i;
const TITLE_PATTERN =
  /\b(engineer|developer|manager|analyst|designer|consultant|architect|lead|specialist|scientist|administrator|intern|officer|director|head|programmer|associate|coordinator|tester|devops|sre)\b/i;
const COMPANY_PATTERN =
  /\b(inc|llc|ltd|limited|corp|corporation|company|technologies|technology|solutions|systems|labs|group|bank|university|consulting|services|pvt|private)\b/i;

interface ParsedSection {
  key: SectionKey | "preamble";
  lines: string[];
}

interface DatePoint {
  year: number;
  month: number;
}

interface DateRange {
  start: DatePoint;
  end: DatePoint;
  startLabel: string;
  endLabel: string;
  isCurrent: boolean;
  months: number;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Alias matching avoids `\b` because it fails around `C++`, `C#`, and `.NET`.
 */
function hasAlias(text: string, alias: string): boolean {
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9+#])${escapeRegex(alias)}(?=$|[^A-Za-z0-9+#])`,
    "i"
  );
  return pattern.test(text);
}

function normalizeText(raw: string): string {
  return (raw || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function smartCase(value: string): string {
  if (value === value.toUpperCase() || value === value.toLowerCase()) {
    return value
      .toLowerCase()
      .replace(/\b[a-z]/g, (character) => character.toUpperCase());
  }
  return value;
}

function looksLikePersonName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60 || RESUME_NOISE.test(trimmed)) {
    return false;
  }
  if (/[@:;|/\\\d]/.test(trimmed)) return false;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 5) return false;
  return words.every((word) => /^[A-Za-z][A-Za-z.'’-]*$/.test(word));
}

function extractName(lines: string[], hint?: string): string {
  const cleanedHint = hint
    ?.replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(
      /\b(resume|cv|curriculum vitae|final|updated|candidate|application|document|upload|profile)\b/gi,
      ""
    )
    .replace(/\b(v|version)\s*\d+\b/gi, "")
    .replace(/\b\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedHint && cleanedHint.length >= 2) {
    return smartCase(cleanedHint);
  }

  for (const line of lines.slice(0, 10)) {
    if (looksLikePersonName(line)) {
      return smartCase(line.trim());
    }
  }

  return "Candidate";
}

function extractEmail(text: string): string | undefined {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function extractPhone(text: string): string | undefined {
  const labeled = text.match(
    /(?:phone|mobile|tel|telephone)\s*[:.-]?\s*(\+?[\d][\d\s().-]{7,}\d)/i
  )?.[1];
  if (labeled) return labeled.trim();

  const candidates = text.match(/\+?\d[\d\s().-]{8,}\d/g) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      return candidate.trim();
    }
  }
  return undefined;
}

function extractLocation(text: string): string | undefined {
  const match = text.match(
    /(?:location|address|based in)\s*[:.-]?\s*([^\n]{2,80})/i
  )?.[1];
  return match?.trim();
}

function matchSectionHeader(line: string): SectionKey | null {
  const cleaned = line
    .trim()
    .replace(/[:\-–—]+$/, "")
    .trim();
  if (!cleaned || cleaned.length > 40) return null;

  const normalized = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  for (const [key, aliases] of Object.entries(SECTION_ALIASES) as Array<
    [SectionKey, string[]]
  >) {
    if (aliases.includes(normalized)) return key;
  }
  return null;
}

function splitSections(lines: string[]): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let current: ParsedSection = { key: "preamble", lines: [] };

  for (const line of lines) {
    const key = matchSectionHeader(line);
    if (key) {
      if (current.lines.length > 0 || current.key !== "preamble") {
        sections.push(current);
      }
      current = { key, lines: [] };
    } else {
      current.lines.push(line);
    }
  }

  if (current.lines.length > 0) sections.push(current);
  return sections;
}

function sectionLines(sections: ParsedSection[], key: SectionKey): string[] {
  return sections.filter((section) => section.key === key).flatMap((section) => section.lines);
}

function cleanLine(line: string): string {
  return line
    .replace(/^[•*\-–—\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findRanges(line: string, asOf: Date): DateRange[] {
  const pattern = new RegExp(RANGE_SOURCE, "gi");
  const matches = line.matchAll(pattern);
  const ranges: DateRange[] = [];

  for (const match of matches) {
    const startLabel = match[1];
    const endLabel = match[2];
    const isCurrent = /present|current|now/i.test(endLabel);
    const start = parseDatePoint(startLabel);
    const end = parseDatePoint(endLabel, asOf);
    if (!start || !end) continue;

    const months = monthsInRange(start, end);
    if (months <= 0) continue;

    ranges.push({ start, end, startLabel, endLabel, isCurrent, months });
  }

  return ranges;
}

function parseDatePoint(token: string, asOf?: Date): DatePoint | null {
  if (/present|current|now/i.test(token)) {
    if (!asOf) return null;
    return { year: asOf.getFullYear(), month: asOf.getMonth() };
  }

  const yearMatch = token.match(/\d{4}/);
  if (!yearMatch) return null;

  const monthName = token.match(/[A-Za-z]{3,}/)?.[0];
  const month = monthName
    ? MONTH_INDEX[monthName.slice(0, 3).toLowerCase()] ?? 0
    : 0;

  return { year: parseInt(yearMatch[0], 10), month };
}

function monthsInRange(start: DatePoint, end: DatePoint): number {
  const startAbs = start.year * 12 + start.month;
  const endAbs = end.year * 12 + end.month + 1;
  return Math.max(0, endAbs - startAbs);
}

function totalYearsFromRanges(ranges: DateRange[]): number {
  if (ranges.length === 0) return 0;

  const intervals = ranges
    .map((range) => ({
      start: range.start.year * 12 + range.start.month,
      end: range.end.year * 12 + range.end.month + 1,
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  if (intervals.length === 0) return 0;

  let totalMonths = 0;
  let currentStart = intervals[0].start;
  let currentEnd = intervals[0].end;

  for (let i = 1; i < intervals.length; i++) {
    const interval = intervals[i];
    if (interval.start <= currentEnd) {
      currentEnd = Math.max(currentEnd, interval.end);
    } else {
      totalMonths += currentEnd - currentStart;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }
  totalMonths += currentEnd - currentStart;

  return Math.round(Math.min(60, totalMonths / 12) * 10) / 10;
}

function extractExplicitYears(text: string): number | undefined {
  const patterns = [
    /(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|relevant\s+|hands-on\s+|industry\s+)?experience/i,
    /experience\s*(?:of|:)?\s*(\d{1,2}(?:\.\d)?)\+?\s*(?:years?|yrs?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      if (Number.isFinite(value)) {
        return Math.round(Math.min(60, Math.max(0, value)) * 10) / 10;
      }
    }
  }
  return undefined;
}

function inferLevel(line: string | undefined): ExtractedSkill["level"] | undefined {
  if (!line) return undefined;
  if (/\b(expert|advanced|lead|principal)\b/i.test(line)) return "Expert";
  if (/\b(strong|proficient|extensive|deep)\b/i.test(line)) return "Strong";
  if (/\b(basic|beginner|learning|familiar|exposure)\b/i.test(line)) return "Basic";
  if (/\b(working knowledge|intermediate|comfortable|solid)\b/i.test(line)) {
    return "Working knowledge";
  }
  return undefined;
}

function findEvidenceLine(text: string, aliases: string[]): string | undefined {
  for (const line of text.split("\n")) {
    if (aliases.some((alias) => hasAlias(line, alias))) {
      const cleaned = cleanLine(line);
      if (cleaned) return cleaned.slice(0, 200);
    }
  }
  return undefined;
}

function extractSkills(text: string): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];

  for (const item of SKILL_CATALOG) {
    if (!item.aliases.some((alias) => hasAlias(text, alias))) continue;

    const evidence = findEvidenceLine(text, item.aliases);
    skills.push({
      name: normalizeSkillName(item.name),
      category: item.category,
      level: inferLevel(evidence),
      evidenceSnippet: evidence,
    });
  }

  return skills;
}

function skillsInText(text: string): string[] {
  return SKILL_CATALOG.filter((item) =>
    item.aliases.some((alias) => hasAlias(text, alias))
  ).map((item) => normalizeSkillName(item.name));
}

function formatDatePoint(point: DatePoint, token: string): string {
  const hasMonth = /[A-Za-z]{3,}/.test(token);
  return hasMonth
    ? `${point.year}-${String(point.month + 1).padStart(2, "0")}`
    : `${point.year}`;
}

function extractExperience(
  lines: string[],
  skills: ExtractedSkill[],
  asOf: Date
): ExtractedExperience[] {
  const experiences: ExtractedExperience[] = [];
  const dateIndexes: number[] = [];

  lines.forEach((line, index) => {
    if (findRanges(line, asOf).length > 0) dateIndexes.push(index);
  });

  for (const index of dateIndexes) {
    const dateLine = lines[index];
    const ranges = findRanges(dateLine, asOf);
    if (ranges.length === 0) continue;

    const range = ranges[0];
    const lineWithoutDates = dateLine
      .replace(new RegExp(RANGE_SOURCE, "gi"), "")
      .replace(/[|·•—–-]+\s*$/, "")
      .trim();

    const parts = lineWithoutDates
      .split(/\s+(?:at|@)\s+|\s*[|·•]\s*|\s+[-–—]\s+/i)
      .map((part) => cleanLine(part))
      .filter(Boolean);

    let title = "";
    let company = "";

    if (parts.length >= 2) {
      title = parts[0];
      company = parts[1];
    } else if (parts.length === 1) {
      if (TITLE_PATTERN.test(parts[0])) title = parts[0];
      else company = parts[0];
    }

    const previous = [lines[index - 1], lines[index - 2]]
      .filter((line): line is string => Boolean(line))
      .map(cleanLine)
      .filter(
        (line) =>
          line.length > 1 &&
          !matchSectionHeader(line) &&
          findRanges(line, asOf).length === 0
      );

    for (const line of previous) {
      if (!title && TITLE_PATTERN.test(line)) {
        title = line;
        continue;
      }
      if (!company && (COMPANY_PATTERN.test(line) || !TITLE_PATTERN.test(line))) {
        company = line;
        continue;
      }
      if (!title) title = line;
      else if (!company) company = line;
    }

    if (!title && !company) continue;

    const descriptionLines: string[] = [];
    for (let next = index + 1; next < lines.length && next <= index + 8; next++) {
      if (findRanges(lines[next], asOf).length > 0) break;

      const nextIsTitle =
        TITLE_PATTERN.test(lines[next]) || COMPANY_PATTERN.test(lines[next]);
      const nextLineHasDate =
        next + 1 < lines.length && findRanges(lines[next + 1], asOf).length > 0;
      if (nextIsTitle && nextLineHasDate) break;

      const cleaned = cleanLine(lines[next]);
      if (cleaned) descriptionLines.push(cleaned);
      if (descriptionLines.join(" ").length > 500) break;
    }

    const description = descriptionLines.join(" ").slice(0, 600);
    const combined = `${title} ${company} ${description}`;

    experiences.push({
      company: company || "Not specified",
      title: title || "Role",
      startDate: formatDatePoint(range.start, range.startLabel),
      endDate: range.isCurrent
        ? undefined
        : formatDatePoint(range.end, range.endLabel),
      isCurrent: range.isCurrent,
      years: Math.round((range.months / 12) * 10) / 10,
      description,
      technologies: skillsInText(combined).filter((name) =>
        skills.some((skill) => skill.name === name)
      ),
      evidenceSnippet: cleanLine(dateLine).slice(0, 200),
    });
  }

  const seen = new Set<string>();
  return experiences
    .filter((experience) => {
      const key = `${experience.title}|${experience.company}|${experience.startDate}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

const DEGREE_PATTERN =
  /\b(bachelor(?:'s)?|master(?:'s)?|b\.?\s?sc|m\.?\s?sc|b\.?\s?e|m\.?\s?e|b\.?\s?tech|m\.?\s?tech|mba|ph\.?d|doctorate|associate(?:'s)?|diploma|high school)\b/i;
const INSTITUTION_PATTERN = /\b(university|college|institute|school|academy)\b/i;
const FIELD_PATTERN =
  /\b(computer science|software engineering|information technology|information systems|electrical engineering|electronics|data science|mathematics|statistics|business administration|economics|physics|civil engineering|mechanical engineering)\b/i;

function extractEducation(
  section: string[],
  allLines: string[]
): ExtractedEducation[] {
  const source = section.length > 0 ? section : allLines;
  const results: ExtractedEducation[] = [];

  for (let index = 0; index < source.length; index++) {
    const line = source[index];
    if (!DEGREE_PATTERN.test(line) && !INSTITUTION_PATTERN.test(line)) continue;

    const segments = line
      .split(/\s*[|,–—]\s*|\s+-\s+/)
      .map(cleanLine)
      .filter(Boolean);

    let institution =
      segments.find((segment) => INSTITUTION_PATTERN.test(segment)) ?? "";
    let degree =
      segments.find((segment) => DEGREE_PATTERN.test(segment)) ?? "";

    if (!institution) {
      const neighbor = [source[index - 1], source[index + 1]]
        .filter((value): value is string => Boolean(value))
        .map(cleanLine)
        .find((value) => INSTITUTION_PATTERN.test(value));
      if (neighbor) {
        institution =
          neighbor
            .split(/\s*[|,–—]\s*|\s+-\s+/)
            .map(cleanLine)
            .find((segment) => INSTITUTION_PATTERN.test(segment)) ?? neighbor;
      }
    }

    if (!degree && DEGREE_PATTERN.test(line)) degree = line;

    // An institution-only line adds no new evidence; it is normally the
    // second line of a degree entry that the previous iteration already read.
    if (!degree) continue;

    const field = line.match(FIELD_PATTERN)?.[0];
    const lastYear = (value?: string): number | undefined => {
      const years = value?.match(/\b(19|20)\d{2}\b/g);
      return years && years.length > 0
        ? parseInt(years[years.length - 1], 10)
        : undefined;
    };
    const graduationYear =
      lastYear(line) ?? lastYear(source[index + 1]) ?? lastYear(source[index - 1]);

    results.push({
      institution: institution.slice(0, 140) || "Not specified",
      degree: degree.slice(0, 140),
      field: field ? smartCase(field) : "",
      graduationYear:
        graduationYear && graduationYear >= 1950 && graduationYear <= 2035
          ? graduationYear
          : undefined,
    });
  }

  const seen = new Set<string>();
  return results
    .filter((education) => {
      const key = `${education.institution}|${education.degree}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function extractProjects(section: string[]): CandidateProfile["projects"] {
  if (section.length === 0) return undefined;

  const bulletLines = section
    .map(cleanLine)
    .filter((line) => line.length >= 12);

  if (bulletLines.length === 0) return undefined;

  const projects = bulletLines.slice(0, 6).map((line) => {
    const [head, ...rest] = line.split(/\s*[:–—]\s*|\s+-\s+/);
    const name = (head || line).slice(0, 80);
    const description = (rest.join(" - ") || line).slice(0, 400);
    return {
      name,
      description,
      technologies: skillsInText(line),
    };
  });

  return projects.length > 0 ? projects : undefined;
}

function extractCertifications(
  section: string[],
  allLines: string[]
): CandidateProfile["certifications"] {
  const source =
    section.length > 0
      ? section
      : allLines.filter((line) => /\b(certified|certification|certificate)\b/i.test(line));

  const results = source
    .map(cleanLine)
    .filter((line) => line.length >= 4 && line.length <= 180)
    .map((line) => {
      const issuers: Array<[RegExp, string]> = [
        [/\baws\b|amazon web services/i, "Amazon Web Services"],
        [/\bmicrosoft\b|\bazure\b/i, "Microsoft"],
        [/\bgoogle\b|\bgcp\b/i, "Google"],
        [/\bcisco\b/i, "Cisco"],
        [/\bscrum\b/i, "Scrum Alliance"],
        [/\bpmi\b|\bpmp\b/i, "PMI"],
        [/\bcomptia\b/i, "CompTIA"],
        [/\boracle\b/i, "Oracle"],
      ];
      const issuer = issuers.find(([pattern]) => pattern.test(line))?.[1] ?? "Not specified";
      const year = line.match(/\b(19|20)\d{2}\b/)?.[0];
      return {
        name: line.slice(0, 140),
        issuer,
        year: year ? parseInt(year, 10) : undefined,
      };
    });

  const seen = new Set<string>();
  const unique = results.filter((certification) => {
    const key = certification.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.length > 0 ? unique.slice(0, 8) : undefined;
}

function extractSummary(section: string[]): string | undefined {
  if (section.length === 0) return undefined;
  const summary = section.map(cleanLine).filter(Boolean).join(" ").slice(0, 600);
  return summary || undefined;
}

function computeConfidence(profile: {
  name: string;
  skills: unknown[];
  experience: unknown[];
  education: unknown[];
  years: number;
}): number {
  let confidence = 0.35;
  if (profile.name && profile.name !== "Candidate") confidence += 0.1;
  if (profile.skills.length > 0) confidence += 0.2;
  if (profile.experience.length > 0) confidence += 0.2;
  if (profile.education.length > 0) confidence += 0.1;
  if (profile.years > 0) confidence += 0.05;
  return Math.round(Math.min(0.95, confidence) * 100) / 100;
}

export interface ResumeHeuristicsOptions {
  /** Inject a fixed date for deterministic current-role calculations. */
  asOf?: Date;
}

export function extractCandidateHeuristics(
  rawResumeText: string,
  candidateNameHint?: string,
  options: ResumeHeuristicsOptions = {}
): CandidateProfile {
  const text = normalizeText(rawResumeText);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const asOf = options.asOf ?? new Date();

  const name = extractName(lines, candidateNameHint);
  const skills = extractSkills(text);

  const experienceSection = sectionLines(sections, "experience");
  const hasExperienceSection = sections.some(
    (section) => section.key === "experience"
  );
  const excludedSections = new Set<SectionKey>([
    "education",
    "certifications",
    "projects",
    "summary",
    "skills",
  ]);
  const fallbackLines = sections
    .filter(
      (section) =>
        section.key === "preamble" || !excludedSections.has(section.key)
    )
    .flatMap((section) => section.lines);

  const experienceSource = hasExperienceSection
    ? experienceSection
    : fallbackLines;
  const experience = extractExperience(experienceSource, skills, asOf);

  const explicitYears = extractExplicitYears(text);
  const rangeYears = totalYearsFromRanges(
    experienceSource.flatMap((line) => findRanges(line, asOf))
  );
  const totalExperienceYears = explicitYears ?? rangeYears;

  const education = extractEducation(
    sectionLines(sections, "education"),
    lines
  );
  const projects = extractProjects(sectionLines(sections, "projects"));
  const certifications = extractCertifications(
    sectionLines(sections, "certifications"),
    lines
  );

  return {
    name,
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    summary: extractSummary(sectionLines(sections, "summary")),
    totalExperienceYears,
    skills,
    experience,
    education,
    projects,
    certifications,
    rawTextExcerpt: text.slice(0, 1500),
    confidence: computeConfidence({
      name,
      skills,
      experience,
      education,
      years: totalExperienceYears,
    }),
    extractedAt: new Date().toISOString(),
  };
}
