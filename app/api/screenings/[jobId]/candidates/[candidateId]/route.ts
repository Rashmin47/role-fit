import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route-errors";
import { validateDecisionInput } from "@/lib/api/screening-contract";
import { updateCandidateDecision } from "@/lib/db/screenings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ jobId: string; candidateId: string }>;
  }
) {
  const { jobId, candidateId } = await params;

  const rateLimit = checkRateLimit(
    `candidate-decision:${clientIdentifier(request)}`,
    120,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many decision updates. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  const validated = validateDecisionInput(body.value);
  if (!validated.valid || !validated.value) {
    return NextResponse.json(
      {
        error: "The decision payload is invalid.",
        details: validated.errors,
      },
      { status: 400 }
    );
  }

  try {
    const candidate = await updateCandidateDecision(
      jobId,
      candidateId,
      validated.value
    );
    return NextResponse.json({ candidate });
  } catch (error) {
    return routeErrorResponse(
      error,
      "PATCH /api/screenings/[jobId]/candidates/[candidateId]"
    );
  }
}
