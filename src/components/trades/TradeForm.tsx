/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, TradeInput } from "@/lib/validations";
import { X, ClipboardPaste, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface OpenPosition {
  id: number;
  date: Date;
  symbol: string;
  quantity: number;
  openPrice: number;
  broker: string;
  cuenta?: string;
}

interface TradeFormProps {
  onClose: () => void;
  onSave: (data: TradeInput) => Promise<void>;
  onClosePosition?: (openOpId: number, quantity: number, price: number, date: string) => Promise<void>;
  initialData?: any;
  inline?: boolean;
  openPositions?: OpenPosition[];
}

export default function TradeForm({ onClose, onSave, initialData, inline = false, openPositions = [] }: TradeFormProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pendingClose, setPendingClose] = useState<{
    opId: number; qty: number; price: number; date: string;
    symbol: string; openDate: string; openPrice: number; broker: string; cuenta: string;
  } | null>(null);
  const [closeWarning, setCloseWarning] = useState<string | null>(null);

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
      broker: "Schwab",
      cuenta: "USA",
      type: "BUY",
      isClosed: false,
      isFalopa: false,
      shouldFollow: false,
      isIntra: false,
      ...initialData,
    },
  });

  const onSubmit: SubmitHandler<any> = async (data) => {
    await onSave({
      ...data as TradeInput,
      pendingCloseOpId: pendingClose?.opId ?? null,
      pendingCloseQty: pendingClose?.qty ?? null,
      pendingClosePrice: pendingClose?.price ?? null,
      pendingCloseDate: pendingClose?.date ?? null,
    } as any);
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

  const watchedSymbol = watch("symbol")?.toUpperCase() || "";
  const watchedType = watch("type");
  const watchedBroker = watch("broker");
  const watchedCuenta = watch("cuenta");

  // Show positions to close when symbol matches, broker+cuenta match, and type is opposite
  const matchingPositions = watchedType === "SELL" && watchedSymbol
    ? openPositions.filter(p =>
        p.symbol.toUpperCase() === watchedSymbol &&
        p.broker === watchedBroker &&
        (p.cuenta || 'USA') === (watchedCuenta || 'USA')
      )
    : [];

  const inner = (
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
                <button onClick={handlePasteProcess} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest">Procesar</button>
                <button onClick={() => setPasteMode(false)} className="px-4 py-2 border border-white/10 text-zinc-400 hover:text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest">Cancelar</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

              {/* Campos principales */}
              <div className="grid grid-cols-2 gap-4">
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
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Fecha</label>
                  <input type="date" {...register("entryDate")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Cantidad</label>
                  <input type="number" step="any" {...register("quantity", { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Precio</label>
                  <input type="number" step="any" {...register("entryPrice", { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Broker</label>
                  <select {...register("broker")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none">
                    {["Schwab","Binance","Cocos","Balanz","AMR","IOL","IBKR","PP"].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Cuenta</label>
                  <select {...register("cuenta")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none">
                    <option value="USA">USA</option>
                    <option value="Argentina">Argentina</option>
                    <option value="CRYPTO">CRYPTO</option>
                  </select>
                </div>
              </div>

              {/* Flags */}
              <div className="flex gap-3">
                {[{ id: "isFalopa", label: "Falopa" }, { id: "isIntra", label: "Intra" }].map(flag => (
                  <label key={flag.id} className="flex items-center gap-2 p-2 bg-zinc-950/50 border border-white/5 rounded-[6px] cursor-pointer hover:bg-zinc-950 transition-colors">
                    <input type="checkbox" {...register(flag.id as any)} className="w-4 h-4 rounded border-white/10 bg-zinc-900 text-blue-600" />
                    <span className="text-[11px] font-bold uppercase text-zinc-400">{flag.label}</span>
                  </label>
                ))}
              </div>

              {/* Panel de posiciones abiertas para cierre */}
              {matchingPositions.length > 0 && (
                <div className="rounded-[8px] border border-orange-500/20 bg-orange-500/5 overflow-hidden">
                  <div className="px-4 py-2 border-b border-orange-500/10 bg-orange-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                      Posiciones abiertas de {watchedSymbol} — seleccioná una para cerrar
                    </p>
                  </div>
                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase text-zinc-500 border-b border-white/5">
                        <th className="py-1.5 px-3 text-left">Fecha</th>
                        <th className="py-1.5 px-3 text-right">Cant.</th>
                        <th className="py-1.5 px-3 text-right">P.Entrada</th>
                        <th className="py-1.5 px-3 text-center">Broker</th>
                        <th className="py-1.5 px-3 text-center">Cuenta</th>
                        <th className="py-1.5 px-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {matchingPositions.map(pos => (
                        <tr key={pos.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-1.5 px-3 text-zinc-400">{new Date(pos.date).toLocaleDateString("es-AR")}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-zinc-200">{pos.quantity}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-400">${pos.openPrice.toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-center text-zinc-500">{pos.broker}</td>
                          <td className="py-1.5 px-3 text-center text-zinc-500">{pos.cuenta || 'USA'}</td>
                          <td className="py-1.5 px-3 text-right">
                            {pendingClose?.opId === pos.id ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-500/20 px-2 py-0.5 rounded">pendiente</span>
                                <button type="button" onClick={() => setPendingClose(null)}
                                  className="text-zinc-500 hover:text-red-400 transition-colors">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button type="button"
                                onClick={() => {
                                  const qty = watch("quantity");
                                  const price = watch("entryPrice");
                                  const date = watch("entryDate");
                                  if (!qty || Number(qty) <= 0 || !price || Number(price) <= 0 || !date) {
                                    setCloseWarning("Completá cantidad, precio y fecha antes de cerrar");
                                    return;
                                  }
                                  setCloseWarning(null);
                                  const rawDate = pos.date;
                                  const openDateStr = rawDate instanceof Date
                                    ? rawDate.toISOString().slice(0, 10)
                                    : String(rawDate).slice(0, 10);
                                  setPendingClose({
                                    opId: pos.id, qty: Number(qty), price: Number(price), date: String(date),
                                    symbol: pos.symbol, openDate: openDateStr, openPrice: pos.openPrice,
                                    broker: pos.broker, cuenta: pos.cuenta || 'USA',
                                  });
                                }}
                                className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 text-orange-400 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                                Cerrar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {closeWarning && (
                <div className="text-[11px] text-orange-400 bg-orange-900/20 border border-orange-500/20 rounded-lg px-3 py-2">
                  {closeWarning}
                </div>
              )}

              {pendingClose && (() => {
                const rdto = (pendingClose.price - pendingClose.openPrice) * pendingClose.qty;
                const montoSalida = pendingClose.price * pendingClose.qty;
                return (
                  <div className="rounded-[8px] border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                    <div className="px-4 py-2 border-b border-blue-500/10 bg-blue-500/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Al guardar, se cerrará este trade</p>
                    </div>
                    <table className="w-full border-collapse text-[11px]">
                      <thead>
                        <tr className="text-[9px] font-bold uppercase text-zinc-500 border-b border-white/5 bg-white/[0.02]">
                          <th className="py-1.5 px-3 text-right">ID</th>
                          <th className="py-1.5 px-3 text-center">F.Entrada</th>
                          <th className="py-1.5 px-3 text-left">Símbolo</th>
                          <th className="py-1.5 px-3 text-right">Cant.</th>
                          <th className="py-1.5 px-3 text-right">P.Entrada</th>
                          <th className="py-1.5 px-3 text-right">P.Salida</th>
                          <th className="py-1.5 px-3 text-right">M.Salida</th>
                          <th className="py-1.5 px-3 text-center">F.Salida</th>
                          <th className="py-1.5 px-3 text-right">Rdto $</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-3 text-right text-zinc-500">#{pendingClose.opId}</td>
                          <td className="py-2 px-3 text-center text-zinc-400">
                            {new Date(pendingClose.openDate + 'T12:00:00').toLocaleDateString("es-AR")}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-black border border-white/10 text-zinc-200">{pendingClose.symbol}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-white">{pendingClose.qty}</td>
                          <td className="py-2 px-3 text-right text-zinc-400">${pendingClose.openPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-zinc-200">${pendingClose.price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-zinc-300">${Math.round(montoSalida).toLocaleString()}</td>
                          <td className="py-2 px-3 text-center text-zinc-400">
                            {new Date(pendingClose.date + 'T12:00:00').toLocaleDateString("es-AR")}
                          </td>
                          <td className={cn("py-2 px-3 text-right font-black", rdto >= 0 ? "text-emerald-400" : "text-red-400")}>
                            {rdto >= 0 ? "+" : ""}${Math.round(rdto).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              <div className="flex gap-4 pt-2 border-t border-white/5">
                <button type="button" onClick={onClose}
                  className="flex-1 py-2.5 border border-white/10 text-zinc-400 hover:text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-[2] py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20 disabled:opacity-50 transition-all active:scale-[0.98]">
                  {isSubmitting ? "Guardando..." : initialData?.id ? "Actualizar" : "Guardar Operación"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
  );
  if (inline) return <div className="flex justify-center py-6">{inner}</div>;
  return <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">{inner}</div>;
}
