"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { Progress } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useScreeningStore } from "@/lib/store/screening-store";
import { formatYears } from "@/lib/utils";

const subscribeToClock = () => () => {};

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? "Good morning"
    : hour < 18
    ? "Good afternoon"
    : "Good evening";
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="px-5 py-4">
      <span className="block text-[13px] font-medium text-nirman-text-secondary">
        {label}
      </span>
      <span className="mt-1.5 block tabular-nums text-2xl font-semibold text-nirman-dark">
        {value}
      </span>
      <span className="mt-1 block text-xs text-nirman-text-muted">{hint}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { screenings } = useScreeningStore();
  // Server snapshot stays generic so hydration is deterministic; the client
  // snapshot upgrades to a time-aware greeting after hydration.
  const greeting = React.useSyncExternalStore(
    subscribeToClock,
    getGreeting,
    () => "Welcome back"
  );

  const totalCandidates = screenings.reduce((acc, s) => acc + s.candidateCount, 0);
  const pendingReviewCandidates = screenings
    .flatMap((s) => s.candidates.map((c) => ({ candidate: c, jobId: s.id })))
    .filter(({ candidate }) => candidate.decision === "pending");
  const shortlisted = screenings.reduce((acc, s) => acc + s.shortlistedCount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greeting}, Rashmin`}
        description="Your screenings, review queue, and shortlist progress."
        actions={
          <ButtonLink href="/recruitment/new" size="sm">
            <Plus className="h-4 w-4" />
            New screening
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 divide-y divide-nirman-border overflow-hidden rounded-lg border border-nirman-border bg-white sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <Metric
          label="Active screenings"
          value={screenings.length}
          hint="Currently in review"
        />
        <Metric
          label="Candidates"
          value={totalCandidates}
          hint="Evaluated by the engine"
        />
        <Metric
          label="Awaiting review"
          value={pendingReviewCandidates.length}
          hint="Human decision pending"
        />
        <Metric label="Shortlisted" value={shortlisted} hint="Marked by a reviewer" />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active screenings</CardTitle>
            <Link
              href="/recruitment"
              className="inline-flex items-center gap-0.5 text-[13px] font-medium text-nirman-accent transition-colors hover:text-nirman-accent-hover"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {screenings.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No active screenings"
                  description="Create a screening to extract requirements and evaluate candidates."
                  action={
                    <ButtonLink href="/recruitment/new" size="sm">
                      <Plus className="h-4 w-4" /> New screening
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-nirman-border">
                {screenings.map((screening) => {
                  const pending = screening.candidates.filter(
                    (c) => c.decision === "pending"
                  ).length;
                  const reviewPct = Math.round(
                    (screening.reviewedCount / (screening.candidateCount || 1)) * 100
                  );
                  return (
                    <li key={screening.id}>
                      <Link
                        href={`/recruitment/${screening.id}`}
                        className="block px-5 py-4 transition-colors hover:bg-nirman-inset"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm font-medium text-nirman-dark">
                                {screening.title}
                              </span>
                              {screening.isSample && (
                                <Badge variant="neutral">Sample</Badge>
                              )}
                            </span>
                            <p className="mt-1 text-[13px] text-nirman-text-secondary">
                              {screening.department} · {screening.location}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="tabular-nums text-[13px] font-medium text-nirman-dark">
                              {reviewPct}%
                            </span>
                            <span className="block text-xs text-nirman-text-muted">
                              reviewed
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <Progress
                            value={reviewPct}
                            max={100}
                            size="sm"
                            tone="neutral"
                            className="max-w-[220px]"
                          />
                          <span className="hidden shrink-0 text-xs text-nirman-text-muted sm:block">
                            {screening.candidateCount} candidates · {screening.shortlistedCount}{" "}
                            shortlisted · {pending} pending
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Awaiting review</CardTitle>
            <span className="tabular-nums text-[13px] text-nirman-text-muted">
              {pendingReviewCandidates.length}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {pendingReviewCandidates.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Everything is reviewed"
                  description="No candidates are waiting on a human decision."
                />
              </div>
            ) : (
              <>
                <ul className="divide-y divide-nirman-border">
                  {pendingReviewCandidates.slice(0, 5).map(({ candidate, jobId }) => (
                    <li
                      key={`${jobId}-${candidate.candidateId}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={candidate.candidateName} size="sm" />
                        <div className="min-w-0">
                          <span className="block truncate text-[13px] font-medium text-nirman-dark">
                            {candidate.candidateName}
                          </span>
                          <p className="mt-0.5 text-xs text-nirman-text-muted">
                            {formatYears(candidate.calculatedExperienceYears)} ·{" "}
                            {candidate.gaps.length}{" "}
                            {candidate.gaps.length === 1 ? "gap" : "gaps"}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/[0.04]"
                        aria-label={`Review ${candidate.candidateName}`}
                      >
                        <ScoreMeter score={candidate.totalScore} />
                      </Link>
                    </li>
                  ))}
                </ul>
                {pendingReviewCandidates.length > 5 && (
                  <div className="border-t border-nirman-border px-5 py-2.5">
                    <Link
                      href="/candidates"
                      className="text-xs font-medium text-nirman-accent transition-colors hover:text-nirman-accent-hover"
                    >
                      View all {pendingReviewCandidates.length} candidates
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
