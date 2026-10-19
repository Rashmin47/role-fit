"use client";

import * as React from "react";
import { CandidateScoreResult, DecisionStatus } from "@/types";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { formatYears } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Search } from "lucide-react";

interface CandidateTableProps {
  candidates: CandidateScoreResult[];
  jobId: string;
  onDecisionChange?: (candidateId: string, decision: DecisionStatus) => void;
  onSelectCandidate?: (candidate: CandidateScoreResult) => void;
}

type SortField = "totalScore" | "calculatedExperienceYears";

function SortIcon({
  field,
  sortField,
  sortAsc,
}: {
  field: SortField;
  sortField: SortField;
  sortAsc: boolean;
}) {
  if (sortField !== field) {
    return <ArrowUpDown className="h-3 w-3 text-nirman-text-muted/60" aria-hidden />;
  }
  return sortAsc ? (
    <ArrowUp className="h-3 w-3 text-nirman-text-secondary" aria-hidden />
  ) : (
    <ArrowDown className="h-3 w-3 text-nirman-text-secondary" aria-hidden />
  );
}

export function CandidateTable({
  candidates,
  jobId,
  onDecisionChange,
}: CandidateTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortField, setSortField] = React.useState<SortField>("totalScore");
  const [sortAsc, setSortAsc] = React.useState<boolean>(false);

  const statusCounts = React.useMemo(() => {
    return candidates.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [candidates]);

  const filteredCandidates = React.useMemo(() => {
    return candidates
      .filter((c) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          c.candidateName.toLowerCase().includes(query) ||
          c.matches.some((m) => m.requirementName.toLowerCase().includes(query));
        const matchesStatus =
          statusFilter === "all" ||
          c.status === statusFilter ||
          c.decision === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [candidates, searchTerm, statusFilter, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-nirman-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nirman-text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name or skill…"
            aria-label="Filter candidates"
            className="h-8 w-full rounded-md border border-nirman-border bg-white pl-8 pr-3 text-[13px] text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
          />
        </div>

        <SegmentedControl
          aria-label="Filter by recommendation"
          value={statusFilter}
          onChange={setStatusFilter}
          size="sm"
          options={[
            { value: "all", label: "All", count: candidates.length },
            {
              value: "Strong Match",
              label: "Strong",
              count: statusCounts["Strong Match"] ?? 0,
            },
            {
              value: "Review",
              label: "Review",
              count: statusCounts["Review"] ?? 0,
            },
            {
              value: "Needs Verification",
              label: "Verify",
              count: statusCounts["Needs Verification"] ?? 0,
            },
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-nirman-border bg-nirman-inset text-nirman-text-secondary">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Candidate
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("totalScore")}
                  className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-nirman-dark"
                >
                  Match
                  <SortIcon field="totalScore" sortField={sortField} sortAsc={sortAsc} />
                </button>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("calculatedExperienceYears")}
                  className="inline-flex items-center gap-1.5 rounded-sm transition-colors hover:text-nirman-dark"
                >
                  Experience
                  <SortIcon
                    field="calculatedExperienceYears"
                    sortField={sortField}
                    sortAsc={sortAsc}
                  />
                </button>
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Met
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Recommendation
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Decision
              </th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nirman-border">
            {filteredCandidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    title="No matching candidates"
                    description="Try adjusting the search or the recommendation filter."
                    className="rounded-none border-0 bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              filteredCandidates.map((candidate) => {
                const matchedCount = candidate.matches.filter((m) => m.matched).length;
                const totalCount = candidate.matches.length;

                return (
                  <tr
                    key={candidate.candidateId}
                    className="transition-colors hover:bg-nirman-inset"
                  >
                    <td className="px-4 py-3">
                      <span className="block font-medium text-nirman-dark">
                        {candidate.candidateName}
                      </span>
                      <span className="mt-0.5 block text-xs text-nirman-text-muted">
                        {candidate.gaps.length === 0
                          ? "No gaps"
                          : `${candidate.gaps.length} ${
                              candidate.gaps.length === 1 ? "gap" : "gaps"
                            }: ${candidate.gaps[0]?.skill}`}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <ScoreMeter score={candidate.totalScore} />
                    </td>

                    <td className="px-4 py-3">
                      <span className="block tabular-nums text-nirman-text-primary">
                        {formatYears(candidate.calculatedExperienceYears)}
                      </span>
                      <span className="mt-0.5 block text-xs text-nirman-text-muted">
                        {candidate.requiredExperienceYears}y required
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="tabular-nums text-nirman-text-primary">
                        {matchedCount}
                        <span className="text-nirman-text-muted"> / {totalCount}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={candidate.status} />
                    </td>

                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`decision-${candidate.candidateId}`}>
                        Decision for {candidate.candidateName}
                      </label>
                      <select
                        id={`decision-${candidate.candidateId}`}
                        value={candidate.decision}
                        onChange={(e) =>
                          onDecisionChange?.(
                            candidate.candidateId,
                            e.target.value as DecisionStatus
                          )
                        }
                        className="h-8 rounded-md border border-nirman-border bg-white px-2 text-[13px] text-nirman-dark transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
                      >
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlist</option>
                        <option value="held">Hold</option>
                        <option value="not_recommended">Not recommended</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <ButtonLink
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        variant="ghost"
                        size="sm"
                        className="text-nirman-accent hover:bg-nirman-accent-light"
                      >
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-nirman-border px-4 py-2.5 text-xs text-nirman-text-muted">
        Showing{" "}
        <strong className="font-medium tabular-nums text-nirman-text-secondary">
          {filteredCandidates.length}
        </strong>{" "}
        of {candidates.length} candidates
      </div>
    </Card>
  );
}
