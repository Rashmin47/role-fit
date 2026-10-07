import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-nirman-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border border-nirman-border bg-white px-3 py-1.5 text-sm text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-1 focus:ring-nirman-accent disabled:cursor-not-allowed disabled:bg-nirman-bg/60 disabled:opacity-50",
            error && "border-nirman-danger focus:border-nirman-danger focus:ring-nirman-danger",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1 text-[11px] text-nirman-text-secondary">{helperText}</p>
        )}
        {error && (
          <p className="mt-1 text-[11px] text-nirman-danger">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, rows = 4, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-nirman-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          rows={rows}
          ref={ref}
          className={cn(
            "flex w-full rounded-md border border-nirman-border bg-white px-3 py-2 text-sm text-nirman-dark placeholder:text-nirman-text-muted transition-colors focus:border-nirman-accent focus:outline-none focus:ring-1 focus:ring-nirman-accent disabled:cursor-not-allowed disabled:bg-nirman-bg/60 disabled:opacity-50",
            error && "border-nirman-danger focus:border-nirman-danger focus:ring-nirman-danger",
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1 text-[11px] text-nirman-text-secondary">{helperText}</p>
        )}
        {error && (
          <p className="mt-1 text-[11px] text-nirman-danger">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export function Progress({
  value = 0,
  max = 100,
  className,
  indicatorClassName,
}: {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[#E5E7EB]",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          percentage >= 80 ? "bg-nirman-success" : percentage >= 60 ? "bg-nirman-accent" : "bg-nirman-warning",
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
