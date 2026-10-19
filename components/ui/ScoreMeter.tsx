import * as React from "react";
import { cn } from "@/lib/utils";

export function scoreTone(score: number): "success" | "accent" | "warning" | "danger" {
  if (score >= 85) return "success";
  if (score >= 70) return "accent";
  if (score >= 55) return "warning";
  return "danger";
}

const TONE_TEXT = {
  success: "text-nirman-success-text",
  accent: "text-nirman-dark",
  warning: "text-nirman-warning-text",
  danger: "text-nirman-danger-text",
} as const;

const TONE_BG = {
  success: "bg-nirman-success",
  accent: "bg-nirman-accent",
  warning: "bg-nirman-warning",
  danger: "bg-nirman-danger",
} as const;

export interface ScoreMeterProps {
  /** Score on a 0–100 scale. */
  score: number;
  label?: string;
  className?: string;
  /** Show the numeric value next to the bar. */
  showValue?: boolean;
  size?: "sm" | "md";
}

/**
 * Consistent score representation used across tables and detail views:
 * a number paired with a proportional bar. Colour is reserved for the bar so
 * a column of scores stays calm.
 */
export function ScoreMeter({
  score,
  label,
  showValue = true,
  size = "md",
  className,
}: ScoreMeterProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {showValue && (
        <span
          className={cn(
            "tabular-nums text-[13px] font-semibold",
            TONE_TEXT[tone]
          )}
        >
          {Math.round(clamped)}%
        </span>
      )}
      {label && <span className="text-xs text-nirman-text-muted">{label}</span>}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-[#e6e6e4]",
          size === "sm" ? "h-1.5 w-12" : "h-1.5 w-16"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out-quint",
            TONE_BG[tone]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
