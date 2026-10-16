"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Clock,
  Compass,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { Progress } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { useScreeningStore } from "@/lib/store/screening-store";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import { formatYears } from "@/lib/utils";

export default function DashboardPage() {
  const { screenings } = useScreeningStore();
  const [greeting, setGreeting] = React.useState("Welcome back");

  React.useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
    );
  }, []);

  const totalCandidates = screenings.reduce((acc, s) => acc + s.candidateCount, 0);
  const pendingReviewCandidates = screenings
    .flatMap((s) => s.candidates.map((c) => ({ candidate: c, jobId: s.id })))
    .filter(({ candidate }) => candidate.decision === "pending");
  const shortlisted = screenings.reduce((acc, s) => acc + s.shortlistedCount, 0);

  const primaryRole = SAMPLE_CAREER_ROLES["python-backend-developer"];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting}, Rashmin`}
        description="A live view of your role-fit pipelines, candidate evidence, and market requirements."
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-nirman-text-secondary">
            <span>
              <strong className="font-semibold text-nirman-dark">
                {screenings.length}
              </strong>{" "}
              active screenings
            </span>
            <span className="h-3 w-px bg-nirman-border" />
            <span>
              <strong className="font-semibold text-nirman-dark">
                {totalCandidates}
              </strong>{" "}
              candidates evaluated
            </span>
            <span className="h-3 w-px bg-nirman-border" />
            <span>
              <strong className="font-semibold text-nirman-dark">
                {pendingReviewCandidates.length}
              </strong>{" "}
              requiring review
            </span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/career-intelligence" variant="secondary" size="sm">
              <Compass className="h-4 w-4" />
              Role Intelligence
            </ButtonLink>
            <ButtonLink href="/recruitment/new" variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              New Screening
            </ButtonLink>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Screenings"
          value={screenings.length}
          hint="Pipelines currently in review"
          icon={Briefcase}
          tone="accent"
        />
        <StatCard
          label="Candidates Evaluated"
          value={totalCandidates}
          hint="Scored by the deterministic engine"
          icon={Users}
        />
        <StatCard
          label="Awaiting Review"
          value={pendingReviewCandidates.length}
          hint="Human decision pending"
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="Shortlisted"
          value={shortlisted}
          hint="Recruiter final call"
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active Recruitment Screenings</CardTitle>
                <p className="mt-0.5 text-xs text-nirman-text-secondary">
                  Live pipelines and human review completion status.
                </p>
              </div>
              <Link
                href="/recruitment"
                className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-nirman-accent transition-colors hover:text-nirman-accent-hover"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {screenings.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No active screenings"
                  description="Create a screening to extract requirements and evaluate candidates."
                  action={
                    <ButtonLink href="/recruitment/new" size="sm">
                      <Plus className="h-4 w-4" /> New Screening
                    </ButtonLink>
                  }
                />
              ) : (
                screenings.map((screening) => {
                  const reviewPct = Math.round(
                    (screening.reviewedCount / (screening.candidateCount || 1)) * 100
                  );
                  return (
                    <Link
                      key={screening.id}
                      href={`/recruitment/${screening.id}`}
                      className="block rounded-lg border border-nirman-border bg-[#FAFAF8] p-3.5 transition-all hover:border-nirman-accent/40 hover:bg-white hover:shadow-subtle"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-semibold text-nirman-dark">
                              {screening.title}
                            </h4>
                            <Badge variant="neutral" size="sm">
                              {screening.department}
                            </Badge>
                          </div>
                          <p className="mt-1 text-2xs text-nirman-text-secondary">
                            {screening.candidateCount} processed ·{" "}
                            {screening.shortlistedCount} shortlisted ·{" "}
                            {screening.candidates.filter((c) => c.decision === "pending").length}{" "}
                            pending review
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="tabular-nums text-xs font-semibold text-nirman-dark">
                            {reviewPct}%
                          </span>
                          <span className="block text-[10px] text-nirman-text-muted">
                            reviewed
                          </span>
                        </div>
                      </div>
                      <Progress value={reviewPct} max={100} size="sm" className="mt-2.5" />
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Candidate Review Queue</CardTitle>
                <p className="mt-0.5 text-xs text-nirman-text-secondary">
                  Candidates matched and waiting for human evaluation.
                </p>
              </div>
              <Badge variant="neutral" size="sm" mono>
                {pendingReviewCandidates.length} awaiting
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {pendingReviewCandidates.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={ShieldCheck}
                    title="Everything is reviewed"
                    description="No candidates are currently waiting on a human decision."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-nirman-border">
                  {pendingReviewCandidates.slice(0, 5).map(({ candidate, jobId }) => (
                    <li
                      key={`${jobId}-${candidate.candidateId}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-nirman-bg/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={candidate.candidateName} size="sm" />
                        <div className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-nirman-dark">
                            {candidate.candidateName}
                          </span>
                          <p className="mt-0.5 text-2xs text-nirman-text-secondary">
                            {formatYears(candidate.calculatedExperienceYears)} exp ·{" "}
                            {candidate.gaps.length}{" "}
                            {candidate.gaps.length === 1 ? "gap" : "gaps"} detected
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <ScoreMeter score={candidate.totalScore} size="sm" />
                        <ButtonLink
                          variant="secondary"
                          size="sm"
                          href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        >
                          Review
                        </ButtonLink>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Market Requirement Insight</CardTitle>
                <p className="mt-0.5 text-xs text-nirman-text-secondary">
                  {primaryRole.roleTitle}
                </p>
              </div>
              <Badge variant="accent" size="sm">
                Sample
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-nirman-border bg-[#FAFAF8] p-3 text-xs">
                <div className="text-nirman-text-secondary">
                  Requirements analyzed:{" "}
                  <strong className="font-semibold text-nirman-dark">
                    {primaryRole.totalPostingsAnalyzed}
                  </strong>
                </div>
                <div className="mt-1 text-nirman-text-primary">
                  Top skills:{" "}
                  <span className="font-semibold">
                    {primaryRole.skillPriorities.high.join(" · ")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Observed skill frequency
                </span>
                {primaryRole.requirements.slice(0, 5).map((req) => (
                  <div key={req.skill} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-nirman-text-primary">
                        {req.skill}
                      </span>
                      <span className="tabular-nums font-mono text-xs font-semibold text-nirman-dark">
                        {req.frequency}%
                      </span>
                    </div>
                    <Progress value={req.frequency} max={100} size="sm" tone="accent" />
                  </div>
                ))}
              </div>

              <ButtonLink
                href={`/career-intelligence/${primaryRole.roleId}`}
                variant="outline"
                size="sm"
                className="w-full"
              >
                View Full Role Intelligence
                <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </CardContent>
          </Card>

          <Card variant="muted">
            <CardContent className="space-y-2 p-4 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-nirman-dark">
                <ShieldCheck className="h-4 w-4 text-nirman-success" />
                Decision Standard
              </div>
              <p className="leading-relaxed text-nirman-text-secondary">
                Role Fit extracts structured requirements and computes mathematical
                scores. The recruiter always performs the final review and hiring
                decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
