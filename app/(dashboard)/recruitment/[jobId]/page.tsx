"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Briefcase,
  SlidersHorizontal,
  Download,
  Share2,
  Users,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CandidateTable } from "@/components/recruitment/CandidateTable";
import { useScreeningStore } from "@/lib/store/screening-store";
import { ScoringWeights } from "@/types";

export default function JobScreeningDetailPage({
  params,
}: {
  params: { jobId: string };
}) {
  const { screenings, updateCandidateDecision, recomputeScoresWithWeights } =
    useScreeningStore();

  const screening = screenings.find((s) => s.id === params.jobId) || screenings[0];

  const [showWeightsConfig, setShowWeightsConfig] = React.useState(false);
  const [weights, setWeights] = React.useState<ScoringWeights>({
    requiredSkills: 50,
    experience: 25,
    preferredSkills: 15,
    evidenceQuality: 10,
  });

  if (!screening) {
    return notFound();
  }

  const handleApplyWeights = () => {
    recomputeScoresWithWeights(screening.id, weights);
    setShowWeightsConfig(false);
  };

  const strongMatchesCount = screening.candidates.filter(
    (c) => c.status === "Strong Match"
  ).length;
  const reviewCount = screening.candidates.filter((c) => c.status === "Review").length;
  const verificationCount = screening.candidates.filter(
    (c) => c.status === "Needs Verification"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-nirman-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
              {screening.title}
            </h1>
            <Badge variant="accent" size="sm">
              Screening Active
            </Badge>
          </div>
          <p className="text-xs text-nirman-text-secondary mt-1">
            {screening.department} • {screening.location} • Minimum Experience: {screening.requirements.minimumExperienceYears} years
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWeightsConfig(!showWeightsConfig)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
            <span>Scoring Weights</span>
          </Button>
          <Link href="/recruitment/new">
            <Button size="sm" variant="primary">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Candidates
            </Button>
          </Link>
        </div>
      </div>

      {/* Weights Tuning Drawer / Card */}
      {showWeightsConfig && (
        <Card className="border-nirman-accent/40 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-nirman-border pb-2">
            <div>
              <h3 className="text-xs font-semibold text-nirman-dark">
                Deterministic Scoring Weight Configuration
              </h3>
              <p className="text-[11px] text-nirman-text-secondary">
                Adjust points allocation. Total points must equal 100%.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-nirman-accent">
              Total: {weights.requiredSkills + weights.experience + weights.preferredSkills + weights.evidenceQuality} / 100 pts
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-nirman-text-secondary font-medium mb-1">
                Required Skills ({weights.requiredSkills} pts)
              </label>
              <input
                type="range"
                min={20}
                max={70}
                step={5}
                value={weights.requiredSkills}
                onChange={(e) => setWeights({ ...weights, requiredSkills: Number(e.target.value) })}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-nirman-text-secondary font-medium mb-1">
                Experience Duration ({weights.experience} pts)
              </label>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={weights.experience}
                onChange={(e) => setWeights({ ...weights, experience: Number(e.target.value) })}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-nirman-text-secondary font-medium mb-1">
                Preferred Skills ({weights.preferredSkills} pts)
              </label>
              <input
                type="range"
                min={5}
                max={30}
                step={5}
                value={weights.preferredSkills}
                onChange={(e) => setWeights({ ...weights, preferredSkills: Number(e.target.value) })}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-nirman-text-secondary font-medium mb-1">
                Evidence Quality ({weights.evidenceQuality} pts)
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={5}
                value={weights.evidenceQuality}
                onChange={(e) => setWeights({ ...weights, evidenceQuality: Number(e.target.value) })}
                className="w-full accent-nirman-accent cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-nirman-border">
            <Button size="sm" variant="ghost" onClick={() => setShowWeightsConfig(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleApplyWeights}>
              Recompute Match Scores
            </Button>
          </div>
        </Card>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white">
          <span className="text-[11px] font-medium text-nirman-text-secondary block">
            Total Candidates
          </span>
          <span className="text-2xl font-bold text-nirman-dark mt-1 block">
            {screening.candidates.length}
          </span>
          <span className="text-[10px] text-nirman-text-muted mt-0.5 block">
            Evaluated by pipeline
          </span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-medium text-nirman-text-secondary block">
            Strong Matches
          </span>
          <span className="text-2xl font-bold text-nirman-success-text mt-1 block">
            {strongMatchesCount}
          </span>
          <span className="text-[10px] text-nirman-text-muted mt-0.5 block">
            Meets 100% core specs
          </span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-medium text-nirman-text-secondary block">
            Review Recommended
          </span>
          <span className="text-2xl font-bold text-nirman-warning-text mt-1 block">
            {reviewCount}
          </span>
          <span className="text-[10px] text-nirman-text-muted mt-0.5 block">
            Minor gap identified
          </span>
        </Card>

        <Card className="p-4 bg-white">
          <span className="text-[11px] font-medium text-nirman-text-secondary block">
            Shortlisted by Recruiter
          </span>
          <span className="text-2xl font-bold text-nirman-accent mt-1 block">
            {screening.shortlistedCount}
          </span>
          <span className="text-[10px] text-nirman-text-muted mt-0.5 block">
            Human final call
          </span>
        </Card>
      </div>

      {/* Structured Candidate Shortlist Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-nirman-dark">
            Screened Candidate Shortlist & Explainability
          </h2>
          <span className="text-xs text-nirman-text-muted">
            Click any candidate row or 'Review' to inspect evidence citations
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
