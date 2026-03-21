"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface YieldCell {
    balance: number;
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
    [key: string]: { balance: number; pl: number; ie: number };
}

interface YieldsGridProps {
    title: string;
    cuentas: string[];
    rows: YieldRow[];
    totals: YieldTotals;
    selectedCuentas?: string[];
}

export default function YieldsGrid({ title, cuentas, rows, totals, selectedCuentas }: YieldsGridProps) {
  const filteredCuentas = selectedCuentas && selectedCuentas.length > 0
    ? cuentas.filter(c => selectedCuentas.includes(c))
    : cuentas;
  const displayColumns = [...filteredCuentas, 'TOTAL'];
  const displayRows = [...rows].reverse();

  // Recompute per-row totals dynamically based on visible cuentas
  const getRowTotal = (row: YieldRow): YieldCell => {
    return filteredCuentas.reduce((acc, col) => {
      const d = (row[col] as YieldCell | undefined) || { balance: 0, pl: 0, pct: 0, ie: 0 };
      return { balance: acc.balance + d.balance, pl: acc.pl + d.pl, pct: 0, ie: acc.ie + d.ie };
    }, { balance: 0, pl: 0, pct: 0, ie: 0 } as YieldCell);
  };

  const recomputedTotals: Record<string, { balance: number; pl: number; ie: number }> = {
    ...totals,
    TOTAL: filteredCuentas.reduce((acc, col) => {
      const d = totals[col] || { balance: 0, pl: 0, ie: 0 };
      return { balance: acc.balance + d.balance, pl: acc.pl + d.pl, ie: acc.ie + d.ie };
    }, { balance: 0, pl: 0, ie: 0 }),
  };

  const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');

  return (
    <div className="bg-zinc-900/50 rounded-[8px] border border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
      <div className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {title}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px] table-fixed">
            <colgroup>
              <col style={{ width: '72px' }} />
              {displayColumns.flatMap((_, ci) =>
                [0,1,2,3].map(j => <col key={`${ci}-${j}`} />)
              )}
            </colgroup>
            <thead>
                <tr className="bg-white/5 border-b border-white/10">
                    <th className="py-1.5 px-3 text-[9px] font-bold uppercase tracking-widest text-zinc-500 border-r border-white/5 sticky left-0 bg-zinc-900 z-10">Mes</th>
                    {displayColumns.map(col => (
                        <th key={col} colSpan={4} className={cn("py-1.5 px-2 text-center text-[9px] font-black uppercase tracking-widest border-r border-white/5 last:border-r-0", col === 'TOTAL' ? "text-white bg-white/5" : "text-blue-400")}>
                            {col}
                        </th>
                    ))}
                </tr>
                <tr className="bg-white/[0.02] border-b border-white/10 text-[10px] font-bold uppercase tracking-tighter text-zinc-500">
                    <th className="py-1 px-3 border-r border-white/5 sticky left-0 bg-zinc-900 z-10"></th>
                    {displayColumns.map(col => (
                        <React.Fragment key={col}>
                            <th className={cn("py-1 px-1 text-right", col === 'TOTAL' && "bg-white/[0.02]")}>Balance</th>
                            <th className={cn("py-1 px-1 text-right", col === 'TOTAL' && "bg-white/[0.02]")}>PL $</th>
                            <th className={cn("py-1 px-1 text-right", col === 'TOTAL' && "bg-white/[0.02]")}>PL %</th>
                            <th className={cn("py-1 px-1 text-right border-r border-white/5 last:border-r-0", col === 'TOTAL' && "bg-white/[0.02]")}>I/E</th>
                        </React.Fragment>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5 tabular-nums font-medium">
                {displayRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.03] transition-colors group">
                        <td className="py-1 px-3 font-bold text-zinc-400 border-r border-white/5 text-[10px] sticky left-0 bg-zinc-900 group-hover:bg-zinc-800 transition-colors">{row.month}</td>
                        {displayColumns.map(col => {
                            const data = col === 'TOTAL'
                              ? getRowTotal(row)
                              : (row[col] as YieldCell | undefined) || { balance: 0, pl: 0, pct: 0, ie: 0 };
                            return (
                                <React.Fragment key={col}>
                                    <td className={cn("py-1 px-1 text-right text-[12px] text-zinc-500", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.balance > 0 ? fmt(data.balance) : <span className="text-zinc-700">0</span>}
                                    </td>
                                    <td className={cn("py-1 px-1 text-right text-[12px] font-bold", data.pl > 0 ? "text-emerald-400" : data.pl < 0 ? "text-red-400" : "text-zinc-700", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.pl !== 0 ? fmt(data.pl) : <span className="text-zinc-700">0</span>}
                                    </td>
                                    <td className={cn("py-1 px-1 text-right text-[12px] font-bold", data.pct > 0 ? "text-emerald-500" : data.pct < 0 ? "text-red-500" : "text-zinc-700", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.pct !== 0 ? `${data.pct.toFixed(1)}%` : <span className="text-zinc-700">0%</span>}
                                    </td>
                                    <td className={cn("py-1 px-1 text-right text-[12px] border-r border-white/5 last:border-r-0", data.ie !== 0 ? "text-blue-400" : "text-zinc-700", col === 'TOTAL' && "bg-white/[0.02]")}>
                                        {data.ie !== 0 ? fmt(data.ie) : <span className="text-zinc-700">0</span>}
                                    </td>
                                </React.Fragment>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
            <tfoot className="bg-white/5 border-t-2 border-white/10 font-black tabular-nums">
                <tr>
                    <td className="py-1.5 px-3 text-zinc-300 border-r border-white/5 sticky left-0 bg-zinc-800 z-10 text-[9px]">TOT.</td>
                    {displayColumns.map(col => {
                        const data = recomputedTotals[col] || { balance: 0, pl: 0, ie: 0 };
                        return (
                            <React.Fragment key={col}>
                                <td className={cn("py-1.5 px-1 text-right text-[12px] text-zinc-400", col === 'TOTAL' && "bg-white/10")}>
                                    {data.balance > 0 ? fmt(data.balance) : <span className="text-zinc-600">0</span>}
                                </td>
                                <td className={cn("py-1.5 px-1 text-right text-[12px]", data.pl > 0 ? "text-emerald-400" : data.pl < 0 ? "text-red-400" : "text-zinc-600", col === 'TOTAL' && "bg-white/10")}>
                                    {data.pl !== 0 ? fmt(data.pl) : <span className="text-zinc-600">0</span>}
                                </td>
                                <td className={cn("py-1.5 px-1 text-right text-[12px] text-zinc-600", col === 'TOTAL' && "bg-white/10")}>0%</td>
                                <td className={cn("py-1.5 px-1 text-right text-[12px] border-r border-white/5", data.ie !== 0 ? "text-blue-400" : "text-zinc-600", col === 'TOTAL' && "bg-white/10")}>
                                    {data.ie !== 0 ? fmt(data.ie) : <span className="text-zinc-600">0</span>}
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
