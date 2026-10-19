import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { Progress } from "@/components/ui/Input";
import { SAMPLE_COMPANIES } from "@/lib/data/sample-data";

export default function CompanyIntelligencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Company intelligence"
        description="Observed requirements, stack trends, and experience expectations across organizations."
      />

      <Callout tone="neutral">
        Based on published job specifications, not verified internal headcount or
        hiring records.
      </Callout>

      <div className="space-y-6">
        {SAMPLE_COMPANIES.map((company, idx) => (
          <Card key={idx}>
            <CardHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle>{company.companyName}</CardTitle>
                <p className="mt-0.5 text-[13px] text-nirman-text-secondary">
                  {company.industry} · {company.targetRole}
                </p>
              </div>
              <p className="shrink-0 text-xs text-nirman-text-muted">
                {company.rolesAnalyzedCount} specs · observed {company.lastObservedDate}
              </p>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-nirman-text-primary">
                  Top skills
                </h3>
                {company.topRequestedSkills.map((sk) => (
                  <div key={sk.name} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-nirman-text-primary">
                        {sk.name}
                      </span>
                      <span className="tabular-nums text-[13px] font-medium text-nirman-dark">
                        {sk.percentage}%
                      </span>
                    </div>
                    <Progress value={sk.percentage} max={100} size="sm" tone="accent" />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-nirman-text-primary">
                  Experience requirements
                </h3>
                <ul className="divide-y divide-nirman-border">
                  {company.experienceDistribution.map((exp) => (
                    <li
                      key={exp.range}
                      className="flex items-center justify-between gap-3 py-2 text-[13px]"
                    >
                      <span className="text-nirman-text-primary">{exp.range}</span>
                      <span className="tabular-nums font-medium text-nirman-dark">
                        {exp.percentage}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-nirman-text-primary">
                  Recent changes
                </h3>
                <ul className="space-y-2.5">
                  {company.recentRequirementChanges.map((change, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-[13px] leading-relaxed text-nirman-text-secondary"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-nirman-text-muted" />
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
