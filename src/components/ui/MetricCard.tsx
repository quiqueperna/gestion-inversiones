"use client";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: "blue" | "emerald" | "orange" | "purple" | "red" | "zinc";
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
}

const accentMap = {
  blue:    { border: "border-t-blue-500",    text: "text-blue-400",    bg: "from-blue-900/10" },
  emerald: { border: "border-t-emerald-500", text: "text-emerald-400", bg: "from-emerald-900/10" },
  orange:  { border: "border-t-orange-500",  text: "text-orange-400",  bg: "from-orange-900/10" },
  purple:  { border: "border-t-purple-500",  text: "text-purple-400",  bg: "from-purple-900/10" },
  red:     { border: "border-t-red-500",     text: "text-red-400",     bg: "from-red-900/10" },
  zinc:    { border: "border-t-zinc-500",    text: "text-zinc-400",    bg: "from-zinc-900/10" },
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function MetricCard({ title, value, subtitle, accentColor = "blue", icon: Icon, trend }: MetricCardProps) {
  const accent = accentMap[accentColor];
  return (
    <div className={cn(
      "relative bg-gradient-to-br to-zinc-900/80 border border-white/5 border-t-2 rounded-lg p-4 overflow-hidden group hover:border-white/10 transition-all",
      accent.border, accent.bg
    )}>
      {Icon && <Icon className={cn("absolute -right-3 -bottom-3 w-20 h-20 opacity-[0.04] group-hover:opacity-[0.08] transition-opacity", accent.text)} />}
      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", accent.text)}>{title}</p>
      <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
      {subtitle && <p className="text-[10px] text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
