import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route-errors";
import {
  validateCreateScreeningInput,
} from "@/lib/api/screening-contract";
import { createScreening, listScreenings } from "@/lib/db/screenings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 12_000_000;

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(
    `screenings-list:${clientIdentifier(request)}`,
    120,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  try {
    const screenings = await listScreenings();
    return NextResponse.json({ screenings });
  } catch (error) {
    return routeErrorResponse(error, "GET /api/screenings");
  }
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `screenings-create:${clientIdentifier(request)}`,
    20,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many screening runs. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const validated = validateCreateScreeningInput(body.value);
  if (!validated.valid || !validated.value) {
    return NextResponse.json(
      {
        error: "The screening payload is invalid.",
        code: "invalid_screening",
        details: validated.errors,
        failed: validated.failed,
      },
      { status: 400 }
    );
  }

  try {
    const result = await createScreening(validated.value);
    return NextResponse.json(
      { screening: result.screening, failed: result.failed ?? [] },
      { status: 201 }
    );
  } catch (error) {
    return routeErrorResponse(error, "POST /api/screenings");
  }
}
