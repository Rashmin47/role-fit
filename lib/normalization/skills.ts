/**
 * Nirman Normalization Engine
 * Maps raw variations of skills, technologies, and titles into canonical records.
 */

const CANONICAL_SKILL_MAP: Record<string, string> = {
  // Python & Ecosystem
  "py": "Python",
  "python": "Python",
  "python3": "Python",
  "python 3": "Python",
  "fastapi": "FastAPI",
  "fast-api": "FastAPI",
  "fast api": "FastAPI",
  "django": "Django",
  "django rest framework": "Django REST Framework",
  "drf": "Django REST Framework",
  "flask": "Flask",
  "sqlalchemy": "SQLAlchemy",
  "pydantic": "Pydantic",
  "celery": "Celery",
  "pytest": "PyTest",

  // Databases & Caching
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "psql": "PostgreSQL",
  "postgres sql": "PostgreSQL",
  "redis": "Redis",
  "mongodb": "MongoDB",
  "mongo": "MongoDB",
  "mysql": "MySQL",
  "sqlite": "SQLite",
  "elasticsearch": "Elasticsearch",
  "dynamodb": "DynamoDB",

  // DevOps & Cloud
  "docker": "Docker",
  "docker container": "Docker",
  "docker-compose": "Docker Compose",
  "k8s": "Kubernetes",
  "kubernetes": "Kubernetes",
  "aws": "AWS",
  "amazon web services": "AWS",
  "gcp": "Google Cloud Platform",
  "google cloud": "Google Cloud Platform",
  "azure": "Microsoft Azure",
  "terraform": "Terraform",
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "github actions": "GitHub Actions",
  "linux": "Linux",
  "nginx": "Nginx",

  // Frontend & JavaScript / TypeScript
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ts": "TypeScript",
  "typescript": "TypeScript",
  "react": "React",
  "reactjs": "React",
  "react.js": "React",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "vue": "Vue.js",
  "vuejs": "Vue.js",
  "node": "Node.js",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "html5": "HTML5",
  "css3": "CSS3",

  // Architecture & Methods
  "rest": "REST APIs",
  "rest api": "REST APIs",
  "restful": "REST APIs",
  "restful api": "REST APIs",
  "graphql": "GraphQL",
  "microservices": "Microservices",
  "system design": "System Design",
  "agile": "Agile / Scrum",
  "scrum": "Agile / Scrum",
  "unit testing": "Unit Testing",
  "testing": "Testing",
  "git": "Git",
  "github": "Git",
};

export function normalizeSkillName(rawSkill: string): string {
  if (!rawSkill) return "";
  const cleaned = rawSkill.trim().toLowerCase();
  if (CANONICAL_SKILL_MAP[cleaned]) {
    return CANONICAL_SKILL_MAP[cleaned];
  }
  // Title Case fallback
  return rawSkill
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function matchSkills(candidateSkill: string, targetSkill: string): boolean {
  const normCand = normalizeSkillName(candidateSkill).toLowerCase();
  const normTarget = normalizeSkillName(targetSkill).toLowerCase();
  
  if (normCand === normTarget) return true;
  if (normCand.includes(normTarget) || normTarget.includes(normCand)) return true;
  return false;
}
