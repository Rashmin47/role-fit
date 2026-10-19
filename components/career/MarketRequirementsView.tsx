"use client";

import * as React from "react";
import { CareerRoleIntelligence } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

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
  "Working knowledge": "text-nirman-text-secondary",
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
      <div className="flex flex-col justify-between gap-3 border-b border-nirman-border pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-semibold text-nirman-dark">
              {role.roleTitle}
            </h2>
            <Badge variant="neutral">Sample data</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-nirman-text-secondary">
            {role.summary}
          </p>
        </div>
        <p className="shrink-0 text-xs text-nirman-text-muted">
          {role.totalPostingsAnalyzed} postings · updated {role.lastUpdated}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Observed requirements</CardTitle>
            <div>
              <label htmlFor="category-filter" className="sr-only">
                Filter requirements by category
              </label>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-8 rounded-md border border-nirman-border bg-white px-2.5 text-[13px] text-nirman-text-primary focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredRequirements.length === 0 && (
              <p className="py-6 text-center text-[13px] text-nirman-text-muted">
                No requirements in this category.
              </p>
            )}
            {filteredRequirements.map((req) => (
              <div key={req.skill} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="text-[13px] font-medium text-nirman-dark">
                      {req.skill}
                    </span>
                    <span className="text-xs text-nirman-text-muted">
                      {req.category}
                    </span>
                    {req.trend === "growing" && (
                      <span className="text-xs text-nirman-success-text">Growing</span>
                    )}
                  </div>
                  <span className="shrink-0 tabular-nums text-[13px] font-medium text-nirman-dark">
                    {req.frequency}%
                  </span>
                </div>
                <Progress value={req.frequency} max={100} size="sm" tone="accent" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Experience expected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {role.experienceExpectations.map((exp) => (
                <div key={exp.range} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-nirman-text-primary">
                      {exp.range}
                    </span>
                    <span className="tabular-nums text-[13px] font-medium text-nirman-dark">
                      {exp.percentage}%
                    </span>
                  </div>
                  <Progress value={exp.percentage} max={100} size="sm" tone="neutral" />
                  <span className="block text-xs text-nirman-text-muted">
                    {exp.description}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[13px]">
              {[
                { label: "Core", items: role.skillPriorities.high },
                { label: "Secondary", items: role.skillPriorities.medium },
                { label: "Emerging", items: role.skillPriorities.emerging },
              ].map((tier, index) => (
                <div
                  key={tier.label}
                  className={cn(index > 0 && "border-t border-nirman-border pt-4")}
                >
                  <span className="mb-1 block text-xs text-nirman-text-muted">
                    {tier.label}
                  </span>
                  <p className="leading-relaxed text-nirman-text-primary">
                    {tier.items.join(", ")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {role.sampleUserGaps && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Profile vs role</CardTitle>
              <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                Target: {role.sampleUserGaps.targetRole} · Profile:{" "}
                {role.sampleUserGaps.userProfileName}
              </p>
            </div>
            <Badge variant="neutral">Sample profile</Badge>
          </CardHeader>
          <CardContent className="space-y-7">
            <div>
              <h4 className="mb-2 text-[13px] font-medium text-nirman-text-primary">
                Verified skills
              </h4>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]">
                {role.sampleUserGaps.currentSkills.map((sk) => (
                  <li key={sk.name} className="flex items-baseline gap-1.5">
                    <span className="text-nirman-dark">{sk.name}</span>
                    <span
                      className={cn(
                        "text-xs",
                        LEVEL_TONE[sk.level] ?? "text-nirman-text-muted"
                      )}
                    >
                      {sk.level}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-3 text-[13px] font-medium text-nirman-text-primary">
                Priority gaps
              </h4>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-3">
                {role.sampleUserGaps.priorityGaps.map((gap, i) => (
                  <div key={`${gap.skill}-${i}`} className="border-t border-nirman-border pt-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-nirman-dark">
                        {gap.skill}
                      </span>
                      <span className="text-xs text-nirman-text-muted">
                        {gap.importance} priority
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-nirman-text-secondary">
                      {gap.whyItMatters}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-nirman-text-muted">
                      Next step: {gap.suggestedLearningDirection}
                    </p>
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
