import { notFound } from "next/navigation";
import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";

export default function RoleDetailPage({ params }: { params: { role: string } }) {
  const roleData = SAMPLE_CAREER_ROLES[params.role];

  if (!roleData) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-nirman-dark">Role Not Found</h1>
        <p className="text-xs text-nirman-text-secondary">
          The requested role is not available in the sample dataset. Select another role:
        </p>
        <RoleSelector />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-nirman-dark">
          Career Intelligence
        </h1>
        <p className="text-xs text-nirman-text-secondary mt-1">
          Understand what employers are actually asking for across verified job market datasets.
        </p>
      </div>

      {/* Role Selection Grid */}
      <div>
        <label className="block text-xs font-semibold text-nirman-text-primary mb-2">
          Select Target Engineering Role:
        </label>
        <RoleSelector activeRoleId={params.role} />
      </div>

      {/* Role Intelligence View */}
      <MarketRequirementsView role={roleData} />
    </div>
  );
}
