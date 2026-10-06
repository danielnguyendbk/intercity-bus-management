import React from "react";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#172338] p-5 sm:p-6 transition-colors ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
