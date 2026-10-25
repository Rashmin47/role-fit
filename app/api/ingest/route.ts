import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_FILES = 20;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_CHARS = 200_000;
const MIN_TEXT_CHARS = 20;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

interface IngestedDocument {
  name: string;
  size: number;
  text: string;
  pages?: number;
  truncated: boolean;
}

interface FailedDocument {
  name: string;
  size: number;
  error: string;
}

// Best-effort, single-instance rate limit. A durable deployment should move
// this to a shared store (Redis/DB) or edge middleware.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

function sanitizeFilename(name: string): string {
  const cleaned = name
    .replace(/[\\/]/g, "_")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180);
  return cleaned || "resume";
}

function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPdfText(
  buffer: ArrayBuffer
): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n\n") : result.text;
  return { text, pages: result.totalPages };
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(buffer),
  });
  return result.value;
}

async function parseFile(file: File): Promise<IngestedDocument> {
  const name = sanitizeFilename(file.name);
  const extension = extensionOf(name);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let text = "";
  let pages: number | undefined;

  if (extension === "pdf") {
    if (!startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
      throw new Error("The file is named .pdf but does not contain a PDF header.");
    }
    try {
      const extracted = await extractPdfText(buffer);
      text = extracted.text;
      pages = extracted.pages;
    } catch {
      throw new Error(
        "Could not read this PDF. It may be encrypted, corrupt, or an unsupported format."
      );
    }
  } else if (extension === "docx") {
    if (!startsWithBytes(bytes, [0x50, 0x4b])) {
      throw new Error(
        "The file is named .docx but is not a valid Office Open XML archive."
      );
    }
    try {
      text = await extractDocxText(buffer);
    } catch {
      throw new Error("Could not read this DOCX file. It may be corrupt.");
    }
  } else if (extension === "txt" || extension === "md") {
    if (bytes.includes(0x00)) {
      throw new Error("The text file appears to be binary, not plain text.");
    }
    text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } else if (extension === "doc") {
    throw new Error(
      "Legacy .doc files are not supported. Save the document as .docx or PDF."
    );
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.");
  }

  const normalized = normalizeExtractedText(text);
  const truncated = normalized.length > MAX_TEXT_CHARS;

  if (normalized.length < MIN_TEXT_CHARS) {
    throw new Error(
      "No readable text was found. Scanned PDFs need OCR before upload."
    );
  }

  return {
    name,
    size: file.size,
    text: truncated ? normalized.slice(0, MAX_TEXT_CHARS) : normalized,
    pages,
    truncated,
  };
}

function clientIdentifier(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(request: Request) {
  if (!checkRateLimit(clientIdentifier(request))) {
    return NextResponse.json(
      { error: "Too many upload requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected a multipart/form-data upload." },
      { status: 400 }
    );
  }

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files were included in the request." },
      { status: 400 }
    );
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Upload at most ${MAX_FILES} files per screening.` },
      { status: 400 }
    );
  }

  const totalBytes = files.reduce((total, file) => total + file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      {
        error: `Uploads exceed the ${Math.round(
          MAX_TOTAL_BYTES / (1024 * 1024)
        )} MB total limit.`,
      },
      { status: 413 }
    );
  }

  const documents: IngestedDocument[] = [];
  const failed: FailedDocument[] = [];

  for (const file of files) {
    const name = sanitizeFilename(file.name);

    if (file.size === 0) {
      failed.push({ name, size: 0, error: "The file is empty." });
      continue;
    }

    if (file.size > MAX_FILE_BYTES) {
      failed.push({
        name,
        size: file.size,
        error: `Files must be ${Math.round(
          MAX_FILE_BYTES / (1024 * 1024)
        )} MB or smaller.`,
      });
      continue;
    }

    try {
      documents.push(await parseFile(file));
    } catch (error) {
      failed.push({
        name,
        size: file.size,
        error:
          error instanceof Error
            ? error.message
            : "The file could not be parsed.",
      });
    }
  }

  return NextResponse.json({ documents, failed });
}
