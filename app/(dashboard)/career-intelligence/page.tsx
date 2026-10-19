import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";

export default function CareerIntelligencePage() {
  const defaultRole = SAMPLE_CAREER_ROLES["python-backend-developer"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Career intelligence"
        description="See which skills, experience levels, and technologies employers actually ask for. Sample dataset."
      />

      <div>
        <p className="mb-2 text-[13px] font-medium text-nirman-text-secondary">
          Target role
        </p>
        <RoleSelector activeRoleId="python-backend-developer" />
      </div>

      <MarketRequirementsView role={defaultRole} />
    </div>
  );
}
