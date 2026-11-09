/**
 * Browser client for the server-side extraction routes.
 *
 * Keep provider imports and environment access out of this module. It only
 * sends text to `/api/extract/*` and returns validated structured data.
 */

import type {
  CandidateExtractionResponse,
  JobExtractionResponse,
} from "@/lib/ai/extraction-contract";

const REQUEST_TIMEOUT_MS = 70_000;

interface ErrorPayload {
  error?: string;
  code?: string;
  details?: string[];
}

export class ExtractionRequestError extends Error {
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
    this.name = "ExtractionRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function postExtraction<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    throw new ExtractionRequestError(
      timedOut
        ? "Extraction took too long. Try again or switch to the offline extractor."
        : "The extraction service could not be reached.",
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
    const errorPayload = (payload ?? {}) as ErrorPayload;
    throw new ExtractionRequestError(
      errorPayload.error || `Extraction failed (HTTP ${response.status}).`,
      response.status,
      errorPayload.code,
      errorPayload.details
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new ExtractionRequestError(
      "The extraction service returned an unreadable response.",
      502
    );
  }

  return payload as T;
}

export function requestJobExtraction(
  title: string,
  description: string
): Promise<JobExtractionResponse> {
  return postExtraction<JobExtractionResponse>("/api/extract/job", {
    title,
    description,
  });
}

export function requestCandidateExtraction(
  text: string,
  name?: string
): Promise<CandidateExtractionResponse> {
  return postExtraction<CandidateExtractionResponse>(
    "/api/extract/candidate",
    { text, name }
  );
}
