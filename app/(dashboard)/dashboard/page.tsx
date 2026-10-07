"use client";

import * as React from "react";
import Link from "next/link";
import {
  Briefcase,
  Compass,
  Users,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  FileCheck2,
  Plus,
  ChevronRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { useScreeningStore } from "@/lib/store/screening-store";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import { formatYears } from "@/lib/utils";

export default function DashboardPage() {
  const { screenings } = useScreeningStore();

  const totalCandidates = screenings.reduce((acc, s) => acc + s.candidateCount, 0);
  const pendingReviewCandidates = screenings.flatMap((s) => s.candidates).filter((c) => c.decision === "pending");

  const primaryRole = SAMPLE_CAREER_ROLES["python-backend-developer"];

  return (
    <div className="space-y-6">
      {/* Top Greeting & Key Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-nirman-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
            Good morning, Rashmin
          </h1>
          <div className="flex items-center gap-3 text-xs text-nirman-text-secondary mt-1">
            <span>
              <strong className="text-nirman-dark">{screenings.length}</strong> active screenings
            </span>
            <span>•</span>
            <span>
              <strong className="text-nirman-dark">1</strong> role analysis
            </span>
            <span>•</span>
            <span>
              <strong className="text-nirman-dark">{pendingReviewCandidates.length}</strong> candidates requiring review
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/career-intelligence">
            <Button size="sm" variant="secondary">
              <Compass className="h-4 w-4 mr-1.5" />
              Role Intelligence
            </Button>
          </Link>
          <Link href="/recruitment/new">
            <Button size="sm" variant="primary">
              <Plus className="h-4 w-4 mr-1.5" />
              New Screening
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Focused Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Screening Activity & Candidate Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Screening Activity */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Active Recruitment Screenings</CardTitle>
                <p className="text-xs text-nirman-text-secondary mt-0.5">
                  Live screening pipelines and human review completion status.
                </p>
              </div>
              <Link
                href="/recruitment"
                className="text-xs text-nirman-accent hover:underline flex items-center gap-1 font-medium"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {screenings.map((screening) => (
                <Link
                  key={screening.id}
                  href={`/recruitment/${screening.id}`}
                  className="block p-3.5 rounded-lg border border-nirman-border bg-[#FAFAF8] hover:bg-white hover:border-nirman-accent/50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-xs text-nirman-dark group-hover:text-nirman-accent transition-colors">
                          {screening.title}
                        </h4>
                        <Badge variant="neutral" size="sm">
                          {screening.department}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-nirman-text-secondary mt-1">
                        {screening.candidateCount} candidates processed • {screening.shortlistedCount} shortlisted • {screening.candidates.filter(c => c.decision === "pending").length} pending review
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-nirman-dark">
                        {Math.round((screening.reviewedCount / (screening.candidateCount || 1)) * 100)}%
                      </span>
                      <span className="text-[10px] text-nirman-text-muted block">reviewed</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2.5 h-1.5 w-full bg-nirman-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-nirman-accent"
                      style={{
                        width: `${Math.max(
                          10,
                          (screening.reviewedCount / (screening.candidateCount || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Candidate Review Queue */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Candidate Review Queue</CardTitle>
                <p className="text-xs text-nirman-text-secondary mt-0.5">
                  Candidates matched and waiting for human evaluation.
                </p>
              </div>
              <span className="text-xs text-nirman-text-muted font-mono">
                {pendingReviewCandidates.length} awaiting review
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-nirman-border">
                {pendingReviewCandidates.slice(0, 5).map((cand) => (
                  <div
                    key={cand.candidateId}
                    className="p-3.5 flex items-center justify-between hover:bg-nirman-bg/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white border border-nirman-border flex items-center justify-center text-xs font-semibold text-nirman-dark">
                        {cand.candidateName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-nirman-dark">
                            {cand.candidateName}
                          </span>
                          <StatusBadge status={cand.status} />
                        </div>
                        <p className="text-[11px] text-nirman-text-secondary mt-0.5">
                          {formatYears(cand.calculatedExperienceYears)} exp • {cand.gaps.length} {cand.gaps.length === 1 ? "gap" : "gaps"} detected
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-semibold text-xs text-nirman-dark">
                          {Math.round(cand.totalScore)}%
                        </span>
                        <span className="text-[10px] text-nirman-text-muted block">match</span>
                      </div>
                      <Link
                        href={`/recruitment/${screenings[0]?.id || "job-screening-py-01"}/candidate/${cand.candidateId}`}
                      >
                        <Button size="sm" variant="secondary">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Market Insight & Role Snapshot */}
        <div className="space-y-6">
          {/* Market Insight Snapshot */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Market Requirement Insight</CardTitle>
                <p className="text-xs text-nirman-text-secondary mt-0.5">
                  {primaryRole.roleTitle}
                </p>
              </div>
              <Badge variant="accent" size="sm">
                Sample dataset
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-[#FAFAF8] rounded border border-nirman-border">
                <div className="text-xs text-nirman-text-secondary">
                  Job requirements analyzed: <strong className="text-nirman-dark">{primaryRole.totalPostingsAnalyzed}</strong>
                </div>
                <div className="text-xs text-nirman-text-primary mt-1">
                  Top recurring skills: <span className="font-semibold">{primaryRole.skillPriorities.high.join(" · ")}</span>
                </div>
              </div>

              {/* Requirement frequencies */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-nirman-dark block">
                  Observed Skill Distribution:
                </span>
                {primaryRole.requirements.slice(0, 5).map((req, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-nirman-text-primary font-medium">{req.skill}</span>
                      <span className="font-mono text-nirman-dark font-semibold">{req.frequency}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-nirman-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nirman-accent"
                        style={{ width: `${req.frequency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Link href={`/career-intelligence/${primaryRole.roleId}`}>
                <Button size="sm" variant="outline" className="w-full mt-2">
                  View Full Role Intelligence
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Engine Principles Card */}
          <Card className="bg-nirman-bg/60 border-nirman-border">
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="font-semibold text-nirman-dark flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-nirman-success" />
                Nirman Decision Standard
              </div>
              <p className="text-nirman-text-secondary leading-relaxed">
                Nirman extracts structured requirements and computes mathematical scores. The recruiter always performs the final review and hiring decision.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
