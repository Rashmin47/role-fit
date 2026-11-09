import { NextResponse } from "next/server";
import {
  ExtractionError,
  extractJobRequirementsOnServer,
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
const RATE_LIMIT_MAX = 30;
const MAX_BODY_BYTES = 150_000;
const MAX_TITLE_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 50_000;
const MIN_DESCRIPTION_CHARS = 20;

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
    `extract-job:${clientIdentifier(request)}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many extraction requests. Wait a minute and try again." },
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
      { error: "The job description is too large for extraction." },
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
      { error: "Expected a JSON object with title and description." },
      { status: 400 }
    );
  }

  const { title, description } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "A job title is required." },
      { status: 400 }
    );
  }

  if (title.trim().length > MAX_TITLE_CHARS) {
    return NextResponse.json(
      { error: `The job title must be ${MAX_TITLE_CHARS} characters or fewer.` },
      { status: 400 }
    );
  }

  if (
    typeof description !== "string" ||
    description.trim().length < MIN_DESCRIPTION_CHARS
  ) {
    return NextResponse.json(
      {
        error: `The job description must be at least ${MIN_DESCRIPTION_CHARS} characters.`,
      },
      { status: 400 }
    );
  }

  if (description.length > MAX_DESCRIPTION_CHARS) {
    return NextResponse.json(
      {
        error: `The job description must be ${MAX_DESCRIPTION_CHARS} characters or fewer.`,
      },
      { status: 413 }
    );
  }

  try {
    const { settings } = await loadWorkspaceSettings();
    const result = await extractJobRequirementsOnServer(
      title.trim(),
      description,
      toProviderConfig(settings)
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
