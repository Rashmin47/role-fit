import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "accent"
    | "outline";
  size?: "sm" | "md";
  /** Render a small leading status dot. */
  dot?: boolean;
  mono?: boolean;
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-[#f2f2f1] text-nirman-text-secondary",
  success: "bg-nirman-success-bg text-nirman-success-text",
  warning: "bg-nirman-warning-bg text-nirman-warning-text",
  danger: "bg-nirman-danger-bg text-nirman-danger-text",
  info: "bg-nirman-info-bg text-nirman-info-text",
  accent: "bg-nirman-accent-light text-nirman-accent",
  outline: "bg-transparent text-nirman-text-secondary border border-nirman-border",
};

const DOT_STYLES: Record<NonNullable<BadgeProps["variant"]>, string> = {
  neutral: "bg-nirman-text-muted",
  success: "bg-nirman-success",
  warning: "bg-nirman-warning",
  danger: "bg-nirman-danger",
  info: "bg-nirman-info",
  accent: "bg-nirman-accent",
  outline: "bg-nirman-text-muted",
};

const SIZE_STYLES: Record<NonNullable<BadgeProps["size"]>, string> = {
  sm: "px-1.5 py-0.5 text-[12px] leading-4 gap-1",
  md: "px-2 py-0.5 text-xs leading-5 gap-1.5",
};

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  mono = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        mono && "font-mono",
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_STYLES[variant])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

const MATCH_STATUS_MAP: Record<
  string,
  { variant: NonNullable<BadgeProps["variant"]>; label: string }
> = {
  "Strong Match": { variant: "success", label: "Strong match" },
  Review: { variant: "warning", label: "Review" },
  "Needs Verification": { variant: "danger", label: "Needs verification" },
};

const DECISION_STATUS_MAP: Record<
  string,
  { variant: NonNullable<BadgeProps["variant"]>; label: string }
> = {
  pending: { variant: "neutral", label: "Pending" },
  shortlisted: { variant: "success", label: "Shortlisted" },
  held: { variant: "warning", label: "On hold" },
  not_recommended: { variant: "danger", label: "Not recommended" },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = MATCH_STATUS_MAP[status] ?? DECISION_STATUS_MAP[status];
  if (mapped) {
    return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
  }
  return <Badge variant="neutral">{status}</Badge>;
}
