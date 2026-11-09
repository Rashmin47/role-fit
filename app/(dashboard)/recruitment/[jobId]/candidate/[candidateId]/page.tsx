"use client";

import * as React from "react";
import { CandidateDetailView } from "@/components/recruitment/CandidateDetailView";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { useScreeningStore } from "@/lib/store/screening-store";

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const { jobId, candidateId } = React.use(params);
  const { screenings, isLoading, error, updateCandidateDecision } =
    useScreeningStore();

  const screening = screenings.find((s) => s.id === jobId);
  const candidate = screening?.candidates.find(
    (c) => c.candidateId === candidateId
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading candidate" description="Loading persisted candidate evidence…" />
      </div>
    );
  }

  if (!screening || !candidate) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Candidate not found"
          description="This candidate is not part of the selected screening in the current workspace."
        />
        <EmptyState
          title="No matching candidate"
          description="Return to the screening shortlist to select a candidate."
          action={
            <ButtonLink href={`/recruitment/${jobId}`} size="sm">
              Back to screening
            </ButtonLink>
          }
          className="py-16"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Callout tone="danger" title="The last action could not be saved">
          {error}
        </Callout>
      )}
      <CandidateDetailView
        candidate={candidate}
        jobId={screening.id}
        onDecisionChange={(candidateId, decision, notes) =>
          updateCandidateDecision(screening.id, candidateId, decision, notes)
        }
      />
    </div>
  );
}
