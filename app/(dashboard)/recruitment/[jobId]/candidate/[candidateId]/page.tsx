"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { CandidateDetailView } from "@/components/recruitment/CandidateDetailView";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScreeningStore } from "@/lib/store/screening-store";

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const { jobId, candidateId } = React.use(params);
  const { screenings, updateCandidateDecision } = useScreeningStore();

  const screening = screenings.find((s) => s.id === jobId);
  const candidate = screening?.candidates.find(
    (c) => c.candidateId === candidateId
  );

  if (!screening || !candidate) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Candidate"
          title="Candidate not found"
          description="This candidate is not part of the selected screening in the current workspace."
        />
        <EmptyState
          icon={Users}
          title="No matching candidate"
          description="Return to the screening shortlist to select a candidate."
          action={
            <ButtonLink href={`/recruitment/${jobId}`} size="sm">
              Back to Screening
            </ButtonLink>
          }
          className="py-16"
        />
      </div>
    );
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
