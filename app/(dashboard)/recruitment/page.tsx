"use client";

import * as React from "react";
import { ChevronRight, Briefcase, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Input";
import { useScreeningStore } from "@/lib/store/screening-store";

export default function RecruitmentWorkspacePage() {
  const { screenings } = useScreeningStore();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Recruitment Intelligence"
        description="Structured screening workflows, deterministic candidate scoring, and explainable shortlists."
        actions={
          <ButtonLink href="/recruitment/new" size="sm">
            <Plus className="h-4 w-4" />
            New Screening
          </ButtonLink>
        }
      />

      {screenings.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No screenings yet"
          description="Create your first screening to extract requirements and score candidates against them."
          action={
            <ButtonLink href="/recruitment/new" size="sm">
              <Plus className="h-4 w-4" />
              New Screening
            </ButtonLink>
          }
          className="py-16"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {screenings.map((screening) => {
            const pendingCount = screening.candidates.filter(
              (c) => c.decision === "pending"
            ).length;
            const reviewPct = Math.round(
              (screening.reviewedCount / (screening.candidateCount || 1)) * 100
            );

            return (
              <Card key={screening.id} className="flex flex-col">
                <CardHeader className="items-start">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-nirman-accent-light text-nirman-accent">
                      <Briefcase className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{screening.title}</CardTitle>
                      <span className="mt-0.5 block truncate text-2xs text-nirman-text-muted">
                        {screening.department} · {screening.location}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success" size="sm" dot>
                    Active
                  </Badge>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {screening.requirements.requiredSkills.slice(0, 5).map((req, i) => (
                      <span
                        key={i}
                        className="rounded border border-nirman-border bg-nirman-bg px-2 py-0.5 text-2xs text-nirman-text-secondary"
                      >
                        {req.name}
                      </span>
                    ))}
                    <span className="rounded border border-nirman-border bg-nirman-bg px-2 py-0.5 text-2xs text-nirman-text-secondary">
                      {screening.requirements.minimumExperienceYears}y+ exp
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-nirman-border bg-[#FAFAF8] p-3 text-center">
                    <div>
                      <span className="tabular-nums block text-sm font-semibold text-nirman-dark">
                        {screening.candidateCount}
                      </span>
                      <span className="text-[10px] text-nirman-text-muted">
                        Processed
                      </span>
                    </div>
                    <div>
                      <span className="tabular-nums block text-sm font-semibold text-nirman-success-text">
                        {screening.shortlistedCount}
                      </span>
                      <span className="text-[10px] text-nirman-text-muted">
                        Shortlisted
                      </span>
                    </div>
                    <div>
                      <span className="tabular-nums block text-sm font-semibold text-nirman-warning-text">
                        {pendingCount}
                      </span>
                      <span className="text-[10px] text-nirman-text-muted">
                        To Review
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-2xs text-nirman-text-secondary">
                      <span>Review progress</span>
                      <span className="tabular-nums font-medium text-nirman-dark">
                        {reviewPct}%
                      </span>
                    </div>
                    <Progress value={reviewPct} max={100} size="sm" />
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-nirman-border pt-4">
                    <span className="truncate font-mono text-2xs text-nirman-text-muted">
                      {screening.id}
                    </span>
                    <ButtonLink
                      href={`/recruitment/${screening.id}`}
                      variant="secondary"
                      size="sm"
                    >
                      Open Dashboard
                      <ChevronRight className="h-3.5 w-3.5" />
                    </ButtonLink>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
