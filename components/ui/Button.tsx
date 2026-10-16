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
  primary:
    "bg-nirman-accent text-white border border-transparent shadow-subtle hover:bg-nirman-accent-hover active:bg-nirman-accent-hover",
  secondary:
    "bg-white text-nirman-text-primary border border-nirman-border shadow-subtle hover:bg-nirman-bg hover:border-nirman-text-muted/40",
  outline:
    "bg-transparent text-nirman-text-primary border border-nirman-border hover:bg-nirman-bg",
  ghost:
    "bg-transparent text-nirman-text-secondary hover:text-nirman-text-primary hover:bg-black/[0.04]",
  danger:
    "bg-nirman-danger text-white border border-transparent shadow-subtle hover:bg-red-700",
  subtle:
    "bg-nirman-accent-light text-nirman-accent border border-transparent hover:bg-nirman-accent-subtle",
  success:
    "bg-nirman-success text-white border border-transparent shadow-subtle hover:bg-[#116b4a]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

const BASE =
  "inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nirman-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

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
