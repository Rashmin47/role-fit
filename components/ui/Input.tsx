import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const LABEL_CLASS =
  "block text-xs font-medium text-nirman-text-primary mb-1.5";
const FIELD_CLASS =
  "flex w-full rounded-md border border-nirman-border bg-white px-3 text-sm text-nirman-dark shadow-subtle placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-2 focus:ring-nirman-accent/25 disabled:cursor-not-allowed disabled:bg-nirman-bg/60 disabled:opacity-60";
const ERROR_FIELD_CLASS =
  "border-nirman-danger focus:border-nirman-danger focus:ring-nirman-danger/25";

function FieldFooter({
  error,
  helperText,
}: {
  error?: string;
  helperText?: string;
}) {
  if (error) {
    return <p className="mt-1 text-2xs text-nirman-danger">{error}</p>;
  }
  if (helperText) {
    return (
      <p className="mt-1 text-2xs text-nirman-text-secondary">{helperText}</p>
    );
  }
  return null;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, ...props }, ref) => {
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={LABEL_CLASS}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            FIELD_CLASS,
            "h-9 py-1.5",
            error && ERROR_FIELD_CLASS,
            className
          )}
          {...props}
        />
        <FieldFooter error={error} helperText={helperText} />
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, helperText, id, rows = 4, ...props },
    ref
  ) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className={LABEL_CLASS}>
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          rows={rows}
          ref={ref}
          className={cn(
            FIELD_CLASS,
            "py-2 leading-relaxed",
            error && ERROR_FIELD_CLASS,
            className
          )}
          {...props}
        />
        <FieldFooter error={error} helperText={helperText} />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, id, children, ...props }, ref) => {
    const selectId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className={LABEL_CLASS}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              FIELD_CLASS,
              "h-9 cursor-pointer appearance-none py-1.5 pr-9",
              error && ERROR_FIELD_CLASS,
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nirman-text-muted"
            aria-hidden
          />
        </div>
        <FieldFooter error={error} helperText={helperText} />
      </div>
    );
  }
);
Select.displayName = "Select";

export function Progress({
  value = 0,
  max = 100,
  tone = "auto",
  size = "md",
  className,
  indicatorClassName,
}: {
  value?: number;
  max?: number;
  tone?: "auto" | "accent" | "success" | "warning" | "danger" | "neutral";
  size?: "sm" | "md";
  className?: string;
  indicatorClassName?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const resolvedTone =
    tone === "auto"
      ? percentage >= 80
        ? "success"
        : percentage >= 60
        ? "accent"
        : "warning"
      : tone;

  const toneClass = {
    accent: "bg-nirman-accent",
    success: "bg-nirman-success",
    warning: "bg-nirman-warning",
    danger: "bg-nirman-danger",
    neutral: "bg-nirman-text-secondary",
  }[resolvedTone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-nirman-border",
        size === "sm" ? "h-1.5" : "h-2",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out-quint",
          toneClass,
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
