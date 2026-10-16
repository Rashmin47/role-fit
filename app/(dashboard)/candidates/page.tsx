"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Search, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { Avatar } from "@/components/ui/Avatar";
import { useScreeningStore } from "@/lib/store/screening-store";
import { formatYears } from "@/lib/utils";
import type { CandidateScoreResult } from "@/types";

function CandidatesDirectory() {
  const { screenings } = useScreeningStore();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState(
    searchParams.get("q") ?? ""
  );
  const [statusFilter, setStatusFilter] = React.useState("all");

  React.useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const allCandidates = React.useMemo(() => {
    const list: Array<{
      candidate: CandidateScoreResult;
      jobTitle: string;
      jobId: string;
    }> = [];
    screenings.forEach((s) => {
      s.candidates.forEach((c) => {
        list.push({ candidate: c, jobTitle: s.title, jobId: s.id });
      });
    });
    return list;
  }, [screenings]);

  const statusCounts = React.useMemo(
    () =>
      allCandidates.reduce<Record<string, number>>((acc, item) => {
        acc[item.candidate.status] = (acc[item.candidate.status] ?? 0) + 1;
        return acc;
      }, {}),
    [allCandidates]
  );

  const filtered = allCandidates.filter((item) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      item.candidate.candidateName.toLowerCase().includes(query) ||
      item.jobTitle.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" ||
      item.candidate.status === statusFilter ||
      item.candidate.decision === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Candidates"
        description="Global talent pool across active screenings and historical pipeline records."
        actions={
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nirman-text-muted"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search candidate or role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search candidates"
              className="h-9 w-full rounded-md border border-nirman-border bg-white pl-8 pr-3 text-xs text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/25"
            />
          </div>
        }
      />

      <SegmentedControl
        aria-label="Filter by recommendation"
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: "all", label: "All candidates", count: allCandidates.length },
          {
            value: "Strong Match",
            label: "Strong",
            count: statusCounts["Strong Match"] ?? 0,
          },
          { value: "Review", label: "Review", count: statusCounts["Review"] ?? 0 },
          {
            value: "Needs Verification",
            label: "Verify",
            count: statusCounts["Needs Verification"] ?? 0,
          },
        ]}
      />

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No candidates found"
            description="Try a different search term or clear the recommendation filter."
            className="rounded-none border-0 bg-transparent py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-nirman-border bg-[#FAFAF8] text-nirman-text-secondary">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Candidate
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Screening Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Match Score
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Experience
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Recommendation
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Decision
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {filtered.map(({ candidate, jobTitle, jobId }) => (
                  <tr
                    key={`${jobId}-${candidate.candidateId}`}
                    className="transition-colors hover:bg-nirman-bg/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={candidate.candidateName} size="sm" />
                        <div className="min-w-0">
                          <span className="block truncate font-semibold text-nirman-dark">
                            {candidate.candidateName}
                          </span>
                          <span className="block font-mono text-2xs text-nirman-text-muted">
                            {candidate.candidateId}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-nirman-text-primary">
                      {jobTitle}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreMeter score={candidate.totalScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-nirman-text-secondary">
                      {formatYears(candidate.calculatedExperienceYears)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={candidate.decision} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        variant="secondary"
                        size="sm"
                      >
                        View Details
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function CandidatesDirectoryPage() {
  return (
    <React.Suspense fallback={null}>
      <CandidatesDirectory />
    </React.Suspense>
  );
}
