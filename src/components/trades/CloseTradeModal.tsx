"use client";
import { useState } from "react";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OpenOperation {
  id: number;
  date: Date;
  quantity: number;
  price: number;
  amount: number;
  broker: string;
  days: number;
}

interface CloseTradeModalProps {
  symbol: string;
  closeQuantity: number;
  closePrice: number;
  closeDate: string;
  broker: string;
  openOperations: OpenOperation[];
  onConfirm: (openOperationId: number) => Promise<void>;
  onCancel: () => void;
}

export default function CloseTradeModal({
  symbol, closeQuantity, closePrice, closeDate,
  openOperations, onConfirm, onCancel,
}: CloseTradeModalProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await onConfirm(selectedId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200]">
      <div className="bg-zinc-900 rounded-lg w-full max-w-xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-widest text-white">
              Cerrar Trade — <span className="text-blue-400">{symbol}</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Vendés {closeQuantity} a ${closePrice} el {closeDate}
            </p>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
            Seleccioná la operación de apertura a cerrar:
          </p>

          {openOperations.map(op => {
            const projectedReturn = (closePrice - op.price) * closeQuantity;
            const projectedPct = op.price > 0 ? (projectedReturn / (op.price * closeQuantity)) * 100 : 0;
            const isPositive = projectedReturn >= 0;
            const isSelected = selectedId === op.id;

            return (
              <button
                key={op.id}
                onClick={() => setSelectedId(op.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  isSelected
                    ? "bg-blue-900/20 border-blue-500/40"
                    : "bg-zinc-800/50 border-white/5 hover:border-white/10 hover:bg-zinc-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase text-zinc-500">
                        {format(new Date(op.date), "dd/MM/yyyy", { locale: es })}
                      </span>
                      <span className="text-[11px] font-bold text-zinc-300">
                        {op.quantity} × ${op.price}
                      </span>
                      <span className="text-[10px] text-zinc-500">{op.broker}</span>
                      <span className="text-[10px] text-zinc-600">{op.days}d abierta</span>
                    </div>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[13px] font-black",
                    isPositive ? "text-emerald-400" : "text-red-400"
                  )}>
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>${Math.round(projectedReturn).toLocaleString()}</span>
                    <span className="text-[11px] font-bold opacity-70">({projectedPct.toFixed(1)}%)</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-white/10 text-zinc-400 hover:text-white rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || loading}
            className={cn(
              "flex-[2] py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all disabled:opacity-40",
              selectedId
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-zinc-700 text-zinc-500"
            )}
          >
            {loading ? "Cerrando..." : "Confirmar Cierre"}
          </button>
        </div>
      </div>
    </div>
  );
}
