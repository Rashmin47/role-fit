"use client";

import * as React from "react";
import Link from "next/link";
import {
  CandidateScoreResult,
  DecisionStatus,
  MatchStatus,
} from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatYears } from "@/lib/utils";
import {
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

interface CandidateTableProps {
  candidates: CandidateScoreResult[];
  jobId: string;
  onDecisionChange?: (candidateId: string, decision: DecisionStatus) => void;
  onSelectCandidate?: (candidate: CandidateScoreResult) => void;
}

export function CandidateTable({
  candidates,
  jobId,
  onDecisionChange,
  onSelectCandidate,
}: CandidateTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortField, setSortField] = React.useState<"totalScore" | "calculatedExperienceYears">("totalScore");
  const [sortAsc, setSortAsc] = React.useState<boolean>(false);

  // Filter & sort
  const filteredCandidates = React.useMemo(() => {
    return candidates
      .filter((c) => {
        const matchesSearch =
          c.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.matches.some((m) => m.requirementName.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus =
          statusFilter === "all" || c.status === statusFilter || c.decision === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [candidates, searchTerm, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: "totalScore" | "calculatedExperienceYears") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-nirman-border bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-nirman-text-muted" />
          <input
            type="text"
            placeholder="Filter candidates or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full pl-8 pr-3 text-xs bg-nirman-bg rounded-md border border-nirman-border focus:border-nirman-accent focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-nirman-bg p-1 rounded-md border border-nirman-border">
            {["all", "Strong Match", "Review", "Needs Verification"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  statusFilter === tab
                    ? "bg-white font-medium text-nirman-dark shadow-subtle"
                    : "text-nirman-text-secondary hover:text-nirman-dark"
                }`}
              >
                {tab === "all" ? "All Candidates" : tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidate Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-nirman-border bg-[#FAFAF8] text-nirman-text-secondary font-medium">
              <th className="py-3 px-4">Candidate</th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-nirman-dark select-none"
                onClick={() => toggleSort("totalScore")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Match Score</span>
                  <ArrowUpDown className="h-3 w-3 text-nirman-text-muted" />
                </div>
              </th>
              <th
                className="py-3 px-4 cursor-pointer hover:text-nirman-dark select-none"
                onClick={() => toggleSort("calculatedExperienceYears")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Experience</span>
                  <ArrowUpDown className="h-3 w-3 text-nirman-text-muted" />
                </div>
              </th>
              <th className="py-3 px-4">Requirements</th>
              <th className="py-3 px-4">Gaps Identified</th>
              <th className="py-3 px-4">Recommendation</th>
              <th className="py-3 px-4">Decision</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nirman-border">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-nirman-text-muted">
                  No candidates match the selected filters.
                </td>
              </tr>
            ) : (
              filteredCandidates.map((candidate) => {
                const matchedCount = candidate.matches.filter((m) => m.matched).length;
                const totalCount = candidate.matches.length;

                return (
                  <tr
                    key={candidate.candidateId}
                    className="hover:bg-nirman-bg/60 transition-colors group cursor-pointer"
                    onClick={() => onSelectCandidate?.(candidate)}
                  >
                    {/* Candidate Name */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-nirman-dark group-hover:text-nirman-accent transition-colors">
                          {candidate.candidateName}
                        </span>
                        <span className="text-[11px] text-nirman-text-muted font-mono">
                          ID: {candidate.candidateId}
                        </span>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold text-sm ${
                            candidate.totalScore >= 85
                              ? "text-nirman-success-text"
                              : candidate.totalScore >= 70
                              ? "text-nirman-dark"
                              : "text-nirman-warning-text"
                          }`}
                        >
                          {Math.round(candidate.totalScore)}%
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-nirman-border overflow-hidden">
                          <div
                            className={`h-full ${
                              candidate.totalScore >= 85
                                ? "bg-nirman-success"
                                : candidate.totalScore >= 70
                                ? "bg-nirman-accent"
                                : "bg-nirman-warning"
                            }`}
                            style={{ width: `${candidate.totalScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Experience */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-nirman-dark">
                          {formatYears(candidate.calculatedExperienceYears)}
                        </span>
                        <span className="text-[10px] text-nirman-text-muted">
                          Req: {candidate.requiredExperienceYears}y+
                        </span>
                      </div>
                    </td>

                    {/* Requirements matched */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-nirman-dark">
                          {matchedCount}/{totalCount}
                        </span>
                        <span className="text-[11px] text-nirman-text-muted">met</span>
                      </div>
                    </td>

                    {/* Gaps */}
                    <td className="py-3 px-4">
                      {candidate.gaps.length === 0 ? (
                        <span className="text-nirman-success-text text-[11px] font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> No critical gaps
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-nirman-text-primary text-[11px] font-medium">
                            {candidate.gaps.length} {candidate.gaps.length === 1 ? "gap" : "gaps"}
                          </span>
                          <span className="text-[10px] text-nirman-text-muted truncate max-w-[140px]">
                            {candidate.gaps[0]?.skill}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Recommendation */}
                    <td className="py-3 px-4">
                      <StatusBadge status={candidate.status} />
                    </td>

                    {/* Human Decision */}
                    <td
                      className="py-3 px-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <select
                        value={candidate.decision}
                        onChange={(e) =>
                          onDecisionChange?.(
                            candidate.candidateId,
                            e.target.value as DecisionStatus
                          )
                        }
                        className="text-xs bg-white border border-nirman-border rounded px-2 py-1 focus:border-nirman-accent focus:outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlist</option>
                        <option value="held">Hold</option>
                        <option value="not_recommended">Not Recommended</option>
                      </select>
                    </td>

                    {/* Review Action */}
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-nirman-accent hover:text-nirman-accent-hover hover:underline"
                      >
                        <span>Review</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-4 py-2.5 bg-[#FAFAF8] border-t border-nirman-border text-[11px] text-nirman-text-secondary flex items-center justify-between">
        <span>Showing {filteredCandidates.length} of {candidates.length} candidates</span>
        <span className="text-nirman-text-muted">
          Scores calculated deterministically via Nirman Scoring Engine
        </span>
      </div>
    </Card>
  );
}
