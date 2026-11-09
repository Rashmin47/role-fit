/**
 * Server-only provider boundary.
 *
 * The browser must call `/api/extract/*` instead of importing provider code.
 * Provider configuration (`AI_PROVIDER`, Ollama URL/model) and prompts stay on
 * the server, and every response is validated before it can reach the engine.
 */

import type {
  AIProviderConfig,
  AIProviderRunInfo,
  AIProvider,
} from "./provider";
import { getAIProvider } from "./provider";
import {
  validateCandidateProfileOutput,
  validateJobRequirementsOutput,
  type CandidateProfile,
  type StructuredJobRequirements,
} from "./schemas";
import type {
  CandidateExtractionResponse,
  JobExtractionResponse,
} from "./extraction-contract";

if (typeof window !== "undefined") {
  throw new Error(
    "Server extraction was imported into client code. Call /api/extract/* instead."
  );
}

const EXTRACTION_TIMEOUT_MS = 60_000;

export type ExtractionErrorCode = "timeout" | "validation" | "provider";

export class ExtractionError extends Error {
  readonly code: ExtractionErrorCode;
  readonly details?: string[];

  constructor(
    message: string,
    code: ExtractionErrorCode,
    details?: string[]
  ) {
    super(message);
    this.name = "ExtractionError";
    this.code = code;
    this.details = details;
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new ExtractionError(message, "timeout")),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function providerInfo(provider: AIProvider): AIProviderRunInfo {
  return (
    provider.getLastRunInfo?.() ?? {
      provider: provider.name,
      fallbackUsed: false,
    }
  );
}



export async function extractJobRequirementsOnServer(
  jobTitle: string,
  rawDescription: string,
  config: AIProviderConfig = {}
): Promise<JobExtractionResponse> {
  const provider = getAIProvider(config);
  let raw: StructuredJobRequirements;

  try {
    raw = await withTimeout(
      provider.extractJobRequirements(jobTitle, rawDescription),
      EXTRACTION_TIMEOUT_MS,
      "The extraction provider timed out. Try again or switch to the offline extractor."
    );
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      "The extraction provider failed before returning structured requirements.",
      "provider",
      [error instanceof Error ? error.message : "Unknown provider error"]
    );
  }

  const validated = validateJobRequirementsOutput(raw);
  if (!validated.data) {
    throw new ExtractionError(
      "The extraction provider returned no usable job requirements.",
      "validation",
      validated.errors
    );
  }

  const info = providerInfo(provider);

  return {
    requirements: validated.data,
    warnings: validated.errors ?? [],
    provider: {
      name: info.provider,
      fallbackUsed: info.fallbackUsed,
      warning: info.warning,
    },
  };
}

export async function extractCandidateProfileOnServer(
  rawResumeText: string,
  candidateNameHint?: string,
  config: AIProviderConfig = {}
): Promise<CandidateExtractionResponse> {
  const provider = getAIProvider(config);
  let raw: CandidateProfile;

  try {
    raw = await withTimeout(
      provider.extractCandidateProfile(rawResumeText, candidateNameHint),
      EXTRACTION_TIMEOUT_MS,
      "Candidate extraction timed out. Try again or switch to the offline extractor."
    );
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError(
      "The extraction provider failed before returning a candidate profile.",
      "provider",
      [error instanceof Error ? error.message : "Unknown provider error"]
    );
  }

  const validated = validateCandidateProfileOutput(raw, candidateNameHint);
  if (!validated.valid || !validated.data) {
    throw new ExtractionError(
      "The provider returned candidate data that could not be validated.",
      "validation",
      validated.errors
    );
  }

  const info = providerInfo(provider);

  return {
    profile: validated.data,
    warnings: validated.warnings ?? [],
    provider: {
      name: info.provider,
      fallbackUsed: info.fallbackUsed,
      warning: info.warning,
    },
  };
}
