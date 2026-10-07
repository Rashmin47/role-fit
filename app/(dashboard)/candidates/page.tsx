"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Filter, ChevronRight, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { useScreeningStore } from "@/lib/store/screening-store";
import { formatYears } from "@/lib/utils";

export default function CandidatesDirectoryPage() {
  const { screenings } = useScreeningStore();
  const [searchTerm, setSearchTerm] = React.useState("");

  const allCandidates = React.useMemo(() => {
    const list: Array<{ candidate: any; jobTitle: string; jobId: string }> = [];
    screenings.forEach((s) => {
      s.candidates.forEach((c) => {
        list.push({ candidate: c, jobTitle: s.title, jobId: s.id });
      });
    });
    return list;
  }, [screenings]);

  const filtered = allCandidates.filter((item) => {
    return (
      item.candidate.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.jobTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-nirman-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
            Candidates Directory
          </h1>
          <p className="text-xs text-nirman-text-secondary mt-1">
            Global talent pool across active screenings and historical pipeline records.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-nirman-text-muted" />
          <input
            type="text"
            placeholder="Search candidate name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full pl-8 pr-3 text-xs bg-white rounded-md border border-nirman-border focus:border-nirman-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Candidates List */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-nirman-border bg-[#FAFAF8] text-nirman-text-secondary font-medium">
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Screening Role</th>
                <th className="py-3 px-4">Deterministic Score</th>
                <th className="py-3 px-4">Experience</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nirman-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-nirman-text-muted">
                    No candidates found matching the query.
                  </td>
                </tr>
              ) : (
                filtered.map(({ candidate, jobTitle, jobId }) => (
                  <tr
                    key={`${jobId}-${candidate.candidateId}`}
                    className="hover:bg-nirman-bg/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-nirman-dark">
                      {candidate.candidateName}
                      <span className="block text-[10px] text-nirman-text-muted font-mono font-normal">
                        {candidate.candidateId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-nirman-text-primary">
                      {jobTitle}
                    </td>
                    <td className="py-3 px-4 font-semibold text-nirman-dark">
                      {Math.round(candidate.totalScore)}%
                    </td>
                    <td className="py-3 px-4 text-nirman-text-secondary">
                      {formatYears(candidate.calculatedExperienceYears)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={candidate.decision} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/recruitment/${jobId}/candidate/${candidate.candidateId}`}
                      >
                        <Button size="sm" variant="secondary">
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
