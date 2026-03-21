"use client";

import { cn } from "@/lib/utils";

interface CalendarDay {
  date: Date;
  inRange: boolean;
  dayNum: number;
  pl: number;
  count: number;
}

interface CalendarGridProps {
  weeks: CalendarDay[][];
  totalPL: number;
  weekOffset?: number;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function CalendarGrid({ weeks, totalPL, weekOffset = 0 }: CalendarGridProps) {
  // Number only weeks that have at least one in-range day
  let weekCounter = weekOffset;
  const weekNums = weeks.map(week =>
    week.some(d => d.inRange) ? ++weekCounter : 0
  );

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* PL mensual — alineado a la derecha */}
      <div className="flex items-center justify-end gap-2 px-1">
        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">PL Mensual:</span>
        <span className={cn("text-xl font-black tabular-nums", totalPL > 0 ? "text-emerald-400" : totalPL < 0 ? "text-red-400" : "text-zinc-400")}>
          {totalPL >= 0 ? "+" : ""}${Math.round(totalPL).toLocaleString('es-AR')}
        </span>
      </div>

      <div className="bg-zinc-900/50 rounded-[8px] border border-white/10 overflow-hidden shadow-2xl">
        <table className="w-full border-collapse text-[11px] table-fixed">
          <colgroup>
            {DAY_LABELS.map((_, i) => <col key={i} style={{ width: '12.5%' }} />)}
            <col style={{ width: '12.5%' }} />
          </colgroup>
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              {DAY_LABELS.map(d => (
                <th key={d} className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 border-r border-white/5">
                  {d}
                </th>
              ))}
              <th className="py-2 px-2 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400 border-l border-white/10">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => {
              const weekPL = week.reduce((sum, d) => sum + (d.inRange ? d.pl : 0), 0);
              const weekCount = week.reduce((sum, d) => sum + (d.inRange ? d.count : 0), 0);
              const hasInRange = week.some(d => d.inRange);
              const weekNum = weekNums[wi];
              return (
                <tr key={wi} className="border-b border-white/5 last:border-b-0">
                  {week.map((day, di) => (
                    <td key={di} className={cn(
                      "py-2 px-2 align-top border-r border-white/5",
                      !day.inRange && "opacity-25 bg-zinc-950/30"
                    )}>
                      <div className="text-[11px] text-zinc-500 font-bold mb-1">{day.dayNum}</div>
                      {day.inRange ? (
                        <>
                          <div className={cn("text-[12px] font-black tabular-nums",
                            day.pl > 0 ? "text-emerald-400" : day.pl < 0 ? "text-red-400" : "text-zinc-500")}>
                            {day.pl >= 0 ? "+" : ""}${Math.round(day.pl).toLocaleString('es-AR')}
                          </div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">
                            {day.count} {day.count === 1 ? "trade" : "trades"}
                          </div>
                        </>
                      ) : null}
                    </td>
                  ))}
                  {/* Weekly total */}
                  <td className="py-2 px-2 align-top border-l border-white/10 bg-white/[0.02]">
                    <div className="text-[10px] text-zinc-500 font-bold mb-1">
                      {hasInRange ? `Sem. ${weekNum}` : ''}
                    </div>
                    <div className={cn("text-[12px] font-black tabular-nums",
                      weekPL > 0 ? "text-emerald-400" : weekPL < 0 ? "text-red-400" : "text-zinc-500")}>
                      {hasInRange ? `${weekPL >= 0 ? "+" : ""}$${Math.round(weekPL).toLocaleString('es-AR')}` : ''}
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{hasInRange ? `${weekCount} trades` : ''}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
