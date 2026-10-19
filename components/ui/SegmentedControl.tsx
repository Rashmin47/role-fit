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
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-[#f1f1f0] p-0.5 no-scrollbar",
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
              "inline-flex shrink-0 items-center gap-1.5 rounded-[6px] font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
              isActive
                ? "bg-white text-nirman-dark shadow-subtle"
                : "text-nirman-text-secondary hover:text-nirman-dark"
            )}
          >
            {option.label}
            {typeof option.count === "number" && (
              <span
                className={cn(
                  "tabular-nums text-[12px] leading-none",
                  isActive ? "text-nirman-text-muted" : "text-nirman-text-muted"
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
