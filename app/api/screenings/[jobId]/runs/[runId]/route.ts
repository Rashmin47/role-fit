import { NextResponse } from "next/server";
import { getBatchRun } from "@/lib/db/screenings";
import { routeErrorResponse } from "@/lib/api/route-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string; runId: string }> }) {
  const { jobId, runId } = await params;
  try {
    const run = await getBatchRun(jobId, runId);
    return run ? NextResponse.json({ run }) : NextResponse.json({ error: "That run does not exist." }, { status: 404 });
  } catch (error) { return routeErrorResponse(error, "GET batch run"); }
}
