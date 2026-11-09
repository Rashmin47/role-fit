import type { ScoringWeights } from "@/types";

export type ExtractionProviderId = "mock" | "ollama";

export interface WorkspaceSettings {
  provider: ExtractionProviderId;
  ollamaBaseUrl: string;
  ollamaModel: string;
  weights: ScoringWeights;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  provider: "mock",
  ollamaBaseUrl: "http://localhost:11434",
  ollamaModel: "llama3.2",
  weights: {
    requiredSkills: 50,
    experience: 25,
    preferredSkills: 15,
    evidenceQuality: 10,
  },
};

export const WEIGHT_KEYS = [
  "requiredSkills",
  "experience",
  "preferredSkills",
  "evidenceQuality",
] as const;

export function weightsTotal(weights: ScoringWeights): number {
  return (
    weights.requiredSkills +
    weights.experience +
    weights.preferredSkills +
    weights.evidenceQuality
  );
}

export interface SettingsValidationResult {
  valid: boolean;
  value?: WorkspaceSettings;
  errors?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readWeight(
  source: Record<string, unknown>,
  key: keyof ScoringWeights,
  errors: string[]
): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    errors.push(`${key} must be a whole number.`);
    return 0;
  }
  if (value < 0 || value > 100) {
    errors.push(`${key} must be between 0 and 100.`);
    return 0;
  }
  return value;
}

/**
 * Validate an untrusted settings payload. Weights must be whole numbers and
 * total exactly 100, matching the deterministic engine contract.
 */
export function validateWorkspaceSettings(
  input: unknown
): SettingsValidationResult {
  if (!isRecord(input)) {
    return { valid: false, errors: ["Settings must be a JSON object."] };
  }

  const errors: string[] = [];

  const provider = input.provider;
  if (provider !== "mock" && provider !== "ollama") {
    errors.push('provider must be either "mock" or "ollama".');
  }

  const ollamaBaseUrl =
    typeof input.ollamaBaseUrl === "string" ? input.ollamaBaseUrl.trim() : "";
  if (
    ollamaBaseUrl.length === 0 ||
    ollamaBaseUrl.length > 500 ||
    !/^https?:\/\//i.test(ollamaBaseUrl)
  ) {
    errors.push("ollamaBaseUrl must be a valid http(s) URL.");
  }

  const ollamaModel =
    typeof input.ollamaModel === "string" ? input.ollamaModel.trim() : "";
  if (ollamaModel.length === 0 || ollamaModel.length > 200) {
    errors.push("ollamaModel must be a model name between 1 and 200 characters.");
  }

  const rawWeights = isRecord(input.weights) ? input.weights : {};
  const weights: ScoringWeights = {
    requiredSkills: readWeight(rawWeights, "requiredSkills", errors),
    experience: readWeight(rawWeights, "experience", errors),
    preferredSkills: readWeight(rawWeights, "preferredSkills", errors),
    evidenceQuality: readWeight(rawWeights, "evidenceQuality", errors),
  };

  if (errors.length === 0 && weightsTotal(weights) !== 100) {
    errors.push("Scoring weights must total exactly 100.");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    value: {
      provider: provider as ExtractionProviderId,
      ollamaBaseUrl,
      ollamaModel,
      weights,
    },
  };
}
