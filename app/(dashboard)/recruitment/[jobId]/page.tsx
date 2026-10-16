"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Info,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Callout } from "@/components/ui/Callout";
import { CandidateTable } from "@/components/recruitment/CandidateTable";
import { useScreeningStore } from "@/lib/store/screening-store";
import { ScoringWeights } from "@/types";

const DEFAULT_WEIGHTS: ScoringWeights = {
  requiredSkills: 50,
  experience: 25,
  preferredSkills: 15,
  evidenceQuality: 10,
};

const WEIGHT_FIELDS: Array<{
  key: keyof ScoringWeights;
  label: string;
  min: number;
  max: number;
}> = [
  { key: "requiredSkills", label: "Required Skills", min: 20, max: 70 },
  { key: "experience", label: "Experience Duration", min: 10, max: 50 },
  { key: "preferredSkills", label: "Preferred Skills", min: 5, max: 30 },
  { key: "evidenceQuality", label: "Evidence Quality", min: 0, max: 20 },
];

export default function JobScreeningDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { screenings, updateCandidateDecision, recomputeScoresWithWeights } =
    useScreeningStore();

  const screening = screenings.find((s) => s.id === params.jobId) || screenings[0];

  const [showWeightsConfig, setShowWeightsConfig] = React.useState(false);
  const [weights, setWeights] = React.useState<ScoringWeights>(DEFAULT_WEIGHTS);

  if (!screening) {
    return notFound();
  }

  const weightsTotal =
    weights.requiredSkills +
    weights.experience +
    weights.preferredSkills +
    weights.evidenceQuality;
  const weightsValid = weightsTotal === 100;

  const handleApplyWeights = () => {
    if (!weightsValid) return;
    recomputeScoresWithWeights(screening.id, weights);
    setShowWeightsConfig(false);
  };

  const strongMatchesCount = screening.candidates.filter(
    (c) => c.status === "Strong Match"
  ).length;
  const reviewCount = screening.candidates.filter(
    (c) => c.status === "Review"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Recruitment", href: "/recruitment" },
          { label: screening.title },
        ]}
        eyebrow="Screening"
        title={screening.title}
        description={`${screening.department} · ${screening.location} · Minimum ${screening.requirements.minimumExperienceYears} years experience`}
        actions={
          <>
            <Button
              variant={showWeightsConfig ? "subtle" : "outline"}
              size="sm"
              onClick={() => setShowWeightsConfig((v) => !v)}
              aria-expanded={showWeightsConfig}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Scoring Weights
            </Button>
            <ButtonLink href="/recruitment/new" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Candidates
            </ButtonLink>
          </>
        }
      />

      {showWeightsConfig && (
        <Card className="animate-slide-up border-nirman-accent/40">
          <CardHeader>
            <div>
              <CardTitle>Deterministic Scoring Weights</CardTitle>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Adjust how many points each component contributes. The total must
                equal 100.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={weightsValid ? "success" : "danger"} size="sm" mono>
                Total {weightsTotal}/100
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                aria-label="Reset weights to default"
                title="Reset to defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {WEIGHT_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor={`weight-${field.key}`}
                      className="text-xs font-medium text-nirman-text-primary"
                    >
                      {field.label}
                    </label>
                    <span className="tabular-nums font-mono text-xs font-semibold text-nirman-dark">
                      {weights[field.key]} pts
                    </span>
                  </div>
                  <input
                    id={`weight-${field.key}`}
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={5}
                    value={weights[field.key]}
                    onChange={(e) =>
                      setWeights({
                        ...weights,
                        [field.key]: Number(e.target.value),
                      })
                    }
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-nirman-border accent-nirman-accent"
                  />
                </div>
              ))}
            </div>

            {!weightsValid && (
              <Callout tone="warning">
                Weights currently sum to <strong>{weightsTotal}</strong>. Adjust by{" "}
                {weightsTotal > 100
                  ? `removing ${weightsTotal - 100}`
                  : `adding ${100 - weightsTotal}`}{" "}
                points before recomputing.
              </Callout>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-nirman-border pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeightsConfig(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyWeights}
                disabled={!weightsValid}
              >
                Recompute Match Scores
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Candidates"
          value={screening.candidates.length}
          hint="Evaluated by the pipeline"
          icon={Users}
          tone="accent"
        />
        <StatCard
          label="Strong Matches"
          value={strongMatchesCount}
          hint="Meets core specifications"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Review Recommended"
          value={reviewCount}
          hint="Minor gap identified"
          icon={Info}
          tone="warning"
        />
        <StatCard
          label="Shortlisted"
          value={screening.shortlistedCount}
          hint="Recruiter final call"
          icon={CheckCircle2}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-nirman-dark">
            Screened Candidate Shortlist
          </h2>
          <span className="text-2xs text-nirman-text-muted">
            Select a row or “Review” to inspect evidence citations
          </span>
        </div>

        <CandidateTable
          candidates={screening.candidates}
          jobId={screening.id}
          onDecisionChange={(candidateId, decision) =>
            updateCandidateDecision(screening.id, candidateId, decision)
          }
        />
      </div>
    </div>
  );
}
