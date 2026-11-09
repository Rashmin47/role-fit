/**
 * Server-only workspace settings.
 *
 * Provider selection and default scoring weights belong in the database so a
 * server restart does not silently change how candidates are extracted or
 * scored. Environment variables remain the bootstrap/fallback values.
 */

import { prisma } from "@/lib/db/prisma";
import type { AIProviderConfig } from "@/lib/ai/provider";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type WorkspaceSettings,
  validateWorkspaceSettings,
} from "./types";

if (typeof window !== "undefined") {
  throw new Error(
    "Workspace settings are server-only. Read them through /api/settings."
  );
}

export function envDefaultSettings(): WorkspaceSettings {
  const provider =
    (process.env.AI_PROVIDER ?? "").toLowerCase() === "ollama"
      ? "ollama"
      : "mock";

  return {
    ...DEFAULT_WORKSPACE_SETTINGS,
    provider,
    ollamaBaseUrl:
      process.env.OLLAMA_BASE_URL ??
      DEFAULT_WORKSPACE_SETTINGS.ollamaBaseUrl,
    ollamaModel:
      process.env.OLLAMA_MODEL ?? DEFAULT_WORKSPACE_SETTINGS.ollamaModel,
  };
}

function rowToSettings(row: {
  provider: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  requiredSkillsWeight: number;
  experienceWeight: number;
  preferredSkillsWeight: number;
  evidenceQualityWeight: number;
}): WorkspaceSettings {
  return {
    provider: row.provider === "ollama" ? "ollama" : "mock",
    ollamaBaseUrl: row.ollamaBaseUrl,
    ollamaModel: row.ollamaModel,
    weights: {
      requiredSkills: row.requiredSkillsWeight,
      experience: row.experienceWeight,
      preferredSkills: row.preferredSkillsWeight,
      evidenceQuality: row.evidenceQualityWeight,
    },
  };
}

/**
 * Load settings with a safe fallback when the database has not been
 * initialized yet. The UI surfaces the fallback so configuration is never
 * silently misrepresented.
 */
export async function loadWorkspaceSettings(): Promise<{
  settings: WorkspaceSettings;
  persisted: boolean;
}> {
  try {
    const row = await prisma.workspaceSettings.findUnique({
      where: { id: "default" },
    });

    if (row) {
      return { settings: rowToSettings(row), persisted: true };
    }

    return { settings: envDefaultSettings(), persisted: false };
  } catch (error) {
    console.warn(
      "Could not read workspace settings; using environment defaults.",
      error
    );
    return { settings: envDefaultSettings(), persisted: false };
  }
}

export async function saveWorkspaceSettings(
  input: unknown
): Promise<WorkspaceSettings> {
  const validated = validateWorkspaceSettings(input);
  if (!validated.valid || !validated.value) {
    throw new SettingsValidationError(
      validated.errors ?? ["The settings payload is invalid."]
    );
  }

  const settings = validated.value;
  const shared = {
    provider: settings.provider,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    ollamaModel: settings.ollamaModel,
    requiredSkillsWeight: settings.weights.requiredSkills,
    experienceWeight: settings.weights.experience,
    preferredSkillsWeight: settings.weights.preferredSkills,
    evidenceQualityWeight: settings.weights.evidenceQuality,
  };

  const row = await prisma.workspaceSettings.upsert({
    where: { id: "default" },
    update: shared,
    create: { id: "default", ...shared },
  });

  return rowToSettings(row);
}

export class SettingsValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[]) {
    super("The workspace settings payload is invalid.");
    this.name = "SettingsValidationError";
    this.errors = errors;
  }
}

/** Adapt persisted settings to the pure provider factory. */
export function toProviderConfig(
  settings: WorkspaceSettings
): AIProviderConfig {
  return {
    provider: settings.provider,
    ollamaBaseUrl: settings.ollamaBaseUrl,
    ollamaModel: settings.ollamaModel,
  };
}

export {
  DEFAULT_WORKSPACE_SETTINGS,
  validateWorkspaceSettings,
  weightsTotal,
  type ExtractionProviderId,
  type WorkspaceSettings,
} from "./types";
