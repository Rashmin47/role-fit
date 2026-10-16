import * as React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-nirman-accent-light text-nirman-accent",
  neutral: "bg-[#F2F4F7] text-nirman-text-secondary",
  dark: "bg-nirman-dark text-white",
  success: "bg-nirman-success-bg text-nirman-success-text",
} as const;

export interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  tone?: keyof typeof TONES;
  className?: string;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function Avatar({
  name,
  size = "md",
  tone = "neutral",
  className,
}: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        size === "sm" && "h-7 w-7 text-2xs",
        size === "md" && "h-9 w-9 text-xs",
        size === "lg" && "h-11 w-11 text-sm",
        TONES[tone],
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
