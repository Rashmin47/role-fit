import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";

export default function CareerIntelligencePage() {
  const defaultRole = SAMPLE_CAREER_ROLES["python-backend-developer"];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Career"
        title="Career Intelligence"
        description="Understand what employers actually ask for across verified job market datasets."
      />

      <div>
        <p className="mb-2 block text-2xs font-semibold uppercase tracking-wide text-nirman-text-muted">
          Select a target engineering role
        </p>
        <RoleSelector activeRoleId="python-backend-developer" />
      </div>

      <MarketRequirementsView role={defaultRole} />
    </div>
  );
}
