import { RoleSelector } from "@/components/career/RoleSelector";
import { MarketRequirementsView } from "@/components/career/MarketRequirementsView";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";

export default function CareerIntelligencePage() {
  const defaultRole = SAMPLE_CAREER_ROLES["python-backend-developer"];

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
        <RoleSelector activeRoleId="python-backend-developer" />
      </div>

      {/* Default Role Intelligence View */}
      <MarketRequirementsView role={defaultRole} />
    </div>
  );
}
