"use client";

import { cn } from "@/lib/utils";

interface YieldData {
    broker: string;
    monthlyData: {
        month: string;
        plUsd: number;
        plPercent: number;
        count: number;
    }[];
}

interface YieldsGridProps {
    data: YieldData[];
}

export default function YieldsGrid({ data }: YieldsGridProps) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  return (
    <div className="space-y-8 overflow-x-auto">
      {data.map((brokerGroup) => (
        <div key={brokerGroup.broker} className="bg-zinc-900/50 rounded-[8px] border border-white/10 overflow-hidden shadow-xl min-w-[1000px]">
          <div className="p-4 bg-zinc-900 border-b border-white/10">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue-400">
                Broker: {brokerGroup.broker}
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-white/10">
                <th className="py-2 px-4 border-r border-white/5">Métrica</th>
                {months.map(m => (
                  <th key={m} className="py-2 px-4 text-center">{m}</th>
                ))}
                <th className="py-2 px-4 text-center bg-blue-600/10 text-blue-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-[13px] tabular-nums">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-4 font-bold text-zinc-400 border-r border-white/5 uppercase text-[10px]">PL USD</td>
                {brokerGroup.monthlyData.map((m, i) => (
                  <td key={i} className={cn("py-2 px-4 text-center font-semibold", m.plUsd >= 0 ? "text-emerald-400" : "text-red-400")}>
                    ${m.plUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                ))}
                <td className="py-2 px-4 text-center font-black bg-blue-600/5 text-blue-400">
                    ${brokerGroup.monthlyData.reduce((acc, m) => acc + m.plUsd, 0).toLocaleString()}
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-4 font-bold text-zinc-400 border-r border-white/5 uppercase text-[10px]">PL %</td>
                {brokerGroup.monthlyData.map((m, i) => (
                  <td key={i} className={cn("py-2 px-4 text-center font-semibold", m.plPercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {m.plPercent.toFixed(1)}%
                  </td>
                ))}
                <td className="py-2 px-4 text-center font-black bg-blue-600/5 text-blue-400">
                    {(brokerGroup.monthlyData.reduce((acc, m) => acc + m.plPercent, 0) / 12).toFixed(1)}%
                </td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-4 font-bold text-zinc-400 border-r border-white/5 uppercase text-[10px]">Trades</td>
                {brokerGroup.monthlyData.map((m, i) => (
                  <td key={i} className="py-2 px-4 text-center text-zinc-500 font-medium">
                    {m.count}
                  </td>
                ))}
                <td className="py-2 px-4 text-center font-black bg-blue-600/5 text-blue-400">
                    {brokerGroup.monthlyData.reduce((acc, m) => acc + m.count, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
