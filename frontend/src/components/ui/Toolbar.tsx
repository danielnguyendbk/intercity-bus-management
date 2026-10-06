import React from "react";
import { Search } from "lucide-react";

export interface ToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

export function Toolbar({ children, className = "" }: ToolbarProps) {
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-[#172338] p-3 sm:p-4 flex flex-wrap items-center gap-3 transition-colors ${className}`}
    >
      {children}
    </div>
  );
}

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Tìm kiếm...",
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <div
      className={`flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-[#101c2d] px-3 transition-colors focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 ${className}`}
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-0"
        {...props}
      />
    </div>
  );
}

export interface SelectInputProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

export function SelectInput({
  options,
  value,
  onChange,
  className = "",
  ...props
}: SelectInputProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={`h-10 rounded-lg border border-white/[0.08] bg-[#101c2d] px-3 pr-8 text-sm text-slate-200 transition-colors hover:border-white/[0.14] focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-[#101c2d] text-slate-200"
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Toolbar;
