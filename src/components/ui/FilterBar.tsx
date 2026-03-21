"use client";
import { useState, useRef, useEffect } from "react";
import { Calendar, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type DateFilter = "hoy" | "semana" | "7dias" | "mes" | "mes_anterior" | "año" | "todo" | "custom";

interface FilterBarProps {
  dateFilter: DateFilter;
  onDateFilterChange: (f: DateFilter) => void;
  customRange: { start: string; end: string };
  onCustomRangeChange: (r: { start: string; end: string }) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  extraFilters?: React.ReactNode;
  hideSearch?: boolean;
}

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Esta semana" },
  { id: "7dias", label: "Últ. 7 días" },
  { id: "mes", label: "Este mes" },
  { id: "mes_anterior", label: "Mes anterior" },
  { id: "año", label: "Este año" },
  { id: "todo", label: "Todo" },
];

export default function FilterBar({
  dateFilter, onDateFilterChange,
  customRange, onCustomRangeChange,
  searchValue, onSearchChange,
  searchPlaceholder = "Buscar...",
  extraFilters,
  hideSearch = false,
}: FilterBarProps) {
  const [showCustom, setShowCustom] = useState(false);
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setShowCustom(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 bg-zinc-900/30 p-2 rounded-xl border border-white/5">
        <span className="flex items-center gap-1 px-2 text-[10px] font-bold uppercase text-zinc-600 tracking-widest">
          <Calendar className="w-3 h-3" /> Período
        </span>
        {DATE_OPTIONS.map(f => (
          <button key={f.id} onClick={() => { onDateFilterChange(f.id); setShowCustom(false); }}
            className={cn(
              "px-3 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all",
              dateFilter === f.id ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}>
            {f.label}
          </button>
        ))}

        {/* Personalizado with toggle dropdown */}
        <div className="relative" ref={customRef}>
          <button
            onClick={() => {
              if (dateFilter !== "custom") onDateFilterChange("custom");
              setShowCustom(v => !v);
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
              dateFilter === "custom" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}>
            Personalizado <ChevronDown className={cn("w-3 h-3 transition-transform", showCustom && "rotate-180")} />
          </button>
          {showCustom && (
            <div className="absolute top-full left-0 mt-2 p-4 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[200] w-72 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Desde
                </label>
                <input
                  type="date"
                  value={customRange.start}
                  onChange={e => onCustomRangeChange({ ...customRange, start: e.target.value })}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-blue-500 cursor-pointer transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Hasta
                </label>
                <input
                  type="date"
                  value={customRange.end}
                  onChange={e => onCustomRangeChange({ ...customRange, end: e.target.value })}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-zinc-200 outline-none focus:border-blue-500 cursor-pointer transition-colors"
                />
              </div>
              <button
                onClick={() => setShowCustom(false)}
                className="w-full bg-blue-600 hover:bg-blue-500 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all text-white">
                Aplicar
              </button>
            </div>
          )}
        </div>

        {extraFilters}
      </div>

      {!hideSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-600"
          />
        </div>
      )}
    </div>
  );
}
