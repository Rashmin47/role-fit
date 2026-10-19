import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "subtle"
  | "success";

export type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-nirman-accent text-white hover:bg-nirman-accent-hover",
  secondary:
    "bg-white text-nirman-text-primary border border-nirman-border hover:bg-nirman-bg hover:border-[#d6d6d3]",
  outline:
    "bg-transparent text-nirman-text-primary border border-nirman-border hover:bg-nirman-bg",
  ghost:
    "bg-transparent text-nirman-text-secondary hover:text-nirman-text-primary hover:bg-black/[0.045]",
  danger: "bg-nirman-danger text-white hover:bg-[#9f1f16]",
  subtle:
    "bg-nirman-accent-light text-nirman-accent hover:bg-nirman-accent-subtle",
  success: "bg-nirman-success text-white hover:bg-[#186340]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-sm gap-1.5",
  lg: "h-10 px-4 text-sm gap-2",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

const BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirman-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45";

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

/**
 * A navigation action styled exactly like `Button`. Use this instead of nesting
 * a `<Button>` inside a `<Link>` (which produces invalid button-in-anchor markup).
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
