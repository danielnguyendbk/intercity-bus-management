import React from "react";
import { formatStatusLabel } from "../../utils/constants";

export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status?: string;
  variant?: BadgeVariant;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  isDark?: boolean;
}

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  SCHEDULED: "info",
  RUNNING: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
  DELAYED: "warning",
  AVAILABLE: "success",
  MAINTENANCE: "danger",
  BOOKED: "warning",
  HOLD: "warning",
  CONFIRMED: "success",
  PAID: "success",
  EXPIRED: "neutral",
  REFUNDED: "info",
  ACTIVE: "success",
  LOCKED: "warning",
  INACTIVE: "danger",
};

export default function StatusBadge({
  status,
  variant,
  label,
  size = "sm",
  className = "",
  isDark = true,
}: StatusBadgeProps) {
  const resolvedVariant: BadgeVariant =
    variant ?? (status ? STATUS_VARIANT_MAP[status] ?? "neutral" : "neutral");
  const displayLabel = label ?? (status ? formatStatusLabel(status) : "");

  // Adaptive styles for dark admin surfaces vs light customer surfaces
  const styleConfig: Record<
    BadgeVariant,
    { dark: string; light: string; dot: string }
  > = {
    success: {
      dark: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      light: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-400",
    },
    warning: {
      dark: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      light: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-400",
    },
    danger: {
      dark: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      light: "bg-rose-50 text-rose-700 border-rose-200",
      dot: "bg-rose-400",
    },
    info: {
      dark: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      light: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-400",
    },
    neutral: {
      dark: "bg-slate-500/15 text-slate-300 border-slate-500/30",
      light: "bg-slate-50 text-slate-600 border-slate-200",
      dot: "bg-slate-400",
    },
  };

  const currentTheme = isDark ? styleConfig[resolvedVariant].dark : styleConfig[resolvedVariant].light;
  const dotColor = styleConfig[resolvedVariant].dot;
  const sizeClass = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors ${sizeClass} ${currentTheme} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
      <span className="truncate">{displayLabel}</span>
    </span>
  );
}
