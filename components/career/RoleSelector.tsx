"use client";

import * as React from "react";
import Link from "next/link";
import { CareerRoleIntelligence } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SAMPLE_CAREER_ROLES } from "@/lib/data/sample-data";
import {
  Compass,
  ArrowRight,
  TrendingUp,
  Database,
  Layers,
  Code,
  Shield,
  BarChart3,
} from "lucide-react";

interface RoleSelectorProps {
  activeRoleId?: string;
  onSelectRole?: (roleId: string) => void;
}

export function RoleSelector({ activeRoleId, onSelectRole }: RoleSelectorProps) {
  const roles = Object.values(SAMPLE_CAREER_ROLES);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {roles.map((role) => {
        const isSelected = activeRoleId === role.roleId;

        return (
          <Link
            key={role.roleId}
            href={`/career-intelligence/${role.roleId}`}
            className={`block p-4 rounded-lg border text-left transition-all ${
              isSelected
                ? "bg-white border-nirman-accent ring-1 ring-nirman-accent shadow-card"
                : "bg-white border-nirman-border hover:border-nirman-accent/40 shadow-subtle hover:bg-nirman-bg/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-nirman-text-muted">
                {role.totalPostingsAnalyzed} postings
              </span>
              {isSelected && (
                <span className="h-2 w-2 rounded-full bg-nirman-accent" />
              )}
            </div>

            <h3 className="font-semibold text-xs text-nirman-dark mb-1">
              {role.roleTitle}
            </h3>

            <div className="flex flex-wrap gap-1 mt-2.5">
              {role.skillPriorities.high.slice(0, 3).map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-nirman-bg text-nirman-text-secondary border border-nirman-border"
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
