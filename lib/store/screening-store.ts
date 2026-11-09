"use client";

import { useSyncExternalStore } from "react";
import type {
  JobScreening,
  DecisionStatus,
  ScoringWeights,
  CandidateScoreResult,
} from "@/types";
import {
  fetchScreenings,
  recomputeScreeningOnServer,
  updateCandidateDecisionOnServer,
} from "@/lib/api/screening-client";

/**
 * Workspace-wide screening store backed by the database API.
 *
 * The store is a module-level external store so every mounted screen
 * (dashboard, recruitment list, detail, candidate detail) converges on the
 * same persisted data. localStorage is no longer the source of truth.
 */

type LoadState = "idle" | "loading" | "ready" | "error";

const EMPTY_SCREENINGS: JobScreening[] = [];

let cachedScreenings: JobScreening[] | null = null;
let loadState: LoadState = "idle";
let loadError: string | null = null;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) listener();
}

function getSnapshot(): JobScreening[] {
  return cachedScreenings ?? EMPTY_SCREENINGS;
}

function getServerSnapshot(): JobScreening[] {
  return EMPTY_SCREENINGS;
}

function getLoadStateSnapshot(): LoadState {
  return loadState;
}

function getServerLoadStateSnapshot(): LoadState {
  return "loading";
}

function getErrorSnapshot(): string | null {
  return loadError;
}

function getServerErrorSnapshot(): string | null {
  return null;
}

function ensureLoaded(force = false): Promise<void> {
  if (loadPromise) return loadPromise;
  if (!force && loadState === "ready") return Promise.resolve();

  loadState = "loading";
  loadError = null;
  emitChange();

  loadPromise = fetchScreenings()
    .then((screenings) => {
      cachedScreenings = screenings;
      loadState = "ready";
    })
    .catch((error: unknown) => {
      loadState = "error";
      loadError =
        error instanceof Error
          ? error.message
          : "The screening workspace could not be loaded.";
    })
    .finally(() => {
      loadPromise = null;
      emitChange();
    });

  return loadPromise;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();

  return () => {
    listeners.delete(listener);
  };
}

function setError(message: string | null) {
  loadError = message;
  emitChange();
}

function replaceScreening(updated: JobScreening) {
  const current = getSnapshot();
  cachedScreenings = current.map((screening) =>
    screening.id === updated.id ? updated : screening
  );
  emitChange();
}

function updateScreeningCandidate(
  jobId: string,
  candidateId: string,
  candidate: CandidateScoreResult
) {
  const current = getSnapshot();
  cachedScreenings = current.map((screening) => {
    if (screening.id !== jobId) return screening;
    const candidates = screening.candidates.map((existing) =>
      existing.candidateId === candidateId ? candidate : existing
    );
    return {
      ...screening,
      candidates: candidates.sort((a, b) => b.totalScore - a.totalScore),
      reviewedCount: candidates.filter((c) => c.decision !== "pending").length,
      shortlistedCount: candidates.filter(
        (c) => c.decision === "shortlisted"
      ).length,
    };
  });
  emitChange();
}

function optimisticDecision(
  jobId: string,
  candidateId: string,
  decision: DecisionStatus,
  notes?: string
): CandidateScoreResult | null {
  const screening = getSnapshot().find((item) => item.id === jobId);
  const candidate = screening?.candidates.find(
    (item) => item.candidateId === candidateId
  );
  if (!screening || !candidate) return null;

  const optimistic: CandidateScoreResult = {
    ...candidate,
    decision,
    reviewNotes: notes ?? candidate.reviewNotes,
    reviewedAt: decision === "pending" ? undefined : new Date().toISOString(),
  };
  updateScreeningCandidate(jobId, candidateId, optimistic);
  return candidate;
}

export function useScreeningStore() {
  const screenings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
  const state = useSyncExternalStore(
    subscribe,
    getLoadStateSnapshot,
    getServerLoadStateSnapshot
  );
  const error = useSyncExternalStore(
    subscribe,
    getErrorSnapshot,
    getServerErrorSnapshot
  );

  const updateCandidateDecision = async (
    jobId: string,
    candidateId: string,
    decision: DecisionStatus,
    notes?: string
  ): Promise<boolean> => {
    const previous = optimisticDecision(jobId, candidateId, decision, notes);
    setError(null);

    try {
      const { candidate } = await updateCandidateDecisionOnServer(
        jobId,
        candidateId,
        { decision, notes }
      );
      updateScreeningCandidate(jobId, candidateId, candidate);
      return true;
    } catch (requestError) {
      if (previous) {
        updateScreeningCandidate(jobId, candidateId, previous);
      }
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The decision could not be saved."
      );
      return false;
    }
  };

  const addScreening = (saved: JobScreening) => {
    cachedScreenings = [
      saved,
      ...getSnapshot().filter((screening) => screening.id !== saved.id),
    ];
    loadState = "ready";
    setError(null);
  };

  const recomputeScoresWithWeights = async (
    jobId: string,
    weights: ScoringWeights
  ): Promise<boolean> => {
    setError(null);
    try {
      const { screening } = await recomputeScreeningOnServer(jobId, weights);
      replaceScreening(screening);
      return true;
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The scores could not be recomputed."
      );
      return false;
    }
  };

  const refresh = () => ensureLoaded(true);

  return {
    screenings,
    isLoading: state === "loading" || state === "idle",
    isReady: state === "ready",
    error,
    refresh,
    addScreening,
    updateCandidateDecision,
    recomputeScoresWithWeights,
  };
}
