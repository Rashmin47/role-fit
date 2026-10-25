"use client";

import * as React from "react";
import { Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
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
  { key: "requiredSkills", label: "Required skills", min: 20, max: 70 },
  { key: "experience", label: "Experience", min: 10, max: 50 },
  { key: "preferredSkills", label: "Preferred skills", min: 5, max: 30 },
  { key: "evidenceQuality", label: "Evidence quality", min: 0, max: 20 },
];

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

export default function JobScreeningDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = React.use(params);
  const { screenings, updateCandidateDecision, recomputeScoresWithWeights } =
    useScreeningStore();

  const screening = screenings.find((s) => s.id === jobId);

  const [showWeightsConfig, setShowWeightsConfig] = React.useState(false);
  const [weights, setWeights] = React.useState<ScoringWeights>(DEFAULT_WEIGHTS);

  if (!screening) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Screening not found"
          description="This screening is not available in the current workspace. It may have been created in another browser profile."
        />
        <EmptyState
          title="No matching screening"
          description="Open the recruitment workspace to choose an existing screening or create a new one."
          action={
            <ButtonLink href="/recruitment" size="sm">
              Back to recruitment
            </ButtonLink>
          }
          className="py-16"
        />
      </div>
    );
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
    <div className="space-y-8">
      <PageHeader
        title={screening.title}
        description={`${screening.department} · ${screening.location} · Minimum ${screening.requirements.minimumExperienceYears} years experience`}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowWeightsConfig((v) => !v)}
              aria-expanded={showWeightsConfig}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Scoring weights
            </Button>
            <ButtonLink href="/recruitment/new" size="sm">
              <Plus className="h-4 w-4" />
              New screening
            </ButtonLink>
          </>
        }
      />

      {screening.isSample && (
        <Callout tone="neutral" title="Sample screening">
          These candidates are fictional records from the bundled demo set. They
          are not live applicants, and the scores are only an illustration of the
          deterministic pipeline.
        </Callout>
      )}

      <div className="grid grid-cols-2 divide-y divide-nirman-border overflow-hidden rounded-lg border border-nirman-border bg-white sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
        <Metric
          label="Candidates"
          value={screening.candidates.length}
          hint="Evaluated by the pipeline"
        />
        <Metric
          label="Strong matches"
          value={strongMatchesCount}
          hint="Meet the core specification"
        />
        <Metric
          label="Review"
          value={reviewCount}
          hint="Minor gap identified"
        />
        <Metric
          label="Shortlisted"
          value={screening.shortlistedCount}
          hint="Marked by a reviewer"
        />
      </div>

      {screening.processingNotes && screening.processingNotes.length > 0 && (
        <Callout tone="warning" title="Some documents were skipped">
          <ul className="space-y-1">
            {screening.processingNotes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </Callout>
      )}

      {showWeightsConfig && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div>
              <CardTitle>Scoring weights</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                Adjust the contribution of each component. The total must equal 100.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={
                  weightsValid
                    ? "tabular-nums text-[13px] font-medium text-nirman-text-secondary"
                    : "tabular-nums text-[13px] font-medium text-nirman-danger-text"
                }
              >
                {weightsTotal} / 100
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setWeights(DEFAULT_WEIGHTS)}
                aria-label="Reset weights to default"
                title="Reset to defaults"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {WEIGHT_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor={`weight-${field.key}`}
                      className="text-[13px] font-medium text-nirman-text-primary"
                    >
                      {field.label}
                    </label>
                    <span className="tabular-nums text-[13px] font-medium text-nirman-dark">
                      {weights[field.key]}
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
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#e6e6e4] accent-nirman-accent"
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
                Recompute scores
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-nirman-dark">Candidates</h2>
          <span className="text-xs text-nirman-text-muted">
            Open a candidate to inspect evidence and record a decision
          </span>
        </div>

        {screening.candidates.length === 0 ? (
          <EmptyState
            title="No candidates yet"
            description="Run a screening to evaluate candidates against this role."
            action={
              <ButtonLink href="/recruitment/new" size="sm">
                <Plus className="h-4 w-4" />
                New screening
              </ButtonLink>
            }
          />
        ) : (
          <CandidateTable
            candidates={screening.candidates}
            jobId={screening.id}
            onDecisionChange={(candidateId, decision) =>
              updateCandidateDecision(screening.id, candidateId, decision)
            }
          />
        )}
      </section>
    </div>
  );
}
