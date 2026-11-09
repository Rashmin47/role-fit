/**
 * Browser client for persisted screenings.
 *
 * No database or provider code enters the client bundle; this module only
 * talks to /api/screenings.
 */

import type { CandidateScoreResult, JobScreening, ScoringWeights } from "@/types";
import type {
  BatchScreeningEvent,
  BatchCompleteEvent,
  CreateBatchScreeningInput,
  CandidateDecisionInput,
  CreateScreeningInput,
  CreateScreeningResult,
  ScreeningErrorPayload,
} from "./screening-contract";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function createBatchScreening(input: CreateBatchScreeningInput, onEvent: (event: BatchScreeningEvent) => void): Promise<BatchCompleteEvent> {
  const response = await fetch("/api/screenings/batch", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = await response.json() as ScreeningErrorPayload;
    throw new ScreeningRequestError(payload.error, response.status, payload.code, payload.details);
  }
  if (!response.body) throw new Error("Streaming progress is unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete: BatchCompleteEvent | undefined;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as BatchScreeningEvent;
    if (!["start", "candidate", "complete", "error"].includes(event.type)) throw new Error("Invalid batch progress response.");
    onEvent(event);
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "complete") complete = event;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (done) break;
    }
    consume(buffer);
    if (!complete) throw new Error("The progress connection ended early. Completed results may be saved; check the recruitment workspace before retrying.");
    return complete;
  } finally { await reader.cancel(); reader.releaseLock(); }
}

export class ScreeningRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: string[];

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: string[]
  ) {
    super(message);
    this.name = "ScreeningRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new ScreeningRequestError(
      timedOut
        ? "The request took too long. Try again."
        : "The screening service could not be reached.",
      timedOut ? 504 : 0
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorPayload = (payload ?? {}) as ScreeningErrorPayload;
    throw new ScreeningRequestError(
      errorPayload.error || `The request failed (HTTP ${response.status}).`,
      response.status,
      errorPayload.code,
      errorPayload.details
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new ScreeningRequestError(
      "The screening service returned an unreadable response.",
      502
    );
  }

  return payload as T;
}

export async function fetchScreenings(): Promise<JobScreening[]> {
  const payload = await requestJson<{ screenings: JobScreening[] }>(
    "/api/screenings",
    { method: "GET", cache: "no-store" }
  );
  return payload.screenings;
}

export function createScreening(
  input: CreateScreeningInput
): Promise<CreateScreeningResult> {
  return requestJson<CreateScreeningResult>(
    "/api/screenings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    120_000
  );
}

export function updateCandidateDecisionOnServer(
  jobId: string,
  candidateId: string,
  input: CandidateDecisionInput
): Promise<{ candidate: CandidateScoreResult }> {
  return requestJson<{ candidate: CandidateScoreResult }>(
    `/api/screenings/${encodeURIComponent(jobId)}/candidates/${encodeURIComponent(
      candidateId
    )}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

export function recomputeScreeningOnServer(
  jobId: string,
  weights: ScoringWeights
): Promise<{ screening: JobScreening }> {
  return requestJson<{ screening: JobScreening }>(
    `/api/screenings/${encodeURIComponent(jobId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    }
  );
}
