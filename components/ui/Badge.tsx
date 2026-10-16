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
  neutral: "bg-[#F2F4F7] text-nirman-text-secondary border border-[#E4E7EC]",
  success:
    "bg-nirman-success-bg text-nirman-success-text border border-nirman-success-border",
  warning:
    "bg-nirman-warning-bg text-nirman-warning-text border border-nirman-warning-border",
  danger:
    "bg-nirman-danger-bg text-nirman-danger-text border border-nirman-danger-border",
  info: "bg-nirman-info-bg text-nirman-info-text border border-nirman-info-border",
  accent:
    "bg-nirman-accent-light text-nirman-accent border border-nirman-accent-subtle",
  outline:
    "bg-transparent text-nirman-text-secondary border border-nirman-border",
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
  sm: "px-2 py-0.5 text-2xs leading-4 rounded-[5px] gap-1",
  md: "px-2.5 py-1 text-xs leading-4 rounded-md gap-1.5",
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
        "inline-flex items-center justify-center whitespace-nowrap font-medium",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        mono && "font-mono tracking-tight",
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
  "Strong Match": { variant: "success", label: "Strong Match" },
  Review: { variant: "warning", label: "Review" },
  "Needs Verification": { variant: "danger", label: "Needs Verification" },
};

const DECISION_STATUS_MAP: Record<
  string,
  { variant: NonNullable<BadgeProps["variant"]>; label: string }
> = {
  pending: { variant: "neutral", label: "Pending Review" },
  shortlisted: { variant: "success", label: "Shortlisted" },
  held: { variant: "warning", label: "On Hold" },
  not_recommended: { variant: "danger", label: "Not Recommended" },
};

export function StatusBadge({ status }: { status: string }) {
  const mapped = MATCH_STATUS_MAP[status] ?? DECISION_STATUS_MAP[status];
  if (mapped) {
    return (
      <Badge variant={mapped.variant} dot>
        {mapped.label}
      </Badge>
    );
  }
  return <Badge variant="neutral">{status}</Badge>;
}
