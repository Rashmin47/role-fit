"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { useScreeningStore } from "@/lib/store/screening-store";
import { formatYears } from "@/lib/utils";
import type { CandidateScoreResult } from "@/types";

function CandidatesDirectory({ initialQuery }: { initialQuery: string }) {
  const { screenings, isLoading, error } = useScreeningStore();
  const [searchTerm, setSearchTerm] = React.useState(initialQuery);
  const [statusFilter, setStatusFilter] = React.useState("all");

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
        title="Candidates"
        description="Every candidate across active screenings, with the evidence behind each score."
        actions={
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-nirman-text-muted"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search by name or role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search candidates"
              className="h-8 w-full rounded-md border border-nirman-border bg-white pl-8 pr-3 text-[13px] text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/20"
            />
          </div>
        }
      />

      <SegmentedControl
        aria-label="Filter by recommendation"
        value={statusFilter}
        onChange={setStatusFilter}
        size="sm"
        options={[
          { value: "all", label: "All", count: allCandidates.length },
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

      {error && (
        <Callout tone="danger" title="Could not load candidates">
          {error}
        </Callout>
      )}

      {isLoading ? (
        <Card className="p-10 text-center text-[13px] text-nirman-text-secondary">
          Loading persisted candidates…
        </Card>
      ) : (
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No candidates found"
            description="Try a different search term or clear the recommendation filter."
            className="rounded-none border-0 bg-transparent py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-nirman-border bg-nirman-inset text-nirman-text-secondary">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Candidate
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Screening
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Match
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Experience
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Recommendation
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Decision
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {filtered.map(({ candidate, jobTitle, jobId }) => (
                  <tr
                    key={`${jobId}-${candidate.candidateId}`}
                    className="transition-colors hover:bg-nirman-inset"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        className="font-medium text-nirman-dark hover:text-nirman-accent"
                      >
                        {candidate.candidateName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-nirman-text-secondary">{jobTitle}</td>
                    <td className="px-5 py-3">
                      <ScoreMeter score={candidate.totalScore} size="sm" />
                    </td>
                    <td className="px-5 py-3 tabular-nums text-nirman-text-secondary">
                      {formatYears(candidate.calculatedExperienceYears)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={candidate.decision} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ButtonLink
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                        variant="ghost"
                        size="sm"
                        className="text-nirman-accent hover:bg-nirman-accent-light"
                      >
                        Review
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </div>
  );
}

function CandidatesDirectoryWithParams() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  // Remount when the URL query changes so state is derived, not synced in an
  // effect. This also makes browser back/forward navigation behave correctly.
  return <CandidatesDirectory key={query} initialQuery={query} />;
}

export default function CandidatesDirectoryPage() {
  return (
    <React.Suspense fallback={null}>
      <CandidatesDirectoryWithParams />
    </React.Suspense>
  );
}
