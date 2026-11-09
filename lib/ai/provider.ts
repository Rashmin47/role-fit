/**
 * Role Fit AI Provider Factory & Base Interfaces
 * Supports Ollama open-weight LLMs and local offline deterministic extraction.
 * ZERO proprietary cloud LLM APIs.
 */

import { StructuredJobRequirements, CandidateProfile } from "./schemas";
import { MockAIProvider } from "./mock-provider";
import { OllamaAIProvider } from "./ollama-provider";

export interface AIProviderRunInfo {
  provider: string;
  fallbackUsed: boolean;
  warning?: string;
}

export interface AIProviderConfig {
  provider?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export interface AIProvider {
  name: string;
  extractJobRequirements(
    jobTitle: string,
    rawDescription: string
  ): Promise<StructuredJobRequirements>;
  extractCandidateProfile(
    rawResumeText: string,
    candidateNameHint?: string
  ): Promise<CandidateProfile>;
  /**
   * Metadata for the most recent extraction on this provider instance.
   * `getAIProvider()` returns a fresh instance per request, so this is safe
   * without sharing mutable state across concurrent requests.
   */
  getLastRunInfo?(): AIProviderRunInfo;
}

export function getAIProvider(config: AIProviderConfig = {}): AIProvider {
  const providerType = (
    config.provider ??
    process.env.AI_PROVIDER ??
    "mock"
  ).toLowerCase();

  if (providerType === "ollama") {
    return new OllamaAIProvider(
      config.ollamaBaseUrl ??
        process.env.OLLAMA_BASE_URL ??
        "http://localhost:11434",
      config.ollamaModel ?? process.env.OLLAMA_MODEL ?? "llama3.2"
    );
  }

  return new MockAIProvider();
}

export * from "./schemas";
export { MockAIProvider, OllamaAIProvider };
