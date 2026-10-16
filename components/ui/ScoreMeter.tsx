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
  accent: "text-nirman-accent",
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
 * a bold number coloured by band, paired with a proportional bar.
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
    <div className={cn("flex items-center gap-2", className)}>
      {showValue && (
        <span
          className={cn(
            "tabular-nums font-semibold",
            size === "sm" ? "text-xs" : "text-sm",
            TONE_TEXT[tone]
          )}
        >
          {Math.round(clamped)}%
        </span>
      )}
      {label && (
        <span className="text-2xs text-nirman-text-muted">{label}</span>
      )}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-nirman-border",
          size === "sm" ? "h-1.5 w-14" : "h-2 w-20"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out-quint", TONE_BG[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
