import React from "react";

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
  size = "md",
}: SegmentedControlProps<T>) {
  const heightClass = size === "sm" ? "h-9 p-0.5" : "h-10 p-1";
  const itemPadding = size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/[0.08] bg-[#101c2d] gap-1 ${heightClass} ${className}`}
      role="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const Icon = opt.icon;

        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap shrink-0 transition-all ${itemPadding} ${
              isActive
                ? "bg-[#172338] text-emerald-400 font-semibold border border-white/[0.08] shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[11px] font-semibold ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-white/[0.06] text-slate-400"
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
