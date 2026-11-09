/**
 * Shared helpers for JSON route handlers.
 */

import { NextResponse } from "next/server";
import { ScreeningNotFoundError, RecomputeError } from "@/lib/db/screenings";
import { SettingsValidationError } from "@/lib/settings/server";

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

export async function readJsonBody(
  request: Request,
  maxBytes: number
): Promise<JsonBodyResult> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The request body could not be read." },
        { status: 400 }
      ),
    };
  }

  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The request body is too large." },
        { status: 413 }
      ),
    };
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Expected a JSON request body." },
        { status: 400 }
      ),
    };
  }
}

function isDatabaseNotReady(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /no such table|does not exist in the current database/i.test(
    error.message
  );
}

export function routeErrorResponse(
  error: unknown,
  context: string
): NextResponse {
  if (error instanceof ScreeningNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  if (error instanceof RecomputeError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 422 }
    );
  }

  if (error instanceof SettingsValidationError) {
    return NextResponse.json(
      { error: error.message, details: error.errors },
      { status: 400 }
    );
  }

  if (isDatabaseNotReady(error)) {
    return NextResponse.json(
      {
        error:
          "The database is not initialized. Run `npm run db:push` and `npm run db:seed`, then retry.",
        code: "database_not_initialized",
      },
      { status: 503 }
    );
  }

  console.error(`[${context}]`, error);
  return NextResponse.json(
    { error: "The request could not be completed." },
    { status: 500 }
  );
}
