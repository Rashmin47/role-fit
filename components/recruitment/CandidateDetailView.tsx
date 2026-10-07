"use client";

import * as React from "react";
import Link from "next/link";
import {
  CandidateScoreResult,
  DecisionStatus,
} from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { formatYears } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Sliders,
  Check,
  PauseCircle,
  ThumbsDown,
  Info,
  Calendar,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";

interface CandidateDetailViewProps {
  candidate: CandidateScoreResult;
  jobId: string;
  onDecisionChange?: (candidateId: string, decision: DecisionStatus, notes?: string) => void;
}

export function CandidateDetailView({
  candidate,
  jobId,
  onDecisionChange,
}: CandidateDetailViewProps) {
  const [activeDecision, setActiveDecision] = React.useState<DecisionStatus>(candidate.decision);
  const [recruiterNotes, setRecruiterNotes] = React.useState<string>("");
  const [savedSuccess, setSavedSuccess] = React.useState<boolean>(false);

  const handleDecision = (decision: DecisionStatus) => {
    setActiveDecision(decision);
    onDecisionChange?.(candidate.candidateId, decision, recruiterNotes);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/recruitment/${jobId}`}
            className="p-1.5 text-nirman-text-secondary hover:text-nirman-dark rounded border border-nirman-border bg-white hover:bg-nirman-bg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-nirman-dark tracking-tight">
                {candidate.candidateName}
              </h1>
              <span className="text-xs font-mono text-nirman-text-muted bg-nirman-bg px-2 py-0.5 rounded border border-nirman-border">
                {candidate.candidateId}
              </span>
              <StatusBadge status={candidate.status} />
            </div>
            <p className="text-xs text-nirman-text-secondary mt-0.5">
              Screening evaluation for Job: <span className="font-medium text-nirman-dark">Python Backend Developer</span>
            </p>
          </div>
        </div>

        {/* Recruiter Final Decision Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeDecision === "shortlisted" ? "primary" : "secondary"}
            onClick={() => handleDecision("shortlisted")}
            className={activeDecision === "shortlisted" ? "bg-nirman-success hover:bg-green-700" : ""}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            <span>Shortlist</span>
          </Button>
          <Button
            size="sm"
            variant={activeDecision === "held" ? "primary" : "secondary"}
            onClick={() => handleDecision("held")}
          >
            <PauseCircle className="h-3.5 w-3.5 mr-1" />
            <span>Put on Hold</span>
          </Button>
          <Button
            size="sm"
            variant={activeDecision === "not_recommended" ? "danger" : "secondary"}
            onClick={() => handleDecision("not_recommended")}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
            <span>Not Recommended</span>
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-nirman-success-bg border border-nirman-success-border rounded-md text-xs text-nirman-success-text flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-nirman-success" />
          <span>Decision updated successfully and recorded in audit log.</span>
        </div>
      )}

      {/* Main Score & Architecture Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Calculated Score */}
        <Card className="bg-white border-nirman-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nirman-text-secondary">Overall Match</span>
            <Badge variant={candidate.totalScore >= 80 ? "success" : "warning"}>
              Deterministic
            </Badge>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-nirman-dark tracking-tight">
              {Math.round(candidate.totalScore)}%
            </span>
            <span className="text-xs text-nirman-text-muted">/ 100 points</span>
          </div>
          <p className="mt-2 text-[11px] text-nirman-text-secondary leading-relaxed">
            Composite score derived from 4 mathematical weight components.
          </p>
        </Card>

        {/* Required Skills Score */}
        <Card className="bg-white border-nirman-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nirman-text-secondary">Required Skills</span>
            <span className="text-xs font-mono text-nirman-text-muted">Weight: 50%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-nirman-dark">
              {candidate.skillScore}
            </span>
            <span className="text-xs text-nirman-text-muted">/ {candidate.maxSkillScore} pts</span>
          </div>
          <div className="mt-2.5 w-full bg-nirman-border h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-nirman-accent h-full"
              style={{ width: `${(candidate.skillScore / candidate.maxSkillScore) * 100}%` }}
            />
          </div>
        </Card>

        {/* Experience Score */}
        <Card className="bg-white border-nirman-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nirman-text-secondary">Experience</span>
            <span className="text-xs font-mono text-nirman-text-muted">Weight: 25%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-nirman-dark">
              {candidate.experienceScore}
            </span>
            <span className="text-xs text-nirman-text-muted">/ {candidate.maxExperienceScore} pts</span>
          </div>
          <p className="mt-2 text-[11px] text-nirman-text-secondary">
            Verified: <span className="font-semibold text-nirman-dark">{formatYears(candidate.calculatedExperienceYears)}</span> (Req: {candidate.requiredExperienceYears}y+)
          </p>
        </Card>

        {/* Preferred & Evidence Score */}
        <Card className="bg-white border-nirman-border p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-nirman-text-secondary">Preferred & Evidence</span>
            <span className="text-xs font-mono text-nirman-text-muted">Weight: 25%</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-nirman-dark">
              {candidate.preferredScore + candidate.evidenceScore}
            </span>
            <span className="text-xs text-nirman-text-muted">
              / {candidate.maxPreferredScore + candidate.maxEvidenceScore} pts
            </span>
          </div>
          <p className="mt-2 text-[11px] text-nirman-text-secondary">
            Preferred ({candidate.preferredScore}p) + Resume Evidence ({candidate.evidenceScore}p)
          </p>
        </Card>
      </div>

      {/* Requirement by Requirement Comparison Matrix */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Requirement-by-Requirement Comparison</CardTitle>
            <p className="text-xs text-nirman-text-secondary mt-0.5">
              Exact alignment between role prerequisites and verified candidate qualifications.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-nirman-border bg-[#FAFAF8] text-nirman-text-secondary font-medium">
                  <th className="py-2.5 px-4 w-1/4">Requirement</th>
                  <th className="py-2.5 px-4 w-28">Match Status</th>
                  <th className="py-2.5 px-4 w-40">Candidate Stated Value</th>
                  <th className="py-2.5 px-4">Evidence Citation & Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {candidate.matches.map((item, idx) => (
                  <tr key={idx} className="hover:bg-nirman-bg/40 transition-colors">
                    <td className="py-3 px-4 font-medium text-nirman-dark">
                      <div className="flex items-center gap-2">
                        {item.matched ? (
                          <CheckCircle2 className="h-4 w-4 text-nirman-success shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-nirman-danger shrink-0" />
                        )}
                        <span>{item.requirementName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.matched ? (
                        <span className="text-nirman-success font-medium inline-flex items-center gap-1">
                          Satisfied ✓
                        </span>
                      ) : (
                        <span className="text-nirman-danger font-medium inline-flex items-center gap-1">
                          Unmet ✕
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-nirman-text-primary font-mono text-[11px]">
                      {item.candidateValue || "Not listed"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="p-2 rounded bg-nirman-bg/70 border border-nirman-borderSubtle text-[11px] text-nirman-text-secondary">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-nirman-text-primary text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <FileText className="h-3 w-3 text-nirman-text-muted" />
                            Source: {item.sourceDocument || "Resume"}
                          </span>
                        </div>
                        <p className="italic text-nirman-dark leading-relaxed">
                          "{item.evidenceSnippet}"
                        </p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Identified Skill Gaps & Human Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identified Gaps */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-nirman-warning" />
              <CardTitle>Identified Requirement Gaps</CardTitle>
            </div>
            <span className="text-xs text-nirman-text-muted font-mono">
              {candidate.gaps.length} detected
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidate.gaps.length === 0 ? (
              <div className="p-4 rounded-md bg-nirman-success-bg border border-nirman-success-border text-xs text-nirman-success-text">
                No critical gaps identified for this role specification.
              </div>
            ) : (
              candidate.gaps.map((gap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-md border border-nirman-border bg-[#FAFAF8] space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-nirman-dark">
                      {gap.skill}
                    </span>
                    <Badge variant={gap.importance === "high" ? "danger" : "warning"} size="sm">
                      {gap.importance === "high" ? "High Priority Gap" : "Secondary Gap"}
                    </Badge>
                  </div>
                  <p className="text-xs text-nirman-text-secondary leading-relaxed">
                    <strong className="text-nirman-text-primary">Why it matters:</strong> {gap.whyItMatters}
                  </p>
                  <p className="text-xs text-nirman-text-secondary leading-relaxed">
                    <strong className="text-nirman-text-primary">Suggested direction:</strong> {gap.suggestedLearningDirection}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recruiter Notes & Decision Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recruiter Review & Notes</CardTitle>
            <span className="text-xs text-nirman-text-muted">Human in the loop</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-nirman-text-primary mb-1.5">
                Evaluation Notes for Hiring Committee
              </label>
              <textarea
                rows={4}
                value={recruiterNotes}
                onChange={(e) => setRecruiterNotes(e.target.value)}
                placeholder="e.g. Strong in PostgreSQL & Python, but 2.4y experience requires probe on independent system design in tech screen..."
                className="w-full text-xs p-3 rounded-md border border-nirman-border bg-white focus:border-nirman-accent focus:outline-none placeholder:text-nirman-text-muted"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-nirman-border">
              <div className="text-[11px] text-nirman-text-secondary">
                Current State: <strong className="text-nirman-dark capitalize">{activeDecision.replace("_", " ")}</strong>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleDecision(activeDecision)}
              >
                Save Review Notes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
