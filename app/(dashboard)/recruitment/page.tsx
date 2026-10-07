"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Briefcase, ChevronRight, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useScreeningStore } from "@/lib/store/screening-store";

export default function RecruitmentWorkspacePage() {
  const { screenings } = useScreeningStore();

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-nirman-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
            Recruitment Intelligence
          </h1>
          <p className="text-xs text-nirman-text-secondary mt-1">
            Structured screening workflows, deterministic candidate scoring, and explainable shortlists.
          </p>
        </div>

        <Link href="/recruitment/new">
          <Button size="sm" variant="primary">
            <Plus className="h-4 w-4 mr-1.5" />
            New Screening Workflow
          </Button>
        </Link>
      </div>

      {/* Active Screenings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {screenings.map((screening) => {
          const pendingCount = screening.candidates.filter((c) => c.decision === "pending").length;
          const reviewPct = Math.round(
            (screening.reviewedCount / (screening.candidateCount || 1)) * 100
          );

          return (
            <Card key={screening.id} className="hover:border-nirman-accent/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-nirman-accent-light text-nirman-accent flex items-center justify-center font-bold text-xs">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{screening.title}</CardTitle>
                    <span className="text-[11px] text-nirman-text-muted">
                      {screening.department} • {screening.location}
                    </span>
                  </div>
                </div>
                <Badge variant="accent" size="sm">
                  Active
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4 pt-1">
                {/* Requirements Badges */}
                <div className="flex flex-wrap gap-1">
                  {screening.requirements.requiredSkills.map((req, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-nirman-bg border border-nirman-border text-nirman-text-secondary"
                    >
                      {req.name}
                    </span>
                  ))}
                  <span className="text-[10px] px-2 py-0.5 rounded bg-nirman-bg border border-nirman-border text-nirman-text-secondary">
                    {screening.requirements.minimumExperienceYears}y+ Exp
                  </span>
                </div>

                {/* Candidate Stats */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#FAFAF8] border border-nirman-border text-center text-xs">
                  <div>
                    <span className="text-xs font-bold text-nirman-dark block">
                      {screening.candidateCount}
                    </span>
                    <span className="text-[10px] text-nirman-text-muted">Processed</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-nirman-success-text block">
                      {screening.shortlistedCount}
                    </span>
                    <span className="text-[10px] text-nirman-text-muted">Shortlisted</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-nirman-warning-text block">
                      {pendingCount}
                    </span>
                    <span className="text-[10px] text-nirman-text-muted">To Review</span>
                  </div>
                </div>

                {/* Action Link */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-nirman-text-muted font-mono">
                    ID: {screening.id}
                  </span>
                  <Link href={`/recruitment/${screening.id}`}>
                    <Button size="sm" variant="secondary">
                      <span>Open Screening Dashboard</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
