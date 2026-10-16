"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  value: string;
  label: React.ReactNode;
  count?: number;
}

export interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
  size = "md",
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-nirman-border bg-nirman-bg/70 p-0.5 no-scrollbar",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[7px] font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-2xs" : "px-3 py-1.5 text-xs",
              isActive
                ? "bg-white text-nirman-dark shadow-subtle"
                : "text-nirman-text-secondary hover:text-nirman-dark"
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "rounded px-1 py-px font-mono text-[10px] leading-none",
                  isActive
                    ? "bg-nirman-accent-light text-nirman-accent"
                    : "bg-black/[0.05] text-nirman-text-muted"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
