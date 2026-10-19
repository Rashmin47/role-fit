"use client";

import { useSyncExternalStore } from "react";
import {
  JobScreening,
  DecisionStatus,
  ScoringWeights,
} from "@/types";
import { SAMPLE_SCREENINGS } from "../data/sample-data";
import { calculateFinalMatchScore } from "../scoring";

const STORAGE_KEY = "rolefit_screenings_state_v1";
const LEGACY_STORAGE_KEY = "nirman_screenings_state_v1";

/**
 * A tiny module-level external store.
 *
 * Why not `useState` + `useEffect`? The screening list is persisted in
 * localStorage and shared by every mounted screen (dashboard, recruitment,
 * candidate detail). A single external store keeps all consumers in sync and
 * lets `useSyncExternalStore` handle hydration without a setState-in-effect.
 */
let cachedScreenings: JobScreening[] | null = null;
const listeners = new Set<() => void>();

function readScreenings(): JobScreening[] {
  if (typeof window === "undefined") return SAMPLE_SCREENINGS;

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as JobScreening[];
  } catch (error) {
    console.error("Failed to read screenings from localStorage", error);
  }

  return SAMPLE_SCREENINGS;
}

function writeScreenings(screenings: JobScreening[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(screenings));
  } catch (error) {
    console.error("Failed to save screenings", error);
  }
}

function emitChange() {
  for (const listener of listeners) listener();
}

function getSnapshot(): JobScreening[] {
  if (cachedScreenings === null) {
    cachedScreenings = readScreenings();
  }
  return cachedScreenings;
}

function getServerSnapshot(): JobScreening[] {
  return SAMPLE_SCREENINGS;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Keep multiple tabs in sync.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return;
    cachedScreenings = readScreenings();
    emitChange();
  };

  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(screenings: JobScreening[]) {
  cachedScreenings = screenings;
  writeScreenings(screenings);
  emitChange();
}

/** @deprecated Prefer the `useScreeningStore` hook. Kept for non-React callers. */
export function getInitialScreenings(): JobScreening[] {
  return getSnapshot();
}

/** @deprecated Prefer the `useScreeningStore` hook. Kept for non-React callers. */
export function saveScreenings(screenings: JobScreening[]) {
  commit(screenings);
}

export function useScreeningStore() {
  const screenings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const updateCandidateDecision = (
    jobId: string,
    candidateId: string,
    decision: DecisionStatus,
    notes?: string
  ) => {
    const next = getSnapshot().map((screening) => {
      if (screening.id !== jobId) return screening;

      const candidates = screening.candidates.map((candidate) =>
        candidate.candidateId === candidateId
          ? {
              ...candidate,
              decision,
              reviewNotes: notes ?? candidate.reviewNotes,
              reviewedAt: new Date().toISOString(),
            }
          : candidate
      );

      return {
        ...screening,
        candidates,
        reviewedCount: candidates.filter((c) => c.decision !== "pending").length,
        shortlistedCount: candidates.filter(
          (c) => c.decision === "shortlisted"
        ).length,
      };
    });

    commit(next);
  };

  const addScreening = (newScreening: JobScreening) => {
    commit([newScreening, ...getSnapshot()]);
  };

  const recomputeScoresWithWeights = (
    jobId: string,
    weights: ScoringWeights
  ) => {
    const next = getSnapshot().map((screening) => {
      if (screening.id !== jobId) return screening;

      const recalculated = screening.candidates.map((candidate) => {
        // Rebuild the minimum extraction shape required by the deterministic
        // scorer from the stored evidence. This is a presentation-layer
        // recompute; it does not re-run AI extraction.
        const mockExtraction = {
          id: candidate.candidateId,
          name: candidate.candidateName,
          totalExperienceYears: candidate.calculatedExperienceYears,
          skills: candidate.matches
            .filter(
              (match) =>
                match.matched && !match.requirementName.includes("years")
            )
            .map((match) => ({
              name: match.requirementName.replace(" (Preferred)", ""),
              level: "Strong" as const,
            })),
          experience: [
            {
              company: "Previous Tech Ltd",
              title: "Software Engineer",
              startDate: "2023-01",
              years: candidate.calculatedExperienceYears,
              description: candidate.matches
                .map((match) => match.evidenceSnippet)
                .join(". "),
              technologies: candidate.matches
                .filter((match) => match.matched)
                .map((match) => match.requirementName),
            },
          ],
          education: [
            {
              institution: "University",
              degree: "BS",
              field: "Computer Science",
            },
          ],
        };

        const freshScore = calculateFinalMatchScore(
          mockExtraction,
          screening.requirements,
          weights
        );

        return {
          ...candidate,
          totalScore: freshScore.totalScore,
          skillScore: freshScore.skillScore,
          experienceScore: freshScore.experienceScore,
          preferredScore: freshScore.preferredScore,
          evidenceScore: freshScore.evidenceScore,
          status: freshScore.status,
          scoringWeights: weights,
        };
      });

      return {
        ...screening,
        candidates: recalculated.sort((a, b) => b.totalScore - a.totalScore),
      };
    });

    commit(next);
  };

  return {
    screenings,
    addScreening,
    updateCandidateDecision,
    recomputeScoresWithWeights,
  };
}
