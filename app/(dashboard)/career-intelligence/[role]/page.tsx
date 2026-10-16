import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import { Compass } from "lucide-react";

export default function RoleDetailPage({ params }: { params: { role: string } }) {
  const roleData = SAMPLE_CAREER_ROLES[params.role];

  if (!roleData) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Career"
          title="Role not found"
          description="The requested role is not available in the sample dataset. Choose another role below."
        />
        <EmptyState
          icon={Compass}
          title="Unknown role"
          description="Select one of the available roles to view its market requirements."
          className="py-12"
        />
        <RoleSelector />
      </div>
    );
  }

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
        <RoleSelector activeRoleId={params.role} />
      </div>

      <MarketRequirementsView role={roleData} />
    </div>
  );
}
