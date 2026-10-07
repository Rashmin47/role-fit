import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "danger" | "accent" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    neutral:
      "bg-[#F2F4F7] text-nirman-text-secondary border border-[#E4E7EC]",
    success:
      "bg-nirman-success-bg text-nirman-success-text border border-nirman-success-border font-medium",
    warning:
      "bg-nirman-warning-bg text-nirman-warning-text border border-nirman-warning-border font-medium",
    danger:
      "bg-nirman-danger-bg text-nirman-danger-text border border-nirman-danger-border font-medium",
    accent:
      "bg-nirman-accent-light text-nirman-accent border border-nirman-accent-subtle font-medium",
    outline:
      "bg-transparent text-nirman-text-secondary border border-nirman-border",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] leading-tight rounded-[4px]",
    md: "px-2.5 py-1 text-xs leading-none rounded-md",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-normal whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "Strong Match":
      return <Badge variant="success">{status}</Badge>;
    case "Review":
      return <Badge variant="warning">{status}</Badge>;
    case "Needs Verification":
      return <Badge variant="danger">{status}</Badge>;
    case "shortlisted":
      return <Badge variant="success">Shortlisted</Badge>;
    case "held":
      return <Badge variant="neutral">On Hold</Badge>;
    case "not_recommended":
      return <Badge variant="danger">Not Recommended</Badge>;
    case "pending":
      return <Badge variant="outline">Pending Review</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
