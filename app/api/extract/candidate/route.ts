import { NextResponse } from "next/server";
import {
  ExtractionError,
  extractCandidateProfileOnServer,
} from "@/lib/ai/server-extraction";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import {
  loadWorkspaceSettings,
  toProviderConfig,
} from "@/lib/settings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
const MAX_BODY_BYTES = 500_000;
const MAX_TEXT_CHARS = 200_000;
const MIN_TEXT_CHARS = 20;
const MAX_NAME_CHARS = 200;

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ExtractionError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.code === "timeout" ? 504 : 502 }
    );
  }

  return NextResponse.json(
    { error: "The extraction service failed unexpectedly." },
    { status: 502 }
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `extract-candidate:${clientIdentifier(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many candidate extraction requests. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 }
    );
  }

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "The resume text is too large for extraction." },
      { status: 413 }
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Expected a JSON request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Expected a JSON object with text and an optional name." },
      { status: 400 }
    );
  }

  const { text, name } = body as Record<string, unknown>;

  if (typeof text !== "string" || text.trim().length < MIN_TEXT_CHARS) {
    return NextResponse.json(
      {
        error: `The resume text must be at least ${MIN_TEXT_CHARS} characters.`,
      },
      { status: 400 }
    );
  }

  if (text.length > MAX_TEXT_CHARS) {
    return NextResponse.json(
      { error: `The resume text must be ${MAX_TEXT_CHARS} characters or fewer.` },
      { status: 413 }
    );
  }

  if (
    name !== undefined &&
    (typeof name !== "string" || name.length > MAX_NAME_CHARS)
  ) {
    return NextResponse.json(
      { error: `The candidate name must be ${MAX_NAME_CHARS} characters or fewer.` },
      { status: 400 }
    );
  }

  try {
    const { settings } = await loadWorkspaceSettings();
    const result = await extractCandidateProfileOnServer(
      text,
      typeof name === "string" ? name.trim() || undefined : undefined,
      toProviderConfig(settings)
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
