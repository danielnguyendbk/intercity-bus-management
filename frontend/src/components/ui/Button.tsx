import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold shadow-sm border border-emerald-500/40",
  secondary:
    "bg-[#1c2a42] hover:bg-[#202e48] text-slate-200 hover:text-white border border-white/[0.08] hover:border-white/[0.16] font-medium",
  danger:
    "bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-medium",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white border border-transparent font-medium",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 sm:h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-base gap-2.5 rounded-xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const variantClass = VARIANT_STYLES[variant];
  const sizeClass = SIZE_STYLES[size];

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "warning" | "info" | "danger" | "primary";
  size?: "sm" | "md";
  tooltip?: string;
}

export function IconButton({
  children,
  variant = "default",
  size = "md",
  tooltip,
  className = "",
  disabled,
  title,
  ...props
}: IconButtonProps) {
  const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  const variantStyles: Record<string, string> = {
    default:
      "text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] hover:border-white/[0.12]",
    primary:
      "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 hover:border-emerald-500/30",
    warning:
      "text-amber-400 hover:text-amber-300 hover:bg-amber-500/15 hover:border-amber-500/30",
    info:
      "text-blue-400 hover:text-blue-300 hover:bg-blue-500/15 hover:border-blue-500/30",
    danger:
      "text-slate-400 hover:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/30",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      title={title || tooltip}
      className={`inline-flex items-center justify-center rounded-lg border border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${sizeClass} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
