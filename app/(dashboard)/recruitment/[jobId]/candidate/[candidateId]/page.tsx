"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { CandidateDetailView } from "@/components/recruitment/CandidateDetailView";
import { useScreeningStore } from "@/lib/store/screening-store";

export default function CandidateDetailPage({
  params,
}: {
  params: { jobId: string; candidateId: string };
}) {
  const { screenings, updateCandidateDecision } = useScreeningStore();

  const screening = screenings.find((s) => s.id === params.jobId) || screenings[0];
  const candidate = screening?.candidates.find((c) => c.candidateId === params.candidateId) || screening?.candidates[0];

  if (!screening || !candidate) {
    return notFound();
  }

  return (
    <CandidateDetailView
      candidate={candidate}
      jobId={screening.id}
      onDecisionChange={(candidateId, decision, notes) =>
        updateCandidateDecision(screening.id, candidateId, decision, notes)
      }
    />
  );
}
