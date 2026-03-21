"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownMultiCheckProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allLabel?: string;
}

export default function DropdownMultiCheck({ label, options, selected, onChange, allLabel = "Todos" }: DropdownMultiCheckProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleOption = (opt: string) => {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  };

  const isAllSelected = selected.length === 0;
  const displayLabel = isAllSelected ? allLabel : selected.length === 1 ? selected[0] : `${selected.length} sel.`;

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border",
          open || !isAllSelected
            ? "bg-blue-700/30 text-blue-300 border-blue-600/30"
            : "text-zinc-400 hover:bg-white/5 border-transparent"
        )}>
        <span className="text-[10px] uppercase text-zinc-500 font-bold mr-0.5">{label}</span>
        <span>{displayLabel}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.05] cursor-pointer border-b border-white/5"
            onClick={() => onChange([])}>
            <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
              isAllSelected ? "bg-blue-600 border-blue-600" : "border-zinc-600 bg-transparent")}>
              {isAllSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className="text-[11px] font-bold text-zinc-300">{allLabel}</span>
          </div>
          {options.map(opt => (
            <div key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.05] cursor-pointer"
              onClick={() => toggleOption(opt)}>
              <div className={cn("w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                selected.includes(opt) ? "bg-blue-600 border-blue-600" : "border-zinc-600 bg-transparent")}>
                {selected.includes(opt) && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-[11px] text-zinc-300">{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
