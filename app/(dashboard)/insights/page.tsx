import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { SAMPLE_COMPANIES } from "@/lib/data/sample-data";
import { Building2, Clock, TrendingUp } from "lucide-react";

export default function CompanyIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Market"
        title="Company Intelligence"
        description="Observed job requirements, tech stack trends, and experience distributions across organizations."
      />

      <Callout tone="neutral">
        Data reflects{" "}
        <strong className="text-nirman-text-primary">
          observed job requirements
        </strong>{" "}
        aggregated from published specifications — not verified internal headcount
        or hiring records.
      </Callout>

      <div className="space-y-6">
        {SAMPLE_COMPANIES.map((company, idx) => (
          <Card key={idx}>
            <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-nirman-dark text-white">
                  <Building2 className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <CardTitle>{company.companyName}</CardTitle>
                  <span className="mt-0.5 block text-2xs text-nirman-text-muted">
                    {company.industry} · Target domain: {company.targetRole}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-2xs text-nirman-text-secondary">
                <span className="inline-flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  {company.rolesAnalyzedCount} specs
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {company.lastObservedDate}
                </span>
              </div>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Top observed skills
                </span>
                {company.topRequestedSkills.map((sk) => (
                  <div key={sk.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-nirman-text-primary">
                        {sk.name}
                      </span>
                      <span className="tabular-nums font-mono text-xs font-semibold text-nirman-dark">
                        {sk.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-nirman-border">
                      <div
                        className="h-full rounded-full bg-nirman-accent"
                        style={{ width: `${sk.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Experience level requirements
                </span>
                {company.experienceDistribution.map((exp) => (
                  <div
                    key={exp.range}
                    className="flex items-center justify-between rounded-lg border border-nirman-border bg-[#FAFAF8] px-3 py-2.5 text-xs"
                  >
                    <span className="font-medium text-nirman-dark">
                      {exp.range}
                    </span>
                    <span className="tabular-nums font-mono font-semibold text-nirman-dark">
                      {exp.percentage}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <span className="text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
                  Recent requirement changes
                </span>
                <ul className="space-y-2">
                  {company.recentRequirementChanges.map((change, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-lg border border-nirman-border bg-[#FAFAF8] px-3 py-2.5 text-2xs leading-relaxed text-nirman-text-secondary"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nirman-accent" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
