import { NextResponse } from "next/server";
import { checkRateLimit, clientIdentifier } from "@/lib/api/rate-limit";
import { readJsonBody, routeErrorResponse } from "@/lib/api/route-errors";
import { MAX_BATCH_BODY_BYTES, validateCreateBatchScreeningInput, type BatchScreeningEvent } from "@/lib/api/screening-contract";
import { beginBatchScreening, finishBatchScreening, getBatchRun, getScreeningById, markBatchCandidateProcessing, persistBatchOutcome } from "@/lib/db/screenings";
import { loadWorkspaceSettings, toProviderConfig } from "@/lib/settings/server";
import { processCandidateForBatch } from "@/lib/batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Request-bound streaming, not a durable worker. Hosting limits still apply.
export const maxDuration = 800;

export async function POST(request: Request) {
  const limit = checkRateLimit(`batch:${clientIdentifier(request)}`, 5, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many batch runs. Wait a minute and retry." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const body = await readJsonBody(request, MAX_BATCH_BODY_BYTES);
  if (!body.ok) return body.response;
  const validated = validateCreateBatchScreeningInput(body.value);
  if (!validated.value) return NextResponse.json({ error: "Invalid batch screening payload.", details: validated.errors }, { status: 400 });
  const input = validated.value;
  try {
    const { settings } = await loadWorkspaceSettings();
    // Settings supply default weights; explicit, validated weights override them.
    const raw = body.value as Record<string, unknown>;
    if (raw.weights === undefined) input.weights = settings.weights;
    const { run, requirements } = await beginBatchScreening(input, settings.provider, settings.provider === "ollama" ? settings.ollamaModel : undefined);
    let disconnected = false;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const emit = (event: BatchScreeningEvent) => {
          if (!disconnected) {
            try { controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); }
            catch { disconnected = true; }
          }
        };
        emit({ type: "start", screeningId: run.jobId, runId: run.id, totalCandidates: input.candidates.length, provider: settings.provider,
          candidates: input.candidates.map((source, index) => ({ index, name: source.name, sourceName: source.sourceName })) });
        try {
          for (const [index, source] of input.candidates.entries()) {
            if (disconnected || request.signal.aborted) throw new Error("The batch connection was closed.");
            const processingId = run.processingJobs[index].id;
            await markBatchCandidateProcessing(processingId);
            emit({ type: "candidate", candidate: { index, name: source.name, sourceName: source.sourceName, status: "PROCESSING" } });
            const outcome = await processCandidateForBatch({ candidateId: `cand-${run.id}-${index}`, source: { index, ...source }, requirements, weights: input.weights, providerConfig: toProviderConfig(settings) });
            await persistBatchOutcome(run.jobId, run.id, processingId, outcome);
            emit({ type: "candidate", candidate: { index, name: source.name, sourceName: source.sourceName,
              status: outcome.status === "completed" ? "COMPLETED" : "FAILED", score: outcome.result?.totalScore,
              routingState: outcome.result?.status, attempts: outcome.attempts, error: outcome.error,
              providerName: outcome.provider.name, fallbackUsed: outcome.provider.fallbackUsed, warnings: outcome.warnings } });
          }
          await finishBatchScreening(run.jobId, run.id);
          const screening = await getScreeningById(run.jobId);
          const summary = await getBatchRun(run.jobId, run.id);
          if (!screening || !summary) throw new Error("Saved results could not be read back.");
          emit({ type: "complete", screening, run: summary, failed: summary.candidates.filter((item) => item.status === "FAILED").map((item) => ({ name: item.name, sourceName: item.sourceName, error: item.error ?? "Candidate processing failed.", attempts: item.attempts ?? 0 })) });
        } catch (error) {
          console.error("[batch screening]", error);
          try { await finishBatchScreening(run.jobId, run.id, true); } catch (failure) { console.error("[batch finalization]", failure); }
          emit({ type: "error", error: "The run stopped. Completed candidates remain saved; check the recruitment workspace before starting another run." });
        } finally {
          if (!disconnected) controller.close();
        }
      },
      cancel() { disconnected = true; },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) { return routeErrorResponse(error, "POST /api/screenings/batch"); }
}
