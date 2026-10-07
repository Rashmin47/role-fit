import {
  StructuredJobRequirements,
  CandidateProfile,
  validateJobRequirementsOutput,
} from "./schemas";
import { MockAIProvider } from "./mock-provider";
import {
  JOB_EXTRACTION_SYSTEM_PROMPT,
  buildJobExtractionUserPrompt,
} from "./prompts/job-extraction";

export class OllamaAIProvider {
  name = "Ollama Local LLM (Open-Weight)";
  private baseUrl: string;
  private model: string;
  private fallback: MockAIProvider;

  constructor(baseUrl = "http://localhost:11434", model = "llama3.2") {
    this.baseUrl = baseUrl;
    this.model = model;
    this.fallback = new MockAIProvider();
  }

  async extractJobRequirements(
    jobTitle: string,
    rawDescription: string
  ): Promise<StructuredJobRequirements> {
    try {
      const prompt = buildJobExtractionUserPrompt(jobTitle, rawDescription);

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          system: JOB_EXTRACTION_SYSTEM_PROMPT,
          prompt,
          format: "json",
          stream: false,
          options: {
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Ollama HTTP error ${res.status}`);
      }

      const data = await res.json();
      const rawJson = JSON.parse(data.response);
      const validated = validateJobRequirementsOutput(rawJson);

      if (validated.valid && validated.data) {
        return validated.data;
      }
      return this.fallback.extractJobRequirements(jobTitle, rawDescription);
    } catch {
      // Graceful fallback to local mock extractor when Ollama daemon is offline
      return this.fallback.extractJobRequirements(jobTitle, rawDescription);
    }
  }

  async extractCandidateProfile(
    rawResumeText: string,
    candidateNameHint?: string
  ): Promise<CandidateProfile> {
    try {
      const prompt = `Extract candidate profile from resume text into valid JSON matching this schema:
{"name":"string","totalExperienceYears":number,"skills":[{"name":"string","level":"Strong"|"Working knowledge"}],"experience":[{"company":"string","title":"string","years":number,"description":"string","technologies":["string"]}],"education":[{"institution":"string","degree":"string","field":"string"}]}
Resume:
${rawResumeText.slice(0, 3000)}`;

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt,
          format: "json",
          stream: false,
        }),
      });

      if (!res.ok) throw new Error(`Ollama HTTP error: ${res.status}`);
      const data = await res.json();
      const parsed = JSON.parse(data.response);
      return {
        ...parsed,
        confidence: 0.92,
        extractedAt: new Date().toISOString(),
      };
    } catch {
      return this.fallback.extractCandidateProfile(rawResumeText, candidateNameHint);
    }
  }
}
