import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route-errors";
import {
  loadWorkspaceSettings,
  saveWorkspaceSettings,
} from "@/lib/settings/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 10_000;

export async function GET() {
  try {
    const { settings, persisted } = await loadWorkspaceSettings();
    return NextResponse.json({ settings, persisted });
  } catch (error) {
    return routeErrorResponse(error, "GET /api/settings");
  }
}

export async function PUT(request: Request) {
  const rateLimit = checkRateLimit(
    `settings:${clientIdentifier(request)}`,
    30,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many settings updates. Wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;

  try {
    const settings = await saveWorkspaceSettings(body.value);
    return NextResponse.json({ settings, persisted: true });
  } catch (error) {
    return routeErrorResponse(error, "PUT /api/settings");
  }
}
