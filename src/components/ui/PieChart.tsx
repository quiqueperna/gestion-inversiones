"use client";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieSlice[];
  size?: number;
  title?: string;
}

export default function PieChart({ data, size = 110, title }: PieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return (
    <div className="flex flex-col items-center gap-2">
      {title && <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</p>}
      <p className="text-[11px] text-zinc-600">Sin datos</p>
    </div>
  );

  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  const toRad = (deg: number) => (deg - 90) * Math.PI / 180;

  let cumAngle = 0;
  const slices = data.map(d => {
    const angle = (d.value / total) * 360;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, startAngle: start, endAngle: cumAngle };
  });

  return (
    <div className="flex flex-col gap-3">
      {title && <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{title}</p>}
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
          {slices.map((s, i) => {
            const span = s.endAngle - s.startAngle;
            if (span < 0.1) return null;
            if (span >= 359.9) return <circle key={i} cx={cx} cy={cy} r={r} fill={s.color} />;
            const x1 = cx + r * Math.cos(toRad(s.startAngle));
            const y1 = cy + r * Math.sin(toRad(s.startAngle));
            const x2 = cx + r * Math.cos(toRad(s.endAngle));
            const y2 = cy + r * Math.sin(toRad(s.endAngle));
            const largeArc = span > 180 ? 1 : 0;
            const d = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
            return <path key={i} d={d} fill={s.color} stroke="#09090b" strokeWidth="2" />;
          })}
          <circle cx={cx} cy={cy} r={r * 0.42} fill="#18181b" />
        </svg>
        <div className="space-y-1.5 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] text-zinc-400 truncate">{s.label}</span>
              <span className="text-[11px] font-bold text-zinc-200 ml-auto pl-2 flex-shrink-0">
                {((s.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
