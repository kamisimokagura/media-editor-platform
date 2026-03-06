"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { SpinnerGap } from "@phosphor-icons/react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-accent)] text-[var(--color-text-inverse)] hover:bg-[var(--color-accent-hover)] focus-visible:ring-[var(--color-accent)]",
  secondary:
    "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-accent-soft)] focus-visible:ring-[var(--color-accent)]",
  ghost:
    "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-soft)] focus-visible:ring-[var(--color-accent)]",
  danger:
    "bg-[var(--color-error)] text-white hover:opacity-90 focus-visible:ring-[var(--color-error)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium
          rounded-[var(--radius-md)] transition-all duration-150
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <SpinnerGap size={size === "lg" ? 22 : 18} className="animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
export type { ButtonProps };
