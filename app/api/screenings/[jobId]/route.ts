import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route-errors";
import { validateScoringWeights } from "@/lib/api/screening-contract";
import {
  getScreeningById,
  recomputeScreeningWeights,
} from "@/lib/db/screenings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 5_000;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const screening = await getScreeningById(jobId);
    if (!screening) {
      return NextResponse.json(
        { error: "That screening does not exist." },
        { status: 404 }
      );
    }
    return NextResponse.json({ screening });
  } catch (error) {
    return routeErrorResponse(error, "GET /api/screenings/[jobId]");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const rateLimit = checkRateLimit(
    `screenings-recompute:${clientIdentifier(request)}`,
    30,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many recompute requests. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const payload =
    body.value && typeof body.value === "object" && !Array.isArray(body.value)
      ? (body.value as Record<string, unknown>)
      : {};
  const validated = validateScoringWeights(payload.weights);
  if (!validated.valid || !validated.value) {
    return NextResponse.json(
      {
        error: "The scoring weights are invalid.",
        details: validated.errors,
      },
      { status: 400 }
    );
  }

  try {
    const screening = await recomputeScreeningWeights(jobId, validated.value);
    return NextResponse.json({ screening });
  } catch (error) {
    return routeErrorResponse(error, "PATCH /api/screenings/[jobId]");
  }
}
