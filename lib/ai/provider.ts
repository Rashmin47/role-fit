/**
 * Nirman AI Provider Factory & Base Interfaces
 * Supports Ollama open-weight LLMs and local offline deterministic extraction.
 * ZERO proprietary cloud LLM APIs.
 */

import { StructuredJobRequirements, CandidateProfile } from "./schemas";
import { MockAIProvider } from "./mock-provider";
import { OllamaAIProvider } from "./ollama-provider";

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
}

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (providerType === "ollama") {
    return new OllamaAIProvider(
      process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      process.env.OLLAMA_MODEL || "llama3.2"
    );
  }

  return new MockAIProvider();
}

export * from "./schemas";
export { MockAIProvider, OllamaAIProvider };
