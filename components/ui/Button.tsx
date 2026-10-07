import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirman-accent focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variantStyles = {
      primary:
        "bg-nirman-accent text-white hover:bg-nirman-accent-hover shadow-subtle border border-transparent",
      secondary:
        "bg-white text-nirman-dark border border-nirman-border hover:bg-nirman-bg shadow-subtle",
      outline:
        "bg-transparent text-nirman-text-primary border border-nirman-border hover:bg-nirman-bg",
      ghost:
        "bg-transparent text-nirman-text-secondary hover:text-nirman-text-primary hover:bg-black/5",
      danger:
        "bg-nirman-danger text-white hover:bg-red-700 shadow-subtle",
      subtle:
        "bg-nirman-accent-light text-nirman-accent hover:bg-nirman-accent-subtle",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
