import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody } from "@/lib/api/route-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 5_000;
const TIMEOUT_MS = 5_000;

interface OllamaTagsResponse {
  models?: Array<{ name?: string; model?: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Probe the configured Ollama server. This is a real connectivity check, not
 * a simulated status: it reads /api/tags and reports whether the model exists.
 */
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `ollama-check:${clientIdentifier(request)}`,
    20,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many connection checks. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  if (!isRecord(body.value)) {
    return NextResponse.json(
      { error: "Expected a JSON object with baseUrl and model." },
      { status: 400 }
    );
  }

  const baseUrl =
    typeof body.value.baseUrl === "string"
      ? body.value.baseUrl.trim().replace(/\/+$/, "")
      : "";
  const model =
    typeof body.value.model === "string" ? body.value.model.trim() : "";

  if (!/^https?:\/\//i.test(baseUrl)) {
    return NextResponse.json(
      { error: "The Ollama server URL must start with http:// or https://." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        reachable: false,
        modelAvailable: false,
        models: [],
        error: `The Ollama server responded with HTTP ${response.status}.`,
      });
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const models = (payload.models ?? [])
      .map((entry) => entry.name ?? entry.model ?? "")
      .filter(Boolean);

    const modelAvailable =
      model.length > 0 &&
      models.some(
        (available) =>
          available === model || available.startsWith(`${model}:`)
      );

    return NextResponse.json({
      reachable: true,
      modelAvailable,
      models,
      error: modelAvailable
        ? undefined
        : `The server is reachable, but "${model}" is not installed.`,
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json({
      reachable: false,
      modelAvailable: false,
      models: [],
      error: timedOut
        ? "The Ollama server did not respond within 5 seconds."
        : "The Ollama server could not be reached.",
    });
  }
}
