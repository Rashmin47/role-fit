"use client";

import { useState, useEffect } from "react";
import {
  JobScreening,
  CandidateScoreResult,
  DecisionStatus,
  ScoringWeights,
} from "@/types";
import { SAMPLE_SCREENINGS, SAMPLE_JOB_REQUIREMENTS } from "../data/sample-data";
import { calculateFinalMatchScore, DEFAULT_SCORING_WEIGHTS } from "../scoring";

const STORAGE_KEY = "nirman_screenings_state_v1";

export function getInitialScreenings(): JobScreening[] {
  if (typeof window === "undefined") {
    return SAMPLE_SCREENINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Failed to read from localStorage", e);
  }
  return SAMPLE_SCREENINGS;
}

export function saveScreenings(screenings: JobScreening[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(screenings));
    } catch (e) {
      console.error("Failed to save screenings", e);
    }
  }
}

export function useScreeningStore() {
  const [screenings, setScreenings] = useState<JobScreening[]>(getInitialScreenings);

  useEffect(() => {
    // Initial sync
    const initial = getInitialScreenings();
    setScreenings(initial);
  }, []);

  const updateCandidateDecision = (
    jobId: string,
    candidateId: string,
    decision: DecisionStatus,
    notes?: string
  ) => {
    setScreenings((prev) => {
      const next = prev.map((s) => {
        if (s.id !== jobId) return s;
        const updatedCandidates = s.candidates.map((c) => {
          if (c.candidateId !== candidateId) return c;
          return { ...c, decision };
        });
        const reviewedCount = updatedCandidates.filter((c) => c.decision !== "pending").length;
        const shortlistedCount = updatedCandidates.filter((c) => c.decision === "shortlisted").length;
        return {
          ...s,
          candidates: updatedCandidates,
          reviewedCount,
          shortlistedCount,
        };
      });
      saveScreenings(next);
      return next;
    });
  };

  const addScreening = (newScreening: JobScreening) => {
    setScreenings((prev) => {
      const next = [newScreening, ...prev];
      saveScreenings(next);
      return next;
    });
  };

  const recomputeScoresWithWeights = (jobId: string, weights: ScoringWeights) => {
    setScreenings((prev) => {
      const next = prev.map((s) => {
        if (s.id !== jobId) return s;
        const recalculated = s.candidates.map((c) => {
          // Simulated extraction representation
          const mockExtraction = {
            id: c.candidateId,
            name: c.candidateName,
            totalExperienceYears: c.calculatedExperienceYears,
            skills: c.matches
              .filter((m) => m.matched && !m.requirementName.includes("years"))
              .map((m) => ({ name: m.requirementName.replace(" (Preferred)", ""), level: "Strong" as const })),
            experience: [
              {
                company: "Previous Tech Ltd",
                title: "Software Engineer",
                startDate: "2023-01",
                years: c.calculatedExperienceYears,
                description: c.matches.map((m) => m.evidenceSnippet).join(". "),
                technologies: c.matches.filter((m) => m.matched).map((m) => m.requirementName),
              },
            ],
            education: [{ institution: "University", degree: "BS", field: "Computer Science" }],
          };
          const freshScore = calculateFinalMatchScore(mockExtraction, s.requirements, weights);
          return {
            ...c,
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
          ...s,
          candidates: recalculated.sort((a, b) => b.totalScore - a.totalScore),
        };
      });
      saveScreenings(next);
      return next;
    });
  };

  return {
    screenings,
    addScreening,
    updateCandidateDecision,
    recomputeScoresWithWeights,
  };
}
