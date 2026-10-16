import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-nirman-border bg-nirman-bg/40 px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-nirman-border bg-white text-nirman-text-muted shadow-subtle">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      )}
      <h3 className="text-sm font-semibold text-nirman-dark">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-nirman-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
