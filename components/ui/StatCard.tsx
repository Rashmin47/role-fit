import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  href?: string;
  className?: string;
}

/**
 * A single metric. Flat by design: no icon chrome, no colour coding — the
 * number is the message and the surrounding layout provides emphasis.
 */
export function StatCard({
  label,
  value,
  hint,
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
      <span className="block text-[13px] font-medium text-nirman-text-secondary">
        {label}
      </span>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="tabular-nums text-2xl font-semibold text-nirman-dark">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium",
              trend.direction === "up"
                ? "text-nirman-success-text"
                : trend.direction === "down"
                ? "text-nirman-danger-text"
                : "text-nirman-text-muted"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            {trend.value}
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1 text-xs leading-relaxed text-nirman-text-muted">
          {hint}
        </p>
      )}
    </>
  );

  const baseClass = cn(
    "rounded-lg border border-nirman-border bg-white px-5 py-4",
    href && "block transition-colors hover:border-[#d6d6d3]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
