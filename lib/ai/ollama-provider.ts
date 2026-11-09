import {
  StructuredJobRequirements,
  CandidateProfile,
  validateJobRequirementsOutput,
  validateCandidateProfileOutput,
} from "./schemas";
import type { AIProviderRunInfo } from "./provider";
import { MockAIProvider } from "./mock-provider";
import {
  JOB_EXTRACTION_SYSTEM_PROMPT,
  buildJobExtractionUserPrompt,
} from "./prompts/job-extraction";

const REQUEST_TIMEOUT_MS = 55_000;

export class OllamaAIProvider {
  name = "Ollama Local LLM (Open-Weight)";
  private baseUrl: string;
  private model: string;
  private fallback: MockAIProvider;
  private lastRunInfo: AIProviderRunInfo;

  constructor(baseUrl = "http://localhost:11434", model = "llama3.2") {
    this.baseUrl = baseUrl;
    this.model = model;
    this.fallback = new MockAIProvider();
    this.lastRunInfo = { provider: this.name, fallbackUsed: false };
  }

  getLastRunInfo(): AIProviderRunInfo {
    return this.lastRunInfo;
  }

  private markFallback(warning: string): void {
    this.lastRunInfo = {
      provider: this.name,
      fallbackUsed: true,
      warning,
    };
  }

  async extractJobRequirements(
    jobTitle: string,
    rawDescription: string
  ): Promise<StructuredJobRequirements> {
    this.lastRunInfo = { provider: this.name, fallbackUsed: false };

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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

      this.markFallback(
        "The local Ollama model returned an invalid structure; the offline extractor was used instead."
      );
      return this.fallback.extractJobRequirements(jobTitle, rawDescription);
    } catch {
      this.markFallback(
        "The local Ollama model could not be reached; the offline extractor was used instead."
      );
      return this.fallback.extractJobRequirements(jobTitle, rawDescription);
    }
  }

  async extractCandidateProfile(
    rawResumeText: string,
    candidateNameHint?: string
  ): Promise<CandidateProfile> {
    this.lastRunInfo = { provider: this.name, fallbackUsed: false };

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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) throw new Error(`Ollama HTTP error: ${res.status}`);
      const data = await res.json();
      const parsed = JSON.parse(data.response);
      const validated = validateCandidateProfileOutput(
        {
          confidence: 0.92,
          extractedAt: new Date().toISOString(),
          ...parsed,
        },
        candidateNameHint
      );

      if (validated.valid && validated.data) {
        return validated.data;
      }

      this.markFallback(
        "The local Ollama model returned an invalid candidate profile; the offline extractor was used instead."
      );
      return this.fallback.extractCandidateProfile(
        rawResumeText,
        candidateNameHint
      );
    } catch {
      this.markFallback(
        "The local Ollama model could not be reached; the offline extractor was used instead."
      );
      return this.fallback.extractCandidateProfile(rawResumeText, candidateNameHint);
    }
  }
}
