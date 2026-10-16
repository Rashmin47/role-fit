"use client";

import * as React from "react";
import { CareerRoleIntelligence } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  FileSearch,
  TrendingUp,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Language",
  "Framework",
  "Database",
  "Tool",
  "Cloud",
  "Architecture",
] as const;

const LEVEL_TONE: Record<string, string> = {
  Strong: "text-nirman-success-text",
  "Working knowledge": "text-nirman-accent",
  Basic: "text-nirman-warning-text",
  Missing: "text-nirman-danger-text",
};

export function MarketRequirementsView({ role }: { role: CareerRoleIntelligence }) {
  const [category, setCategory] = React.useState<string>("All");

  const filteredRequirements = role.requirements.filter(
    (r) => category === "All" || r.category === category
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 border-b border-nirman-border pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-nirman-dark">
              {role.roleTitle}
            </h2>
            <Badge variant="neutral" size="sm">
              Sample market dataset
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-nirman-text-secondary">
            {role.summary}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-2xs text-nirman-text-secondary">
          <span className="inline-flex items-center gap-1">
            <FileSearch className="h-3.5 w-3.5" aria-hidden />
            {role.totalPostingsAnalyzed} postings
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            {role.lastUpdated}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle>Observed market requirements</CardTitle>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Requirement frequency across analyzed job specifications.
              </p>
            </div>
            <SegmentedControl
              aria-label="Filter requirements by category"
              value={category}
              onChange={setCategory}
              size="sm"
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredRequirements.length === 0 && (
              <p className="py-6 text-center text-xs text-nirman-text-muted">
                No requirements in this category.
              </p>
            )}
            {filteredRequirements.map((req) => (
              <div key={req.skill} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-nirman-dark">
                      {req.skill}
                    </span>
                    <span className="rounded bg-[#F2F4F7] px-1.5 py-0.5 font-mono text-[10px] text-nirman-text-secondary">
                      {req.category}
                    </span>
                    {req.trend === "growing" && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-nirman-success-text">
                        <TrendingUp className="h-3 w-3" aria-hidden />
                        Growing
                      </span>
                    )}
                  </div>
                  <span className="tabular-nums font-mono text-xs font-semibold text-nirman-dark">
                    {req.frequency}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-nirman-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out-quint",
                      req.frequency >= 70
                        ? "bg-nirman-accent"
                        : req.frequency >= 40
                        ? "bg-nirman-accent/75"
                        : "bg-nirman-text-muted"
                    )}
                    style={{ width: `${req.frequency}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Experience expectations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {role.experienceExpectations.map((exp) => (
                <div key={exp.range} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-nirman-dark">
                      {exp.range}
                    </span>
                    <span className="tabular-nums font-mono font-semibold text-nirman-dark">
                      {exp.percentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-nirman-border">
                    <div
                      className="h-full rounded-full bg-nirman-text-primary"
                      style={{ width: `${exp.percentage}%` }}
                    />
                  </div>
                  <span className="block text-[10px] text-nirman-text-muted">
                    {exp.description}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skill priorities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {[
                {
                  label: "High priority · core",
                  dot: "bg-nirman-success",
                  variant: "success" as const,
                  items: role.skillPriorities.high,
                },
                {
                  label: "Medium priority",
                  dot: "bg-nirman-accent",
                  variant: "accent" as const,
                  items: role.skillPriorities.medium,
                },
                {
                  label: "Emerging · differentiator",
                  dot: "bg-nirman-warning",
                  variant: "warning" as const,
                  items: role.skillPriorities.emerging,
                },
              ].map((tier, index) => (
                <div
                  key={tier.label}
                  className={cn(index > 0 && "border-t border-nirman-border pt-3")}
                >
                  <span className="mb-1.5 flex items-center gap-1.5 text-2xs font-semibold text-nirman-dark">
                    <span className={cn("h-2 w-2 rounded-full", tier.dot)} />
                    {tier.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {tier.items.map((s) => (
                      <Badge key={s} variant={tier.variant} size="sm">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {role.sampleUserGaps && (
        <Card className="border-nirman-accent/30">
          <CardHeader>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Profile vs target role gap analysis</CardTitle>
                <Badge variant="accent" size="sm">
                  Interactive profile model
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-nirman-text-secondary">
                Target:{" "}
                <strong className="text-nirman-dark">
                  {role.sampleUserGaps.targetRole}
                </strong>{" "}
                · Profile:{" "}
                <strong className="text-nirman-dark">
                  {role.sampleUserGaps.userProfileName}
                </strong>
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <span className="mb-2 block text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                Verified profile skills
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {role.sampleUserGaps.currentSkills.map((sk) => (
                  <div
                    key={sk.name}
                    className="flex flex-col justify-between rounded-lg border border-nirman-border bg-white p-2.5 text-xs"
                  >
                    <span className="font-semibold text-nirman-dark">
                      {sk.name}
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-medium",
                        LEVEL_TONE[sk.level] ?? "text-nirman-text-muted"
                      )}
                    >
                      {sk.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-3 block text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                Priority gaps to target
              </span>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {role.sampleUserGaps.priorityGaps.map((gap, i) => (
                  <div
                    key={`${gap.skill}-${i}`}
                    className="flex flex-col gap-3 rounded-lg border border-nirman-border bg-[#FAFAF8] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-nirman-dark">
                        {i + 1}. {gap.skill}
                      </span>
                      <Badge
                        variant={gap.importance === "high" ? "danger" : "warning"}
                        size="sm"
                      >
                        {gap.importance}
                      </Badge>
                    </div>
                    <p className="text-2xs leading-relaxed text-nirman-text-secondary">
                      <strong className="text-nirman-text-primary">
                        Why it matters:
                      </strong>{" "}
                      {gap.whyItMatters}
                    </p>
                    {gap.evidenceFromRequirements && (
                      <div className="rounded-md border border-nirman-border bg-white p-2 text-[10px] leading-relaxed text-nirman-text-muted">
                        <strong className="text-nirman-text-secondary">
                          Evidence:
                        </strong>{" "}
                        {gap.evidenceFromRequirements}
                      </div>
                    )}
                    <div className="flex items-start gap-1.5 border-t border-nirman-border pt-2 text-2xs leading-relaxed text-nirman-text-primary">
                      <BookOpen
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nirman-accent"
                        aria-hidden
                      />
                      <span>
                        <strong>Action:</strong>{" "}
                        {gap.suggestedLearningDirection}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
