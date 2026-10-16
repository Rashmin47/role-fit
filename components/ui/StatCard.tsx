import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "accent" | "success" | "warning" | "danger";

const TONE_VALUE: Record<StatTone, string> = {
  default: "text-nirman-dark",
  accent: "text-nirman-accent",
  success: "text-nirman-success-text",
  warning: "text-nirman-warning-text",
  danger: "text-nirman-danger-text",
};

const TONE_ICON: Record<StatTone, string> = {
  default: "bg-[#F2F4F7] text-nirman-text-secondary",
  accent: "bg-nirman-accent-light text-nirman-accent",
  success: "bg-nirman-success-bg text-nirman-success-text",
  warning: "bg-nirman-warning-bg text-nirman-warning-text",
  danger: "bg-nirman-danger-bg text-nirman-danger-text",
};

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  href?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trend,
  href,
  className,
}: StatCardProps) {
  const TrendIcon =
    trend?.direction === "up"
      ? ArrowUpRight
      : trend?.direction === "down"
      ? ArrowDownRight
      : Minus;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-2xs font-medium uppercase tracking-wide text-nirman-text-muted">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              TONE_ICON[tone]
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            "tabular-nums text-2xl font-semibold tracking-tight",
            TONE_VALUE[tone]
          )}
        >
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-2xs font-medium",
              trend.direction === "up"
                ? "text-nirman-success-text"
                : trend.direction === "down"
                ? "text-nirman-danger-text"
                : "text-nirman-text-muted"
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden />
            {trend.value}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1 text-2xs leading-relaxed text-nirman-text-secondary">
          {hint}
        </p>
      )}
    </>
  );

  const baseClass = cn(
    "rounded-xl border border-nirman-border bg-white p-4 shadow-card",
    href && "transition-all duration-200 hover:-translate-y-0.5 hover:border-nirman-accent/40 hover:shadow-raised",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseClass, "block")}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
