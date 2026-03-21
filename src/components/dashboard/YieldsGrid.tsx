"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface YieldCell {
    pl: number;
    pct: number;
    ie: number;
    count?: number;
}

interface YieldRow {
    month: string;
    [key: string]: YieldCell | string;
}

interface YieldTotals {
    [key: string]: { pl: number; ie: number };
}

interface YieldsGridProps {
    title: string;
    brokers: string[];
    rows: YieldRow[];
    totals: YieldTotals;
}

export default function YieldsGrid({ title, brokers, rows, totals }: YieldsGridProps) {
  // Add TOTAL to brokers list for display
  const displayColumns = [...brokers, 'TOTAL'];

  return (
    <div className="bg-zinc-900/50 rounded-[8px] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
                <tr className="bg-white/5 border-b border-white/10">
                    <th className="py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-r border-white/5 w-24 sticky left-0 bg-zinc-900 z-10">Periodo</th>
                    {displayColumns.map(col => (
                        <th key={col} colSpan={3} className={cn("py-2 px-4 text-center text-[10px] font-black uppercase tracking-widest border-r border-white/5 last:border-r-0", col === 'TOTAL' ? "text-white bg-white/5" : "text-blue-400")}>
                            {col}
                        </th>
                    ))}
                </tr>
                <tr className="bg-white/[0.02] border-b border-white/10 text-[9px] font-bold uppercase tracking-tighter text-zinc-500">
                    <th className="py-1 px-4 border-r border-white/5 sticky left-0 bg-zinc-900 z-10"></th>
                    {displayColumns.map(col => (
                        <React.Fragment key={col}>
                            <th className={cn("py-1 px-2 text-right", col === 'TOTAL' && "bg-white/[0.02]")}>PL USD</th>
                            <th className={cn("py-1 px-2 text-right", col === 'TOTAL' && "bg-white/[0.02]")}>PL %</th>
                            <th className={cn("py-1 px-2 text-right border-r border-white/5 last:border-r-0", col === 'TOTAL' && "bg-white/[0.02]")}>I/E</th>
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[12px] tabular-nums font-medium">
                {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors group h-8">
                        <td className="py-1 px-4 font-bold text-zinc-400 border-r border-white/5 text-[11px] sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors">{row.month}</td>
                        {displayColumns.map(col => {
                            const data = (row[col] as YieldCell | undefined) || { pl: 0, pct: 0, ie: 0 };
                            return (
                                <React.Fragment key={col}>
                                    <td className={cn("py-1 px-2 text-right font-bold", data.pl > 0 ? "text-emerald-400" : data.pl < 0 ? "text-red-400" : "text-zinc-600", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        ${Math.round(data.pl).toLocaleString()}
                                    </td>
                                    <td className={cn("py-1 px-2 text-right font-bold", data.pct > 0 ? "text-emerald-500" : data.pct < 0 ? "text-red-500" : "text-zinc-600", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.pct.toFixed(1)}%
                                    </td>
                                    <td className={cn("py-1 px-2 text-right font-medium border-r border-white/5 last:border-r-0", data.ie !== 0 ? "text-blue-400" : "text-zinc-700", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.ie !== 0 ? `$${Math.round(data.ie).toLocaleString()}` : '-'}
                                    </td>
                                </React.Fragment>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-white/5 border-t-2 border-white/10 text-[12px] font-black tabular-nums">
                <tr>
                    <td className="py-2 px-4 text-zinc-300 border-r border-white/5 sticky left-0 bg-zinc-800 z-10">TOTALES</td>
                    {displayColumns.map(col => {
                        const data = totals[col] || { pl: 0, ie: 0 };
                        // Totals don't have simplistic % usually, or we can assume weighted. Let's skip % for footer to be clean or calc globally
                        return (
                            <React.Fragment key={col}>
                                <td className={cn("py-2 px-2 text-right", data.pl >= 0 ? "text-emerald-400" : "text-red-400", col === 'TOTAL' && "bg-white/10")}>
                                    ${Math.round(data.pl).toLocaleString()}
                                </td>
                                <td className={cn("py-2 px-2 text-right text-zinc-500", col === 'TOTAL' && "bg-white/10")}>-</td>
                                <td className={cn("py-2 px-2 text-right border-r border-white/5 text-blue-400", col === 'TOTAL' && "bg-white/10")}>
                                    ${Math.round(data.ie).toLocaleString()}
                                </td>
                            </React.Fragment>
                        );
                    })}
                </tr>
            </tfoot>
        </table>
      </div>
    </div>
  );
}

