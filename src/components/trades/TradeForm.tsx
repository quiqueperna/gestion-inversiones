/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, TradeInput } from "@/lib/validations";
import { X, ClipboardPaste } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TradeFormProps {
  onClose: () => void;
  onSave: (data: TradeInput) => Promise<void>;
  initialData?: any;
}

export default function TradeForm({ onClose, onSave, initialData }: TradeFormProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      entryDate: new Date().toISOString().split("T")[0],
      broker: "AMR",
      type: "BUY",
      isClosed: false,
      isFalopa: false,
      shouldFollow: false,
      isIntra: false,
      ...initialData,
    },
  });

  const onSubmit: SubmitHandler<any> = async (data) => {
    await onSave(data as TradeInput);
  };

  const handlePasteProcess = () => {
    const parts = pasteText.split(/\s+|,|\t/);
    if (parts.length >= 4) {
      const symbol = parts[0].toUpperCase();
      const date = parts[1];
      const qty = parseFloat(parts[2]);
      const price = parseFloat(parts[3]);
      const broker = parts[4] || "AMR";

      if (date.includes("-") || date.includes("/")) {
          setValue("symbol", symbol);
          setValue("entryDate", date);
      } else {
          setValue("entryDate", parts[0]);
          setValue("symbol", parts[1].toUpperCase());
      }
      
      setValue("quantity", qty);
      setValue("entryPrice", price);
      setValue("broker", broker);
      setPasteMode(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-zinc-900 rounded-[8px] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-white">
            {initialData?.id ? "Editar Operación" : "Nueva Operación"}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => setPasteMode(!pasteMode)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Pegado Rápido</span>
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {pasteMode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Pegue el texto de la operación (Símbolo Fecha Cantidad Precio Broker)</p>
              <textarea 
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="NVDA 2026-03-10 10 800 AMR"
                className="w-full h-32 bg-zinc-950 border border-white/10 rounded-[6px] p-4 text-[14px] font-mono outline-none focus:border-blue-500/50"
              />
              <div className="flex gap-2">
                <button 
                    onClick={handlePasteProcess}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest"
                >
                    Procesar
                </button>
                <button 
                    onClick={() => setPasteMode(false)}
                    className="px-4 py-2 border border-white/10 text-zinc-400 hover:text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest"
                >
                    Cancelar
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Toggle BUY/SELL */}
              <div className="flex gap-2">
                {(["BUY", "SELL"] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setValue("type", t)}
                    className={cn(
                      "flex-1 py-2 rounded-[6px] text-[12px] font-black uppercase tracking-widest transition-all",
                      watch("type") === t
                        ? t === "BUY" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        : "border border-white/10 text-zinc-500 hover:text-zinc-300"
                    )}>
                    {t === "BUY" ? "▲ Compra" : "▼ Venta"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Símbolo</label>
                  <input 
                    {...register("symbol")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] font-bold uppercase focus:border-blue-500 outline-none transition-all" 
                    placeholder="NVDA" 
                  />
                  {errors.symbol && <p className="text-[10px] text-red-500">{(errors.symbol as any).message}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Fecha Entrada</label>
                  <input 
                    type="date"
                    {...register("entryDate")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Cantidad</label>
                  <input 
                    type="number"
                    step="any"
                    {...register("quantity", { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Precio Entrada</label>
                  <input 
                    type="number"
                    step="any"
                    {...register("entryPrice", { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Broker</label>
                  <select
                    {...register("broker")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="AMR">AMR</option>
                    <option value="IOL">IOL</option>
                    <option value="IBKR">IBKR</option>
                    <option value="PP">PP</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Estado</label>
                  <select 
                    {...register("isClosed", { 
                        setValueAs: (v) => v === "true" 
                    })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="false">Abierta</option>
                    <option value="true">Cerrada</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { id: "isFalopa", label: "Falopa" },
                    { id: "shouldFollow", label: "Seguir" },
                    { id: "isIntra", label: "Intra" }
                ].map((flag) => (
                    <label key={flag.id} className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-white/5 rounded-[6px] cursor-pointer hover:bg-zinc-950 transition-colors">
                        <input type="checkbox" {...register(flag.id as any)} className="w-4 h-4 rounded border-white/10 bg-zinc-900 text-blue-600" />
                        <span className="text-[11px] font-bold uppercase text-zinc-400">{flag.label}</span>
                    </label>
                ))}
              </div>

              <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-[8px] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Precio Salida</label>
                        <input 
                            type="number"
                            step="any"
                            {...register("exitPrice", { valueAsNumber: true })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-blue-500/20 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" 
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Fecha Salida</label>
                        <input 
                            type="date"
                            {...register("exitDate")}
                            className="w-full px-3 py-2 bg-zinc-950 border border-blue-500/20 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" 
                        />
                    </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-white/10 text-zinc-400 hover:text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? "Guardando..." : initialData?.id ? "Actualizar Operación" : "Guardar Operación"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
