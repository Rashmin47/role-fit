"use client";

import * as React from "react";
import { CareerRoleIntelligence } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  TrendingUp,
  BarChart2,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

export function MarketRequirementsView({ role }: { role: CareerRoleIntelligence }) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");

  const categories = ["All", "Language", "Framework", "Database", "Tool", "Cloud", "Architecture"];

  const filteredRequirements = role.requirements.filter(
    (r) => selectedCategory === "All" || r.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-nirman-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-nirman-dark tracking-tight">
              {role.roleTitle}
            </h1>
            <Badge variant="neutral" size="sm">
              Sample market dataset
            </Badge>
          </div>
          <p className="text-xs text-nirman-text-secondary mt-0.5">
            {role.summary}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-nirman-text-secondary font-mono">
          <span>Analyzed: <strong className="text-nirman-dark">{role.totalPostingsAnalyzed} postings</strong></span>
          <span>•</span>
          <span>Updated: {role.lastUpdated}</span>
        </div>
      </div>

      {/* Grid: Market Requirements & Experience Expectations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Requirements Distribution (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Observed Market Requirements</CardTitle>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                Frequency percentage across analyzed job specifications.
              </p>
            </div>
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-nirman-bg p-0.5 rounded border border-nirman-border text-[11px]">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    selectedCategory === cat
                      ? "bg-white font-medium text-nirman-dark shadow-subtle"
                      : "text-nirman-text-secondary hover:text-nirman-dark"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredRequirements.map((req, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-nirman-dark">{req.skill}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F2F4F7] text-nirman-text-secondary font-mono">
                      {req.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-nirman-dark">
                      {req.frequency}%
                    </span>
                  </div>
                </div>
                {/* Clean Bar */}
                <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      req.frequency >= 70
                        ? "bg-nirman-accent"
                        : req.frequency >= 40
                        ? "bg-nirman-accent/80"
                        : "bg-nirman-text-muted"
                    }`}
                    style={{ width: `${req.frequency}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Experience Expectations & Skill Priorities (1 col) */}
        <div className="space-y-6">
          {/* Experience Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Experience Expectations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {role.experienceExpectations.map((exp, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-nirman-dark">{exp.range}</span>
                    <span className="font-mono font-semibold text-nirman-dark">{exp.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-nirman-text-primary rounded-full"
                      style={{ width: `${exp.percentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-nirman-text-muted block">
                    {exp.description}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skill Priority Tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Priorities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-nirman-dark block mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-nirman-success" /> High Priority (Core)
                </span>
                <div className="flex flex-wrap gap-1">
                  {role.skillPriorities.high.map((s, i) => (
                    <Badge key={i} variant="success" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-nirman-border">
                <span className="text-[11px] font-semibold text-nirman-dark block mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-nirman-accent" /> Medium Priority
                </span>
                <div className="flex flex-wrap gap-1">
                  {role.skillPriorities.medium.map((s, i) => (
                    <Badge key={i} variant="accent" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-nirman-border">
                <span className="text-[11px] font-semibold text-nirman-dark block mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-nirman-warning" /> Emerging / Differentiator
                </span>
                <div className="flex flex-wrap gap-1">
                  {role.skillPriorities.emerging.map((s, i) => (
                    <Badge key={i} variant="warning" size="sm">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Skill Gap Comparison (if present for this role) */}
      {role.sampleUserGaps && (
        <Card className="border-nirman-accent/30 shadow-subtle">
          <CardHeader className="bg-nirman-bg/40">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>User Profile vs Target Role Gap Analysis</CardTitle>
                <Badge variant="accent" size="sm">Interactive Profile Model</Badge>
              </div>
              <p className="text-xs text-nirman-text-secondary mt-0.5">
                Target: <strong className="text-nirman-dark">{role.sampleUserGaps.targetRole}</strong> • Profile: <strong className="text-nirman-dark">{role.sampleUserGaps.userProfileName}</strong>
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Skills Matrix */}
            <div>
              <span className="text-xs font-semibold text-nirman-dark block mb-2">
                Verified Candidate Profile Skills:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {role.sampleUserGaps.currentSkills.map((sk, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded border border-nirman-border bg-white flex flex-col justify-between text-xs"
                  >
                    <span className="font-semibold text-nirman-dark">{sk.name}</span>
                    <span
                      className={`text-[10px] font-medium mt-1 ${
                        sk.level === "Strong"
                          ? "text-nirman-success-text"
                          : sk.level === "Working knowledge"
                          ? "text-nirman-accent"
                          : sk.level === "Basic"
                          ? "text-nirman-warning-text"
                          : "text-nirman-danger-text"
                      }`}
                    >
                      {sk.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Gaps Detailed Cards */}
            <div>
              <span className="text-xs font-semibold text-nirman-dark block mb-3">
                Priority Gaps to Target for Role Alignment:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {role.sampleUserGaps.priorityGaps.map((gap, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-md border border-nirman-border bg-[#FAFAF8] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-nirman-dark">
                          {i + 1}. {gap.skill}
                        </span>
                        <Badge variant={gap.importance === "high" ? "danger" : "warning"} size="sm">
                          {gap.importance}
                        </Badge>
                      </div>
                      <p className="text-xs text-nirman-text-secondary leading-relaxed">
                        <strong className="text-nirman-text-primary">Why it matters:</strong> {gap.whyItMatters}
                      </p>
                      <div className="mt-2 text-[11px] text-nirman-text-muted bg-white p-2 rounded border border-nirman-border">
                        <strong>Evidence:</strong> {gap.evidenceFromRequirements}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-nirman-border text-xs text-nirman-text-primary flex items-start gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-nirman-accent shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed">
                        <strong>Action:</strong> {gap.suggestedLearningDirection}
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
