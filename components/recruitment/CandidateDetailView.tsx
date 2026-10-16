"use client";

import * as React from "react";
import { CandidateScoreResult, DecisionStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { Progress } from "@/components/ui/Input";
import { cn, formatYears } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  FileText,
  PauseCircle,
  Save,
  ThumbsDown,
  XCircle,
} from "lucide-react";

interface CandidateDetailViewProps {
  candidate: CandidateScoreResult;
  jobId: string;
  onDecisionChange?: (
    candidateId: string,
    decision: DecisionStatus,
    notes?: string
  ) => void;
}

function ScoreTile({
  label,
  weightLabel,
  value,
  max,
  tone = "accent",
  footer,
}: {
  label: string;
  weightLabel?: string;
  value: number;
  max: number;
  tone?: "accent" | "success" | "warning";
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-medium uppercase tracking-wide text-nirman-text-muted">
          {label}
        </span>
        {weightLabel && (
          <span className="font-mono text-2xs text-nirman-text-muted">
            {weightLabel}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="tabular-nums text-2xl font-semibold tracking-tight text-nirman-dark">
          {value}
        </span>
        <span className="text-2xs text-nirman-text-muted">/ {max}</span>
      </div>
      <Progress
        value={max ? (value / max) * 100 : 0}
        max={100}
        tone={tone}
        size="sm"
        className="mt-3"
      />
      {footer && (
        <p className="mt-2 text-2xs leading-relaxed text-nirman-text-secondary">
          {footer}
        </p>
      )}
    </Card>
  );
}

export function CandidateDetailView({
  candidate,
  jobId,
  onDecisionChange,
}: CandidateDetailViewProps) {
  const [activeDecision, setActiveDecision] = React.useState<DecisionStatus>(
    candidate.decision
  );
  const [recruiterNotes, setRecruiterNotes] = React.useState<string>("");
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);

  const handleDecision = (decision: DecisionStatus) => {
    setActiveDecision(decision);
    onDecisionChange?.(candidate.candidateId, decision, recruiterNotes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const decisions: Array<{
    value: DecisionStatus;
    label: string;
    icon: typeof Check;
    activeClass: string;
  }> = [
    {
      value: "shortlisted",
      label: "Shortlist",
      icon: Check,
      activeClass: "bg-nirman-success text-white border-nirman-success hover:bg-[#116b4a]",
    },
    {
      value: "held",
      label: "Hold",
      icon: PauseCircle,
      activeClass:
        "bg-nirman-warning text-white border-nirman-warning hover:bg-[#9a641a]",
    },
    {
      value: "not_recommended",
      label: "Not Recommended",
      icon: ThumbsDown,
      activeClass: "bg-nirman-danger text-white border-nirman-danger hover:bg-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Recruitment", href: "/recruitment" },
          { label: "Screening", href: `/recruitment/${jobId}` },
          { label: candidate.candidateName },
        ]}
        title={candidate.candidateName}
        description={`Screening evaluation · Candidate ${candidate.candidateId}`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={candidate.status} />
            <StatusBadge status={candidate.decision} />
            <ButtonLink
              href={`/recruitment/${jobId}`}
              variant="ghost"
              size="sm"
              className="-ml-1.5 h-7 px-2 text-nirman-text-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to shortlist
            </ButtonLink>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {decisions.map((d) => {
              const Icon = d.icon;
              const isActive = activeDecision === d.value;
              return (
                <Button
                  key={d.value}
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDecision(d.value)}
                  aria-pressed={isActive}
                  className={cn(
                    isActive && d.activeClass,
                    isActive && "shadow-subtle"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {d.label}
                </Button>
              );
            })}
          </div>
        }
      />

      {savedSuccess && (
        <Callout tone="success" className="animate-fade-in">
          Decision updated and recorded in the audit log.
        </Callout>
      )}

      {/* Score overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-medium uppercase tracking-wide text-nirman-text-muted">
              Overall Match
            </span>
            <Badge
              variant={candidate.totalScore >= 80 ? "success" : "warning"}
              size="sm"
            >
              Deterministic
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="tabular-nums text-3xl font-bold tracking-tight text-nirman-dark">
              {Math.round(candidate.totalScore)}%
            </span>
            <span className="text-2xs text-nirman-text-muted">/ 100</span>
          </div>
          <Progress
            value={candidate.totalScore}
            max={100}
            size="sm"
            tone="accent"
            className="mt-3"
          />
          <p className="mt-2 text-2xs leading-relaxed text-nirman-text-secondary">
            Composite of 4 weighted components.
          </p>
        </Card>

        <ScoreTile
          label="Required Skills"
          weightLabel="Weight 50%"
          value={candidate.skillScore}
          max={candidate.maxSkillScore}
          tone="accent"
        />

        <ScoreTile
          label="Experience"
          value={candidate.experienceScore}
          max={candidate.maxExperienceScore}
          weightLabel="Weight 25%"
          tone="success"
          footer={
            <>
              Verified{" "}
              <span className="font-semibold text-nirman-dark">
                {formatYears(candidate.calculatedExperienceYears)}
              </span>{" "}
              · Required {candidate.requiredExperienceYears}y+
            </>
          }
        />

        <ScoreTile
          label="Preferred & Evidence"
          weightLabel="Weight 25%"
          value={candidate.preferredScore + candidate.evidenceScore}
          max={candidate.maxPreferredScore + candidate.maxEvidenceScore}
          tone="warning"
          footer={`Preferred ${candidate.preferredScore}p + Resume evidence ${candidate.evidenceScore}p`}
        />
      </div>

      {/* Requirement comparison */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Requirement-by-Requirement Comparison</CardTitle>
            <p className="mt-0.5 text-xs text-nirman-text-secondary">
              Alignment between role prerequisites and verified candidate
              qualifications.
            </p>
          </div>
          <Badge variant="neutral" size="sm" mono>
            {candidate.matches.filter((m) => m.matched).length}/
            {candidate.matches.length} met
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-nirman-border bg-[#FAFAF8] text-nirman-text-secondary">
                  <th scope="col" className="w-1/4 px-4 py-2.5 font-medium">
                    Requirement
                  </th>
                  <th scope="col" className="w-28 px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="w-40 px-4 py-2.5 font-medium">
                    Stated value
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Evidence &amp; source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {candidate.matches.map((item, idx) => (
                  <tr key={idx} className="transition-colors hover:bg-nirman-bg/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-medium text-nirman-dark">
                        {item.matched ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-nirman-success"
                            aria-hidden
                          />
                        ) : (
                          <XCircle
                            className="h-4 w-4 shrink-0 text-nirman-danger"
                            aria-hidden
                          />
                        )}
                        <span>{item.requirementName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.matched ? (
                        <Badge variant="success" size="sm" dot>
                          Satisfied
                        </Badge>
                      ) : (
                        <Badge variant="danger" size="sm" dot>
                          Unmet
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-2xs text-nirman-text-primary">
                      {item.candidateValue || "Not listed"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="rounded-md border border-nirman-borderSubtle bg-nirman-bg/70 p-2.5 text-2xs text-nirman-text-secondary">
                        <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-nirman-text-muted">
                          <FileText className="h-3 w-3" aria-hidden />
                          {item.sourceDocument || "Resume"}
                        </span>
                        {item.evidenceSnippet ? (
                          <p className="italic leading-relaxed text-nirman-dark">
                            “{item.evidenceSnippet}”
                          </p>
                        ) : (
                          <p className="text-nirman-text-muted">
                            No supporting citation available.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Gaps & review */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-nirman-warning" aria-hidden />
              <CardTitle>Identified Requirement Gaps</CardTitle>
            </div>
            <Badge variant="neutral" size="sm" mono>
              {candidate.gaps.length} detected
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidate.gaps.length === 0 ? (
              <Callout tone="success">
                No critical gaps identified for this role specification.
              </Callout>
            ) : (
              candidate.gaps.map((gap, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-lg border border-nirman-border bg-[#FAFAF8] p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-nirman-dark">
                      {gap.skill}
                    </span>
                    <Badge
                      variant={gap.importance === "high" ? "danger" : "warning"}
                      size="sm"
                    >
                      {gap.importance === "high" ? "High priority" : "Secondary"}
                    </Badge>
                  </div>
                  <p className="text-2xs leading-relaxed text-nirman-text-secondary">
                    <strong className="text-nirman-text-primary">
                      Why it matters:
                    </strong>{" "}
                    {gap.whyItMatters}
                  </p>
                  <div className="flex items-start gap-1.5 rounded-md border border-nirman-border bg-white p-2 text-2xs leading-relaxed text-nirman-text-primary">
                    <BookOpen
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nirman-accent"
                      aria-hidden
                    />
                    <span>
                      <strong>Suggested direction:</strong>{" "}
                      {gap.suggestedLearningDirection}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Recruiter Review &amp; Notes</CardTitle>
            <Badge variant="neutral" size="sm">
              Human in the loop
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex-1">
              <label
                htmlFor="recruiter-notes"
                className="mb-1.5 block text-xs font-medium text-nirman-text-primary"
              >
                Evaluation notes for the hiring committee
              </label>
              <textarea
                id="recruiter-notes"
                rows={6}
                value={recruiterNotes}
                onChange={(e) => setRecruiterNotes(e.target.value)}
                placeholder="e.g. Strong in PostgreSQL & Python, but 2.4y experience requires a probe on independent system design in the tech screen."
                className="w-full rounded-md border border-nirman-border bg-white p-3 text-xs leading-relaxed text-nirman-dark placeholder:text-nirman-text-muted focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/25"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-nirman-border pt-4">
              <span className="text-2xs text-nirman-text-secondary">
                Current state:{" "}
                <strong className="capitalize text-nirman-dark">
                  {activeDecision.replace("_", " ")}
                </strong>
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleDecision(activeDecision)}
              >
                <Save className="h-3.5 w-3.5" />
                Save Review Notes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
