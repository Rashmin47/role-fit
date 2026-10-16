"use client";

import * as React from "react";
import Link from "next/link";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface RoleSelectorProps {
  activeRoleId?: string;
  onSelectRole?: (roleId: string) => void;
}

export function RoleSelector({ activeRoleId, onSelectRole }: RoleSelectorProps) {
  const roles = Object.values(SAMPLE_CAREER_ROLES);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {roles.map((role) => {
        const isSelected = activeRoleId === role.roleId;

        return (
          <Link
            key={role.roleId}
            href={`/career-intelligence/${role.roleId}`}
            onClick={() => onSelectRole?.(role.roleId)}
            aria-current={isSelected ? "true" : undefined}
            className={cn(
              "group flex flex-col rounded-xl border bg-white p-4 text-left transition-all duration-200",
              isSelected
                ? "border-nirman-accent ring-1 ring-nirman-accent shadow-card"
                : "border-nirman-border shadow-subtle hover:-translate-y-0.5 hover:border-nirman-accent/40 hover:shadow-raised"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-nirman-text-muted">
                {role.totalPostingsAnalyzed} postings
              </span>
              {isSelected ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-nirman-accent text-white">
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </span>
              ) : (
                <span className="h-4 w-4 rounded-full border border-nirman-border" />
              )}
            </div>

            <h3 className="text-xs font-semibold text-nirman-dark">
              {role.roleTitle}
            </h3>

            <div className="mt-2.5 flex flex-wrap gap-1">
              {role.skillPriorities.high.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded border border-nirman-border bg-nirman-bg px-1.5 py-0.5 text-[10px] text-nirman-text-secondary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
