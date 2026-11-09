/**
 * Wire contract for creating and updating persisted screenings.
 *
 * The browser sends validated extraction output only. The server re-validates
 * it, runs the deterministic engine, and stores the resulting facts. A client
 * can never submit a score that the server trusts.
 */

import type { CandidateProfile, StructuredJobRequirements } from "@/lib/ai/schemas";
import { validateCandidateProfileOutput, validateJobRequirementsOutput } from "@/lib/ai/schemas";
import type {
  DecisionStatus,
  JobScreening,
  ScoringWeights,
} from "@/types";
import { DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";

export const MAX_SCREENING_CANDIDATES = 20;
export const MAX_SCREENING_NOTES = 50;

/**
 * Batch limits. The batch route accepts raw resume text and extracts on the
 * server, so the count is intentionally higher than the single-request wizard
 * profile bound. True 200-file ingestion still needs chunked uploads.
 */
export const MAX_BATCH_CANDIDATES = 200;
export const MIN_CANDIDATE_TEXT_CHARS = 20;
export const MAX_CANDIDATE_TEXT_CHARS = 200_000;
export const MAX_BATCH_TOTAL_TEXT_CHARS = 20_000_000;
export const MAX_BATCH_BODY_BYTES = 24_000_000;

export interface CandidateScreeningInput {
  profile: CandidateProfile;
  warnings?: string[];
  sourceName?: string;
}

export interface CreateScreeningInput {
  title: string;
  department: string;
  location: string;
  rawDescription: string;
  isSample?: boolean;
  processingNotes?: string[];
  requirements: StructuredJobRequirements;
  weights?: ScoringWeights;
  candidates: CandidateScreeningInput[];
}

export interface CreateScreeningResult {
  screening: JobScreening;
  failed: Array<{ name: string; error: string }>;
}

export interface CandidateDecisionInput {
  decision: DecisionStatus;
  notes?: string;
}

export interface ScreeningWeightsInput {
  weights: ScoringWeights;
}

/* ------------------------------------------------------------------------- *
 * Batch screening contract
 * ------------------------------------------------------------------------- */

export type BatchScreeningRunStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type BatchCandidateStatus =
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export interface BatchCandidateInput {
  /** Display label. Falls back to the source name or candidate index. */
  name: string;
  /** Uploaded filename or source label shown in progress and notes. */
  sourceName: string;
  /** Raw resume text. Extraction happens server-side. */
  text: string;
}

export interface CreateBatchScreeningInput {
  title: string;
  department: string;
  location: string;
  rawDescription: string;
  isSample?: boolean;
  processingNotes?: string[];
  requirements: StructuredJobRequirements;
  weights?: ScoringWeights;
  candidates: BatchCandidateInput[];
}

export interface BatchCandidateProgress {
  index: number;
  name: string;
  sourceName: string;
  status: BatchCandidateStatus;
  candidateId?: string;
  score?: number;
  routingState?: string;
  error?: string;
  attempts?: number;
  providerName?: string;
  fallbackUsed?: boolean;
  warnings?: string[];
}

export interface BatchCandidateFailure {
  name: string;
  sourceName: string;
  error: string;
  attempts: number;
}

export interface BatchScreeningRunSummary {
  id: string;
  jobId: string;
  status: BatchScreeningRunStatus;
  totalCandidates: number;
  completedCandidates: number;
  failedCandidates: number;
  provider?: string;
  model?: string;
  startedAt: string;
  completedAt?: string;
  candidates: BatchCandidateProgress[];
}

export interface BatchStartEvent {
  type: "start";
  screeningId: string;
  runId: string;
  totalCandidates: number;
  provider?: string;
  model?: string;
  candidates: Array<{ index: number; name: string; sourceName: string }>;
}

export interface BatchCandidateEvent {
  type: "candidate";
  candidate: BatchCandidateProgress;
}

export interface BatchCompleteEvent {
  type: "complete";
  screening: JobScreening;
  run: BatchScreeningRunSummary;
  failed: BatchCandidateFailure[];
}

export interface BatchErrorEvent {
  type: "error";
  error: string;
  code?: string;
  details?: string[];
}

export type BatchScreeningEvent =
  | BatchStartEvent
  | BatchCandidateEvent
  | BatchCompleteEvent
  | BatchErrorEvent;

export interface ScreeningErrorPayload {
  error: string;
  code?: string;
  details?: string[];
}

const DECISIONS: readonly DecisionStatus[] = [
  "pending",
  "shortlisted",
  "held",
  "not_recommended",
];

const MAX_TITLE_CHARS = 200;
const MAX_TEXT_CHARS = 50_000;
const MAX_DESCRIPTION_CHARS = 50_000;
const MAX_NOTE_CHARS = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
}

