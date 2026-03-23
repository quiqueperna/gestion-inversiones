"use client";
import { X } from "lucide-react";
import { cn, getInstrumentType } from "@/lib/utils";

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
            {isOp ? `Transacción #${data.id}` : `Trade Unit #${data.id}`}
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
              <Row label="Lado" value={<span className={data.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{String(data.side ?? data.type ?? '—')}</span>} />
              <Row label="Cantidad" value={String(data.qty ?? data.quantity ?? '—')} />
              <Row label="Precio" value={fmtPrice(data.price)} />
              <Row label="Monto" value={fmtMoney(data.amount)} />
              <Row label="Broker" value={String(data.broker || '—')} />
              <Row label="Cuenta" value={String(data.account ?? data.cuenta ?? '—')} />
              <Row label="Moneda" value={String(data.currency || 'USD')} />
              <Row label="Comisiones" value={data.commissions ? fmtPrice(data.commissions) : '—'} />
              <Row label="Falopa" value={data.isFalopa ? 'Sí' : 'No'} color={data.isFalopa ? 'text-orange-400' : 'text-zinc-500'} />
              <Row label="Intra" value={data.isIntra ? 'Sí' : 'No'} color={data.isIntra ? 'text-purple-400' : 'text-zinc-500'} />
              <Row label="Estado" value={data.isClosed ? 'Cerrada' : 'Abierta'} color={data.isClosed ? 'text-zinc-400' : 'text-blue-400'} />
            </>
          ) : (
            <>
              <Row label="ID" value={String(data.id)} />
              <Row label="Símbolo" value={<span className="font-black text-white">{String(data.symbol)}</span>} />
              <Row label="Estado" value={data.status === 'CLOSED' ? 'Cerrado' : 'Abierto'} color={data.status === 'CLOSED' ? 'text-zinc-400' : 'text-blue-400'} />
              <Row label="Lado" value={<span className={data.side === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{String(data.side || 'BUY')}</span>} />
              <Row label="F. Entrada" value={fmtDate(data.entryDate)} />
              <Row label="P. Entrada" value={fmtPrice(data.entryPrice)} />
              <Row label="M. Entrada" value={fmtMoney(data.entryAmount)} />
              <Row label="F. Salida" value={fmtDate(data.exitDate)} />
              <Row label="P. Salida" value={fmtPrice(data.exitPrice)} />
              <Row label="M. Salida" value={fmtMoney(data.exitAmount)} />
              <Row label="Cantidad" value={String(data.qty ?? '—')} />
              <Row label="Días" value={String(data.days)} />
              <Row label="PNL $" value={fmtMoney(data.pnlNominal)} color={Number(data.pnlNominal) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <Row label="PNL %" value={fmtPct(data.pnlPercent)} color={Number(data.pnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
              <Row label="TNA" value={fmtPct(data.tna)} />
              <Row label="Broker" value={String(data.broker || '—')} />
              <Row label="Cuenta" value={String(data.account || '—')} />
              <Row label="Instrumento" value={data.symbol ? getInstrumentType(String(data.symbol)) : '—'} />
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
