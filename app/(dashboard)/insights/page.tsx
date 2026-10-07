import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SAMPLE_COMPANIES } from "@/lib/data/sample-data";
import { Building2, TrendingUp, Calendar, AlertCircle } from "lucide-react";

export default function CompanyIntelligencePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
          Company Intelligence
        </h1>
        <p className="text-xs text-nirman-text-secondary mt-1">
          Observed job requirements, tech stack trends, and experience distributions across organizations.
        </p>
      </div>

      <div className="p-3 bg-nirman-bg border border-nirman-border rounded-md text-xs text-nirman-text-secondary flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-nirman-text-muted shrink-0" />
        <span>
          Data reflects <strong>observed job requirements</strong> aggregated from published specifications, not verified internal headcount or hiring records.
        </span>
      </div>

      {/* Companies Grid */}
      <div className="space-y-6">
        {SAMPLE_COMPANIES.map((company, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded bg-nirman-dark text-white flex items-center justify-center font-bold text-xs">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle>{company.companyName}</CardTitle>
                  <span className="text-xs text-nirman-text-muted">
                    {company.industry} • Target Domain: {company.targetRole}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-nirman-text-secondary font-mono">
                <span>{company.rolesAnalyzedCount} specs analyzed</span>
                <span>•</span>
                <span>Observed: {company.lastObservedDate}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Most Requested Skills */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-nirman-dark block">
                    Top Observed Skills:
                  </span>
                  <div className="space-y-2">
                    {company.topRequestedSkills.map((sk, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-nirman-text-primary font-medium">{sk.name}</span>
                          <span className="font-mono text-nirman-dark font-semibold">{sk.percentage}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-nirman-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-nirman-accent"
                            style={{ width: `${sk.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience Distribution */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-nirman-dark block">
                    Experience Level Requirements:
                  </span>
                  <div className="space-y-2">
                    {company.experienceDistribution.map((exp, i) => (
                      <div key={i} className="p-2.5 rounded bg-[#FAFAF8] border border-nirman-border flex items-center justify-between text-xs">
                        <span className="font-medium text-nirman-dark">{exp.range}</span>
                        <span className="font-mono font-semibold text-nirman-dark">{exp.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Requirement Changes */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-nirman-dark block">
                    Recent Requirement Changes:
                  </span>
                  <div className="space-y-2">
                    {company.recentRequirementChanges.map((change, i) => (
                      <div key={i} className="p-2.5 rounded bg-[#FAFAF8] border border-nirman-border text-xs text-nirman-text-secondary leading-relaxed">
                        • {change}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