export function validateScoringWeights(input: unknown): {
  valid: boolean;
  value?: ScoringWeights;
  errors?: string[];
} {
  if (!isRecord(input)) {
    return { valid: false, errors: ["weights must be a JSON object."] };
  }

  const errors: string[] = [];
  const read = (key: keyof ScoringWeights): number => {
    const value = input[key];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`weights.${key} must be a whole number.`);
      return 0;
    }
    if (value < 0 || value > 100) {
      errors.push(`weights.${key} must be between 0 and 100.`);
      return 0;
    }
    return value;
  };

  const weights: ScoringWeights = {
    requiredSkills: read("requiredSkills"),
    experience: read("experience"),
    preferredSkills: read("preferredSkills"),
    evidenceQuality: read("evidenceQuality"),
  };

  const total =
    weights.requiredSkills +
    weights.experience +
    weights.preferredSkills +
    weights.evidenceQuality;

  if (errors.length === 0 && total !== 100) {
    errors.push("Scoring weights must total exactly 100.");
  }

  return errors.length > 0
    ? { valid: false, errors }
    : { valid: true, value: weights };
}

export function validateCreateScreeningInput(input: unknown): {
  valid: boolean;
  value?: CreateScreeningInput;
  failed?: Array<{ name: string; error: string }>;
  errors?: string[];
} {
  if (!isRecord(input)) {
    return { valid: false, errors: ["The screening payload must be an object."] };
  }

  const errors: string[] = [];
  const failed: Array<{ name: string; error: string }> = [];

  const title = cleanString(input.title, MAX_TITLE_CHARS);
  if (!title) errors.push("A job title is required.");

  const department = cleanString(input.department, MAX_TITLE_CHARS) ?? "";
  const location = cleanString(input.location, MAX_TITLE_CHARS) ?? "";

  const rawDescription =
    typeof input.rawDescription === "string"
      ? input.rawDescription.trim()
      : "";
  if (rawDescription.length < 20) {
    errors.push("The job description must be at least 20 characters.");
  } else if (rawDescription.length > MAX_TEXT_CHARS) {
    errors.push(
      `The job description must be ${MAX_DESCRIPTION_CHARS} characters or fewer.`
    );
  }

  const requirementsResult = validateJobRequirementsOutput(input.requirements);
  if (!requirementsResult.data) {
    errors.push("The job requirements could not be validated.");
  }

  const weightsResult = validateScoringWeights(
    input.weights ?? DEFAULT_SCORING_WEIGHTS
  );
  if (!weightsResult.valid) {
    errors.push(...(weightsResult.errors ?? []));
  }

  const rawCandidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (rawCandidates.length === 0) {
    errors.push("At least one candidate profile is required.");
  }
  if (rawCandidates.length > MAX_SCREENING_CANDIDATES) {
    errors.push(
      `A screening can contain at most ${MAX_SCREENING_CANDIDATES} candidates.`
    );
  }

  const candidates: CandidateScreeningInput[] = [];
  rawCandidates.slice(0, MAX_SCREENING_CANDIDATES).forEach((entry, index) => {
    if (!isRecord(entry)) {
      failed.push({
        name: `candidate-${index + 1}`,
        error: "Candidate entry is not an object.",
      });
      return;
    }

    const sourceName =
      cleanString(entry.sourceName, MAX_TITLE_CHARS) ?? `candidate-${index + 1}`;
    const validated = validateCandidateProfileOutput(
      entry.profile,
      sourceName
    );

    if (!validated.valid || !validated.data) {
      failed.push({
        name: sourceName,
        error:
          validated.errors?.join(" ") ??
          "The candidate profile could not be validated.",
      });
      return;
    }

    const incomingWarnings = Array.isArray(entry.warnings)
      ? entry.warnings
          .filter((warning): warning is string => typeof warning === "string")
          .map((warning) => warning.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    candidates.push({
      profile: validated.data,
      warnings: [...incomingWarnings, ...(validated.warnings ?? [])],
      sourceName,
    });
  });

  if (candidates.length === 0) {
    errors.push("No candidate profile could be validated.");
  }

  const processingNotes = Array.isArray(input.processingNotes)
    ? input.processingNotes
        .filter((note): note is string => typeof note === "string")
        .map((note) => note.trim().slice(0, MAX_NOTE_CHARS))
        .filter(Boolean)
        .slice(0, MAX_SCREENING_NOTES)
    : [];

  if (errors.length > 0 || !requirementsResult.data || !weightsResult.value) {
    return { valid: false, errors: errors.length > 0 ? errors : undefined, failed };
  }

  return {
    valid: true,
    failed,
    value: {
      title: title!,
      department,
      location,
      rawDescription,
      isSample: input.isSample === true,
      processingNotes,
      requirements: requirementsResult.data,
      weights: weightsResult.value,
      candidates,
    },
  };
}

export function validateCreateBatchScreeningInput(input: unknown): {
  valid: boolean;
  value?: CreateBatchScreeningInput;
  errors?: string[];
} {
  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["The batch screening payload must be an object."],
    };
  }

  const errors: string[] = [];

  const title = cleanString(input.title, MAX_TITLE_CHARS);
  if (!title) errors.push("A job title is required.");

  const department = cleanString(input.department, MAX_TITLE_CHARS) ?? "";
  const location = cleanString(input.location, MAX_TITLE_CHARS) ?? "";

  const rawDescription =
    typeof input.rawDescription === "string"
      ? input.rawDescription.trim()
      : "";
  if (rawDescription.length < 20) {
    errors.push("The job description must be at least 20 characters.");
  } else if (rawDescription.length > MAX_TEXT_CHARS) {
    errors.push(
      `The job description must be ${MAX_DESCRIPTION_CHARS} characters or fewer.`
    );
  }

  const requirementsResult = validateJobRequirementsOutput(input.requirements);
  if (!requirementsResult.data) {
    errors.push("The job requirements could not be validated.");
  }

  const weightsResult = validateScoringWeights(
    input.weights ?? DEFAULT_SCORING_WEIGHTS
  );
  if (!weightsResult.valid) {
    errors.push(...(weightsResult.errors ?? []));
  }

  const rawCandidates = Array.isArray(input.candidates) ? input.candidates : [];
  if (rawCandidates.length === 0) {
    errors.push("At least one candidate resume is required.");
  }
  if (rawCandidates.length > MAX_BATCH_CANDIDATES) {
    errors.push(
      `A batch can contain at most ${MAX_BATCH_CANDIDATES} candidates.`
    );
  }

  const candidates: BatchCandidateInput[] = [];
  let totalTextChars = 0;

  rawCandidates.slice(0, MAX_BATCH_CANDIDATES).forEach((entry, index) => {
    if (!isRecord(entry)) {
      errors.push(`candidates[${index}] must be an object.`);
      return;
    }

    // A short but non-empty resume is allowed through so extraction can fail
    // for that candidate in isolation instead of rejecting the whole batch.
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    if (text.length === 0) {
      errors.push(`candidates[${index}].text is required.`);
      return;
    }
    if (text.length > MAX_CANDIDATE_TEXT_CHARS) {
      errors.push(
        `candidates[${index}].text must be ${MAX_CANDIDATE_TEXT_CHARS} characters or fewer.`
      );
      return;
    }

    totalTextChars += text.length;

    const fallbackName = `candidate-${index + 1}`;
    const name =
      cleanString(entry.name, MAX_TITLE_CHARS) ??
      cleanString(entry.sourceName, MAX_TITLE_CHARS) ??
      fallbackName;
    const sourceName =
      cleanString(entry.sourceName, MAX_TITLE_CHARS) ?? name;

    candidates.push({ name, sourceName, text });
  });

  if (totalTextChars > MAX_BATCH_TOTAL_TEXT_CHARS) {
    errors.push(
      `The batch contains too much text (${totalTextChars} characters). Split it into smaller runs.`
    );
  }

  if (candidates.length === 0 && errors.length === 0) {
    errors.push("No usable candidate text was provided.");
  }

  const processingNotes = Array.isArray(input.processingNotes)
    ? input.processingNotes
        .filter((note): note is string => typeof note === "string")
        .map((note) => note.trim().slice(0, MAX_NOTE_CHARS))
        .filter(Boolean)
        .slice(0, MAX_SCREENING_NOTES)
    : [];

  if (errors.length > 0 || !requirementsResult.data || !weightsResult.value) {
    return {
      valid: false,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  return {
    valid: true,
    value: {
      title: title!,
      department,
      location,
      rawDescription,
      isSample: input.isSample === true,
      processingNotes,
      requirements: requirementsResult.data,
      weights: weightsResult.value,
      candidates,
    },
  };
}

export function validateDecisionInput(input: unknown): {
  valid: boolean;
  value?: CandidateDecisionInput;
  errors?: string[];
} {
  if (!isRecord(input)) {
    return { valid: false, errors: ["The decision payload must be an object."] };
  }

  const decision = input.decision;
  if (
    typeof decision !== "string" ||
    !DECISIONS.includes(decision as DecisionStatus)
  ) {
    return {
      valid: false,
      errors: [
        "decision must be pending, shortlisted, held, or not_recommended.",
      ],
    };
  }

  if (
    input.notes !== undefined &&
    (typeof input.notes !== "string" || input.notes.length > MAX_NOTE_CHARS * 4)
  ) {
    return {
      valid: false,
      errors: [
        `notes must be a string of ${MAX_NOTE_CHARS * 4} characters or fewer.`,
      ],
    };
  }

  return {
    valid: true,
    value: {
      decision: decision as DecisionStatus,
      notes:
        typeof input.notes === "string" ? input.notes.trim() : undefined,
    },
  };
}
