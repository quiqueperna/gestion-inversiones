"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CashFlowFormProps {
  onClose: () => void;
  onSave: (data: {
    date: string;
    amount: number;
    type: "DEPOSIT" | "WITHDRAWAL";
    broker: string;
    cuenta: string;
    description?: string;
  }) => Promise<void>;
  inline?: boolean;
}

const BROKERS = ["Schwab", "Binance", "Cocos", "Balanz", "AMR", "IOL", "IBKR", "PP"];
const CUENTAS = ["USA", "Argentina", "CRYPTO"];

export default function CashFlowForm({ onClose, onSave, inline = false }: CashFlowFormProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [broker, setBroker] = useState("AMR");
  const [cuenta, setCuenta] = useState("USA");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setLoading(true);
    try {
      await onSave({ date, amount: amt, type, broker, cuenta, description: description || undefined });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const inner = (
      <div className="bg-zinc-900 rounded-lg w-full max-w-md border border-white/10 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-white">
            Nuevo Ingreso / Egreso
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["DEPOSIT", "WITHDRAWAL"] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                  type === t
                    ? t === "DEPOSIT" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    : "border border-white/10 text-zinc-500 hover:text-zinc-300"
                )}>
                {t === "DEPOSIT" ? "▲ Ingreso" : "▼ Egreso"}
              </button>
            ))}
          </div>

          {/* Fecha y Monto */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-[13px] outline-none focus:border-blue-500 text-zinc-200" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Monto</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="10000" min="0" step="any"
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-[13px] outline-none focus:border-blue-500 text-zinc-200 placeholder:text-zinc-600" />
            </div>
          </div>

          {/* Broker y Cuenta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Broker</label>
              <select value={broker} onChange={e => setBroker(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-[13px] outline-none focus:border-blue-500 text-zinc-200 appearance-none">
                {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Cuenta</label>
              <select value={cuenta} onChange={e => setCuenta(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-[13px] outline-none focus:border-blue-500 text-zinc-200 appearance-none">
                {CUENTAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Descripción (opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Depósito inicial"
              className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-lg text-[13px] outline-none focus:border-blue-500 text-zinc-200 placeholder:text-zinc-600" />
          </div>

          {/* Acciones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-white/10 text-zinc-400 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:text-white transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !amount}
              className="flex-[2] py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all">
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
  );
  if (inline) return <div className="flex justify-center py-6">{inner}</div>;
  return <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">{inner}</div>;
}
