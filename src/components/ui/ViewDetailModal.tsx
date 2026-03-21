"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewDetailModalProps {
  type: 'operation' | 'trade';
  data: Record<string, unknown>;
  onClose: () => void;
}

function Row({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <span className={cn("text-[13px] font-bold", color || "text-zinc-200")}>{value}</span>
    </div>
  );
}

export default function ViewDetailModal({ type, data, onClose }: ViewDetailModalProps) {
  const fmtDate = (v: unknown) => v ? new Date(v as Date).toLocaleDateString("es-AR") : "—";
  const fmtMoney = (v: unknown) => v != null ? `$${Math.round(Number(v)).toLocaleString()}` : "—";
  const fmtPrice = (v: unknown) => v != null ? `$${Number(v).toFixed(2)}` : "—";
  const fmtPct = (v: unknown) => v != null ? `${Number(v).toFixed(2)}%` : "—";

  const isOp = type === 'operation';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-zinc-900 rounded-[8px] w-full max-w-md border border-white/10 shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
            {isOp ? `Operación #${data.id}` : `Trade #${data.id}`}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-0.5">
          {isOp ? (
            <>
              <Row label="ID" value={String(data.id)} />
              <Row label="Fecha" value={fmtDate(data.date)} />
              <Row label="Símbolo" value={<span className="font-black text-white">{String(data.symbol)}</span>} />
              <Row label="Tipo" value={<span className={data.type === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{String(data.type)}</span>} />
              <Row label="Cantidad" value={String(data.quantity)} />
              <Row label="Precio" value={fmtPrice(data.price)} />
              <Row label="Monto" value={fmtMoney(data.amount)} />
              <Row label="Broker" value={String(data.broker || '—')} />
              <Row label="Cuenta" value={String(data.cuenta || '—')} />
              <Row label="Falopa" value={data.isFalopa ? 'Sí' : 'No'} color={data.isFalopa ? 'text-orange-400' : 'text-zinc-500'} />
              <Row label="Intra" value={data.isIntra ? 'Sí' : 'No'} color={data.isIntra ? 'text-purple-400' : 'text-zinc-500'} />
              <Row label="Estado" value={data.isClosed ? 'Cerrada' : 'Abierta'} color={data.isClosed ? 'text-zinc-400' : 'text-blue-400'} />
            </>
          ) : (
            <>
              <Row label="ID" value={String(data.id)} />
              <Row label="Símbolo" value={<span className="font-black text-white">{String(data.symbol)}</span>} />
              <Row label="Estado" value={data.isClosed ? 'Cerrado' : 'Abierto'} color={data.isClosed ? 'text-zinc-400' : 'text-blue-400'} />
              <Row label="F. Entrada" value={fmtDate(data.openDate)} />
              <Row label="P. Entrada" value={fmtPrice(data.openPrice)} />
              <Row label="M. Entrada" value={fmtMoney(data.openAmount)} />
              <Row label="F. Salida" value={fmtDate(data.closeDate)} />
              <Row label="P. Salida" value={fmtPrice(data.closePrice)} />
              <Row label="M. Salida" value={fmtMoney(data.closeAmount)} />
              <Row label="Cantidad" value={String(data.quantity)} />
              <Row label="Días" value={String(data.days)} />
              <Row label="Rdto $" value={fmtMoney(data.returnAmount)} color={Number(data.returnAmount) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <Row label="Rdto %" value={fmtPct(data.returnPercent)} color={Number(data.returnPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <Row label="TNA" value={fmtPct(data.tna)} />
              <Row label="Broker" value={String(data.broker || '—')} />
              <Row label="Cuenta" value={String(data.cuenta || '—')} />
              <Row label="Instrumento" value={String(data.instrumentType || '—')} />
            </>
          )}
        </div>
        <div className="p-4 border-t border-white/5">
          <button onClick={onClose} className="w-full py-2 border border-white/10 text-zinc-400 hover:text-white rounded-[6px] text-[11px] font-bold uppercase tracking-widest transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
