/**
 * Browser client for persisted workspace settings.
 */

import type { WorkspaceSettings } from "@/lib/settings/types";

export class SettingsRequestError extends Error {
  readonly status: number;
  readonly details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "SettingsRequestError";
    this.status = status;
    this.details = details;
  }
}

interface SettingsResponse {
  settings: WorkspaceSettings;
  persisted: boolean;
}

interface ErrorPayload {
  error?: string;
  details?: string[];
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SettingsRequestError(
      "The settings service could not be reached.",
      0
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ErrorPayload;
    throw new SettingsRequestError(
      errorPayload.error || `The request failed (HTTP ${response.status}).`,
      response.status,
      errorPayload.details
    );
  }

  return payload as T;
}

export function fetchSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>("/api/settings", {
    method: "GET",
    cache: "no-store",
  });
}

export function saveSettings(
  settings: WorkspaceSettings
): Promise<SettingsResponse> {
  return request<SettingsResponse>("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

export interface OllamaCheckResult {
  reachable: boolean;
  modelAvailable: boolean;
  models: string[];
  error?: string;
}

export function checkOllamaConnection(
  baseUrl: string,
  model: string
): Promise<OllamaCheckResult> {
  return request<OllamaCheckResult>("/api/settings/ollama", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseUrl, model }),
  });
}
