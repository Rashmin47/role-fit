"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Input";
import { useScreeningStore } from "@/lib/store/screening-store";

const STATUS_META = {
  ready: { label: "Active", variant: "success" as const },
  draft: { label: "Draft", variant: "neutral" as const },
  extracting: { label: "Extracting", variant: "warning" as const },
  completed: { label: "Completed", variant: "info" as const },
};

export default function RecruitmentWorkspacePage() {
  const { screenings } = useScreeningStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment"
        description="Screen candidates against a role with deterministic scores and cited evidence."
        actions={
          <ButtonLink href="/recruitment/new" size="sm">
            <Plus className="h-4 w-4" />
            New screening
          </ButtonLink>
        }
      />

      {screenings.length === 0 ? (
        <EmptyState
          title="No screenings yet"
          description="Create your first screening to extract requirements and score candidates against them."
          action={
            <ButtonLink href="/recruitment/new" size="sm">
              <Plus className="h-4 w-4" />
              New screening
            </ButtonLink>
          }
          className="py-20"
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-nirman-border bg-nirman-inset text-nirman-text-secondary">
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Candidates
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Shortlisted
                  </th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    Pending
                  </th>
                  <th scope="col" className="w-44 px-5 py-2.5 font-medium">
                    Review progress
                  </th>
                  <th scope="col" className="w-10 px-3 py-2.5">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nirman-border">
                {screenings.map((screening) => {
                  const pending = screening.candidates.filter(
                    (c) => c.decision === "pending"
                  ).length;
                  const reviewPct = Math.round(
                    (screening.reviewedCount / (screening.candidateCount || 1)) * 100
                  );
                  const status = STATUS_META[screening.status];

                  return (
                    <tr
                      key={screening.id}
                      className="group transition-colors hover:bg-nirman-inset"
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/recruitment/${screening.id}`}
                          className="block min-w-0"
                        >
                          <span className="block truncate font-medium text-nirman-dark">
                            {screening.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-nirman-text-muted">
                            {screening.department} · {screening.location}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-nirman-text-primary">
                        {screening.candidateCount}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-nirman-text-primary">
                        {screening.shortlistedCount}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-nirman-text-primary">
                        {pending}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Progress value={reviewPct} max={100} size="sm" tone="neutral" />
                          <span className="w-8 shrink-0 text-right tabular-nums text-xs text-nirman-text-muted">
                            {reviewPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Link
                          href={`/recruitment/${screening.id}`}
                          aria-label={`Open ${screening.title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-nirman-text-muted transition-colors hover:bg-black/[0.05] hover:text-nirman-dark"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
