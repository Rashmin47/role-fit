import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const roleData = SAMPLE_CAREER_ROLES[role];

  if (!roleData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Role not found"
          description="The requested role is not in the sample dataset. Choose another role below."
        />
        <EmptyState
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
        title="Career intelligence"
        description="See which skills, experience levels, and technologies employers actually ask for. Sample dataset."
      />

      <div>
        <p className="mb-2 text-[13px] font-medium text-nirman-text-secondary">
          Target role
        </p>
        <RoleSelector activeRoleId={role} />
      </div>

      <MarketRequirementsView role={roleData} />
    </div>
  );
}
