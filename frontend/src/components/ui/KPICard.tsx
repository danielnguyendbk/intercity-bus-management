import React from "react";

export interface KPICardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  badge?: React.ReactNode;
  variant?: "emerald" | "blue" | "purple" | "amber" | "rose" | "slate";
  className?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  description,
  badge,
  variant = "emerald",
  className = "",
}: KPICardProps) {
  const iconVariants: Record<string, string> = {
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    purple: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    slate: "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };

  const iconClass = iconVariants[variant] || iconVariants.emerald;

  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#172338] p-4 flex items-center justify-between hover:border-white/[0.14] transition-colors min-h-[96px] ${className}`}
    >
      <div className="min-w-0 pr-2 flex-1">
        <span className="text-xs sm:text-sm font-medium text-slate-400 block leading-snug">
          {label}
        </span>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-white leading-none">
          {value}
        </p>
        {description && (
          <p className="mt-1.5 text-xs text-slate-400 truncate">
            {description}
          </p>
        )}
        {badge && <div className="mt-1.5">{badge}</div>}
      </div>

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

export default KPICard;
