import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CalloutTone = "info" | "success" | "warning" | "danger" | "neutral";

const TONE_MAP: Record<
  CalloutTone,
  { wrap: string; icon: string; Icon: LucideIcon }
> = {
  info: {
    wrap: "bg-nirman-info-bg border-nirman-info-border text-nirman-info-text",
    icon: "text-nirman-info",
    Icon: Info,
  },
  success: {
    wrap: "bg-nirman-success-bg border-nirman-success-border text-nirman-success-text",
    icon: "text-nirman-success",
    Icon: CheckCircle2,
  },
  warning: {
    wrap: "bg-nirman-warning-bg border-nirman-warning-border text-nirman-warning-text",
    icon: "text-nirman-warning",
    Icon: AlertTriangle,
  },
  danger: {
    wrap: "bg-nirman-danger-bg border-nirman-danger-border text-nirman-danger-text",
    icon: "text-nirman-danger",
    Icon: AlertCircle,
  },
  neutral: {
    wrap: "bg-nirman-bg border-nirman-border text-nirman-text-secondary",
    icon: "text-nirman-text-muted",
    Icon: Info,
  },
};

export interface CalloutProps {
  tone?: CalloutTone;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
}

export function Callout({
  tone = "info",
  title,
  children,
  className,
  icon,
}: CalloutProps) {
  const { wrap, icon: iconClass, Icon } = TONE_MAP[tone];
  const ResolvedIcon = icon ?? Icon;

  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-xs leading-relaxed",
        wrap,
        className
      )}
    >
      <ResolvedIcon
        className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)}
        aria-hidden
      />
      <div className="min-w-0">
        {title && <span className="font-semibold">{title}</span>}
        <div className={cn(title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
