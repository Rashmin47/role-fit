"use client";

import * as React from "react";
import { CandidateScoreResult, DecisionStatus } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { Progress } from "@/components/ui/Input";
import { cn, formatYears } from "@/lib/utils";
import { ArrowLeft, Check, PauseCircle, ThumbsDown } from "lucide-react";

interface CandidateDetailViewProps {
  candidate: CandidateScoreResult;
  jobId: string;
  onDecisionChange?: (
    candidateId: string,
    decision: DecisionStatus,
    notes?: string
  ) => void;
}

export function CandidateDetailView({
  candidate,
  jobId,
  onDecisionChange,
}: CandidateDetailViewProps) {
  const [activeDecision, setActiveDecision] = React.useState<DecisionStatus>(
    candidate.decision
  );
  const [recruiterNotes, setRecruiterNotes] = React.useState<string>(
    candidate.reviewNotes ?? ""
  );
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
      activeClass:
        "bg-nirman-success text-white border-nirman-success hover:bg-[#186340]",
    },
    {
      value: "held",
      label: "Hold",
      icon: PauseCircle,
      activeClass:
        "bg-nirman-warning text-white border-nirman-warning hover:bg-[#855900]",
    },
    {
      value: "not_recommended",
      label: "Not recommended",
      icon: ThumbsDown,
      activeClass:
        "bg-nirman-danger text-white border-nirman-danger hover:bg-[#9f1f16]",
    },
  ];

  const breakdown = [
    {
      label: "Required skills",
      value: candidate.skillScore,
      max: candidate.maxSkillScore,
    },
    {
      label: "Experience",
      value: candidate.experienceScore,
      max: candidate.maxExperienceScore,
    },
    {
      label: "Preferred skills",
      value: candidate.preferredScore,
      max: candidate.maxPreferredScore,
    },
    {
      label: "Evidence quality",
      value: candidate.evidenceScore,
      max: candidate.maxEvidenceScore,
    },
  ];

  const matchedCount = candidate.matches.filter((m) => m.matched).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={candidate.candidateName}
        description={`${formatYears(candidate.calculatedExperienceYears)} experience · ${matchedCount} of ${
          candidate.matches.length
        } requirements met`}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={candidate.status} />
            <StatusBadge status={candidate.decision} />
            <ButtonLink
              href={`/recruitment/${jobId}`}
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 px-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to shortlist
            </ButtonLink>
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
                  className={cn(isActive && d.activeClass)}
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
          Decision and notes saved.
        </Callout>
      )}

      {/* Score overview */}
      <Card>
        <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-8">
          <div>
            <span className="block text-[13px] font-medium text-nirman-text-secondary">
              Match score
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="tabular-nums text-[40px] font-semibold leading-none text-nirman-dark">
                {Math.round(candidate.totalScore)}
              </span>
              <span className="text-sm text-nirman-text-muted">/ 100</span>
            </div>
            <Progress
              value={candidate.totalScore}
              max={100}
              size="sm"
              tone="accent"
              className="mt-4 max-w-[160px]"
            />
            <p className="mt-3 text-xs leading-relaxed text-nirman-text-muted">
              Weighted across four components. Computed deterministically.
            </p>
          </div>

          <div className="space-y-3 sm:border-l sm:border-nirman-border sm:pl-8">
            {breakdown.map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="w-32 shrink-0 text-[13px] text-nirman-text-secondary">
                  {item.label}
                </span>
                <Progress
                  value={item.max ? (item.value / item.max) * 100 : 0}
                  max={100}
                  size="sm"
                  tone="accent"
                  className="flex-1"
                />
                <span className="w-14 shrink-0 text-right tabular-nums text-[13px] text-nirman-text-primary">
                  {item.value} / {item.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Requirement comparison */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Requirements</CardTitle>
            <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
              Each row cites the candidate evidence behind the result.
            </p>
          </div>
          <span className="tabular-nums text-[13px] text-nirman-text-muted">
            {matchedCount} / {candidate.matches.length} met
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-nirman-border bg-nirman-inset text-nirman-text-secondary">
                  <th scope="col" className="w-1/4 px-5 py-2.5 font-medium">
                    Requirement
                  </th>
                  <th scope="col" className="w-24 px-5 py-2.5 font-medium">
                    Result
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Evidence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {candidate.matches.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-nirman-dark">
                        {item.requirementName}
                      </span>
                      {item.candidateValue && (
                        <span className="mt-0.5 block text-xs text-nirman-text-muted">
                          Stated: {item.candidateValue}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          item.matched
                            ? "text-nirman-success-text"
                            : "text-nirman-danger-text"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            item.matched
                              ? "bg-nirman-success"
                              : "bg-nirman-danger"
                          )}
                          aria-hidden
                        />
                        {item.matched ? "Met" : "Not found"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {item.evidenceSnippet ? (
                        <p className="leading-relaxed text-nirman-text-secondary">
                          “{item.evidenceSnippet}”
                          <span className="ml-1.5 text-xs text-nirman-text-muted">
                            {item.sourceDocument || "Resume"}
                          </span>
                        </p>
                      ) : (
                        <p className="text-nirman-text-muted">
                          No supporting citation available.
                        </p>
                      )}
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
            <CardTitle>Gaps</CardTitle>
            <span className="tabular-nums text-[13px] text-nirman-text-muted">
              {candidate.gaps.length} identified
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {candidate.gaps.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-nirman-text-secondary">
                No requirement gaps identified for this role.
              </p>
            ) : (
              <ul className="divide-y divide-nirman-border">
                {candidate.gaps.map((gap, i) => (
                  <li key={i} className="space-y-1.5 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13px] font-medium text-nirman-dark">
                        {gap.skill}
                      </span>
                      <span
                        className={cn(
                          "text-xs",
                          gap.importance === "high"
                            ? "text-nirman-danger-text"
                            : "text-nirman-text-muted"
                        )}
                      >
                        {gap.importance === "high" ? "High priority" : "Secondary"}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-nirman-text-secondary">
                      {gap.whyItMatters}
                    </p>
                    <p className="text-xs leading-relaxed text-nirman-text-muted">
                      Next step: {gap.suggestedLearningDirection}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Review notes</CardTitle>
            <span className="text-xs text-nirman-text-muted">Saved with your decision</span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex-1">
              <label
                htmlFor="recruiter-notes"
                className="mb-1.5 block text-[13px] font-medium text-nirman-text-primary"
              >
                Notes for the hiring team
              </label>
              <textarea
                id="recruiter-notes"
                rows={6}
                value={recruiterNotes}
                onChange={(e) => setRecruiterNotes(e.target.value)}
                placeholder="Record what you verified, what to probe in an interview, and why you reached this decision."
                className="w-full rounded-md border border-nirman-border bg-white p-3 text-[13px] leading-relaxed text-nirman-dark placeholder:text-nirman-text-muted focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
              />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-nirman-border pt-4">
              <span className="text-xs text-nirman-text-muted">
                Current decision:{" "}
                <span className="capitalize text-nirman-text-secondary">
                  {activeDecision.replace("_", " ")}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDecision(activeDecision)}
              >
                Save notes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
