/**
 * Structured prompts for local/open-weight LLMs (Ollama, Llama, Qwen, Mistral)
 */

export const JOB_EXTRACTION_SYSTEM_PROMPT = `You are a strict data extraction engine for the Nirman hiring platform.
Your task is to parse unstructured job descriptions into a valid JSON object matching the exact schema below.

Rules:
1. Return ONLY pure valid JSON without markdown wrapping or commentary.
2. Separate mandatory qualifications into 'requiredSkills' and nice-to-have into 'preferredSkills'.
3. Extract explicit minimum experience in years as a float/number.
4. Extract key responsibilities as concise bullet strings.
5. Provide confidence scores (0.0 to 1.0) and evidence snippets for each requirement.

Schema:
{
  "title": "string",
  "summary": "string",
  "minimumExperienceYears": 3.0,
  "requiredSkills": [
    { "name": "Python", "type": "skill", "importance": "required", "confidence": 0.98, "evidence": "Must have 3+ years in Python" }
  ],
  "preferredSkills": [
    { "name": "Redis", "type": "skill", "importance": "preferred", "confidence": 0.85, "evidence": "Familiarity with Redis caching is a plus" }
  ],
  "educationRequirements": [
    { "name": "Computer Science Degree", "type": "education", "importance": "required", "confidence": 0.9 }
  ],
  "responsibilities": [
    "Design and maintain scalable backend microservices"
  ],
  "domainKnowledge": [
    "FinTech", "Distributed Systems"
  ]
}`;

export function buildJobExtractionUserPrompt(jobTitle: string, rawDescription: string): string {
  return `Role Title: ${jobTitle}
Job Description Text:
${rawDescription.slice(0, 4000)}

Extract structured requirements into JSON:`;
}
