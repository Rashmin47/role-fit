"use client";

import * as React from "react";
import Link from "next/link";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import { cn } from "@/lib/utils";

interface RoleSelectorProps {
  activeRoleId?: string;
  onSelectRole?: (roleId: string) => void;
}

export function RoleSelector({ activeRoleId, onSelectRole }: RoleSelectorProps) {
  const roles = Object.values(SAMPLE_CAREER_ROLES);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {roles.map((role) => {
        const isSelected = activeRoleId === role.roleId;

        return (
          <Link
            key={role.roleId}
            href={`/career-intelligence/${role.roleId}`}
            onClick={() => onSelectRole?.(role.roleId)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "flex flex-col justify-between rounded-lg border bg-white px-4 py-3.5 transition-colors",
              isSelected
                ? "border-nirman-dark"
                : "border-nirman-border hover:border-[#d0d0cd]"
            )}
          >
            <span className="text-[13px] font-medium leading-snug text-nirman-dark">
              {role.roleTitle}
            </span>
            <span className="mt-2 text-xs text-nirman-text-muted">
              {role.totalPostingsAnalyzed} postings · updated {role.lastUpdated}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
