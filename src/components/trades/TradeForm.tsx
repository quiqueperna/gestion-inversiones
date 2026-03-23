/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tradeSchema, TradeInput } from "@/lib/validations";
import { X, ClipboardPaste, Check } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface OpenExecution {
  id: number;
  date: Date;
  symbol: string;
  qty: number;
  price: number;
  broker: string;
  account?: string;
}

interface TradeFormProps {
  onClose: () => void;
  onSave: (data: TradeInput) => Promise<void>;
  onCloseExecution?: (entryExecId: number, qty?: number, price?: number, date?: string, account?: string, broker?: string) => Promise<void>;
  initialData?: any;
  inline?: boolean;
  openExecutions?: OpenExecution[];
  openTradeUnits?: any[];
  // Legacy prop compat
  openPositions?: OpenExecution[];
  onClosePosition?: (openOpId: number, quantity?: number, price?: number, date?: string) => Promise<void>;
  getOpenExecutionsForClosing?: (symbol: string, side: 'BUY' | 'SELL', account: string, broker: string) => Promise<any[]>;
  accounts?: Array<{ id: number; nombre: string; matchingStrategy?: string }>;
  brokers?: Array<{ id: number; nombre: string }>;
}

export default function TradeForm({ onClose, onSave, initialData, inline = false, openTradeUnits = [], onCloseExecution, getOpenExecutionsForClosing, accounts, brokers = [] }: TradeFormProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pendingClose, setPendingClose] = useState<{
    opId: number; tuId: number; qty: number; price: number; date: string;
    symbol: string; openDate: string; openPrice: number; broker: string; account: string;
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
      broker: brokers[0]?.nombre ?? "",
      account: accounts?.[0]?.nombre ?? "",
      side: "BUY",
      isClosed: false,
      currency: "USD",
      commissions: 0,
      ...initialData,
    },
  });

  const watchedSymbol = watch("symbol")?.toUpperCase() || "";
  const watchedSide = watch("side");
  const watchedBroker = watch("broker");
  const watchedAccount = watch("account");
  const watchedQty = watch("qty");
  const watchedPrice = watch("entryPrice");

  // Derive strategy from selected account
  const accountStrategy = useMemo(() => {
    const acc = accounts?.find(c => c.nombre === watchedAccount);
    return (acc?.matchingStrategy as 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL') ?? 'FIFO';
  }, [accounts, watchedAccount]);
  const isManualStrategy = accountStrategy === 'MANUAL';

  // Open Trade Units that match symbol / account / broker (opposite side), sorted newest first
  const matchingTUs = useMemo(() => {
    if (watchedSide !== "SELL" || !watchedSymbol) return [];
    return openTradeUnits
      .filter((tu: any) =>
        (tu.symbol ?? '').toUpperCase() === watchedSymbol &&
        tu.side === 'BUY' &&
        tu.broker === watchedBroker &&
        (tu.account || 'USA') === (watchedAccount || 'USA')
      )
      .sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
  }, [watchedSide, watchedSymbol, watchedBroker, watchedAccount, openTradeUnits]);

  // Strategy-sorted TUs with optional closeQty/PNL estimate (always shown, calculated when qty+price available)
  const strategySortedTUs = useMemo(() => {
    if (!matchingTUs.length || isManualStrategy) return [];
    const sorted = [...matchingTUs] as any[];
    if (accountStrategy === 'FIFO') {
      sorted.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    } else if (accountStrategy === 'LIFO') {
      sorted.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    } else if (accountStrategy === 'MAX_PROFIT') {
      sorted.sort((a, b) => (Number(watchedPrice) - b.entryPrice) / b.entryPrice - (Number(watchedPrice) - a.entryPrice) / a.entryPrice);
    } else if (accountStrategy === 'MIN_PROFIT') {
      sorted.sort((a, b) => (Number(watchedPrice) - a.entryPrice) / a.entryPrice - (Number(watchedPrice) - b.entryPrice) / b.entryPrice);
    }
    const totalQty = Number(watchedQty) || 0;
    let remaining = totalQty;
    return sorted.map((tu: any) => {
      const closeQty = totalQty > 0 && remaining > 0 ? Math.min(remaining, tu.qty) : null;
      if (closeQty) remaining -= closeQty;
      const pnlEst = (closeQty && watchedPrice) ? (Number(watchedPrice) - tu.entryPrice) * closeQty : null;
      return { tu, closeQty, pnlEst };
    });
  }, [matchingTUs, accountStrategy, isManualStrategy, watchedQty, watchedPrice]);

  const onSubmit: SubmitHandler<any> = async (data) => {
    const shouldAutoClose = watchedSide === 'SELL' && matchingTUs.length > 0 && !isManualStrategy;
    await onSave({
      ...data as TradeInput,
      pendingCloseOpId: isManualStrategy ? (pendingClose?.opId ?? null) : null,
      pendingCloseQty: isManualStrategy ? (pendingClose?.qty ?? null) : (shouldAutoClose ? Number(watchedQty) : null),
      pendingClosePrice: isManualStrategy ? (pendingClose?.price ?? null) : (shouldAutoClose ? Number(watchedPrice) : null),
      pendingCloseDate: isManualStrategy ? (pendingClose?.date ?? null) : (shouldAutoClose ? String(data.entryDate) : null),
      pendingCloseStrategy: isManualStrategy ? null : (shouldAutoClose ? accountStrategy : null),
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
      setValue("qty", qty);
      setValue("entryPrice", price);
      setValue("broker", broker);
      setPasteMode(false);
    }
  };

  const inner = (
    <div className="bg-zinc-900 rounded-[8px] w-full max-w-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-[12px] font-bold uppercase tracking-widest text-white">
            {initialData?.id ? "Editar Transacción" : "Nueva Transacción"}
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
              <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">Pegue el texto de la transacción (Símbolo Fecha Cantidad Precio Broker)</p>
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
                {(["BUY", "SELL"] as const).map(s => (
                  <button key={s} type="button"
                    onClick={() => setValue("side", s)}
                    className={cn(
                      "flex-1 py-2 rounded-[6px] text-[12px] font-black uppercase tracking-widest transition-all",
                      watch("side") === s
                        ? s === "BUY" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                        : "border border-white/10 text-zinc-500 hover:text-zinc-300"
                    )}>
                    {s === "BUY" ? "▲ Compra" : "▼ Venta"}
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
                  <input type="number" step="any" {...register("qty", { valueAsNumber: true })}
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
                    {brokers.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Cuenta</label>
                  <select {...register("account")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none">
                    {(accounts ?? []).map(c => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Moneda</label>
                  <select {...register("currency")}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none">
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Comisiones</label>
                  <input type="number" step="any" min="0" {...register("commissions", { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all"
                    placeholder="0.00" />
                </div>
              </div>

              {/* Panel de trades abiertos para cierre */}
              {matchingTUs.length > 0 && (
                <div className="rounded-[8px] border border-orange-500/20 bg-orange-500/5 overflow-hidden">
                  <div className="px-4 py-2 border-b border-orange-500/10 bg-orange-500/5 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400">
                      {isManualStrategy
                        ? `Trades abiertos de ${watchedSymbol} — seleccioná uno para cerrar`
                        : `Estrategia ${accountStrategy} — Trades que se cerrarán`}
                    </p>
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{accountStrategy}</span>
                  </div>

                  <table className="w-full border-collapse text-[12px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase text-zinc-500 border-b border-white/5">
                        <th className="py-1.5 px-3 text-left">ID</th>
                        <th className="py-1.5 px-3 text-left">F.Entrada</th>
                        <th className="py-1.5 px-3 text-right">Disponible</th>
                        <th className="py-1.5 px-3 text-right">P.Entrada</th>
                        <th className="py-1.5 px-3 text-right">M.Entrada</th>
                        {isManualStrategy && <th className="py-1.5 px-3"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {isManualStrategy
                        ? matchingTUs.map((tu: any) => (
                            <tr key={tu.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-1.5 px-3 text-zinc-500">#{tu.id}</td>
                              <td className="py-1.5 px-3 text-zinc-400">{format(new Date(tu.entryDate), 'dd/MM/yyyy')}</td>
                              <td className="py-1.5 px-3 text-right font-bold text-zinc-200">{tu.qty}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-400">{Number(tu.entryPrice).toFixed(2)}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-400">{Math.round(tu.entryAmount ?? 0).toLocaleString()}</td>
                              <td className="py-1.5 px-3 text-right">
                                {pendingClose?.tuId === tu.id ? (
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
                                      const qty = watch("qty");
                                      const price = watch("entryPrice");
                                      const date = watch("entryDate");
                                      if (!qty || Number(qty) <= 0 || !price || Number(price) <= 0 || !date) {
                                        setCloseWarning("Completá cantidad, precio y fecha antes de cerrar");
                                        return;
                                      }
                                      setCloseWarning(null);
                                      const rawDate = tu.entryDate;
                                      const openDateStr = rawDate instanceof Date
                                        ? rawDate.toISOString().slice(0, 10)
                                        : String(rawDate).slice(0, 10);
                                      setPendingClose({
                                        opId: tu.entryExecId ?? tu.id,
                                        tuId: tu.id,
                                        qty: Number(qty), price: Number(price), date: String(date),
                                        symbol: tu.symbol, openDate: openDateStr, openPrice: tu.entryPrice,
                                        broker: tu.broker, account: tu.account || 'USA',
                                      });
                                    }}
                                    className="px-3 py-1 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 text-orange-400 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                                    Cerrar
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        : strategySortedTUs.map(({ tu }) => (
                            <tr key={tu.id} className="hover:bg-white/[0.03] transition-colors">
                              <td className="py-1.5 px-3 text-zinc-500">#{tu.id}</td>
                              <td className="py-1.5 px-3 text-zinc-400">{format(new Date(tu.entryDate), 'dd/MM/yyyy')}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-300">{tu.qty}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-400">{Number(tu.entryPrice).toFixed(2)}</td>
                              <td className="py-1.5 px-3 text-right text-zinc-400">{Math.round(tu.entryAmount ?? 0).toLocaleString()}</td>
                            </tr>
                          ))
                      }
                    </tbody>
                  </table>

                  {!isManualStrategy && !strategySortedTUs.some(r => r.closeQty) && (
                    <div className="px-4 py-2 border-t border-orange-500/10 bg-blue-500/5 flex items-center gap-2">
                      <Check className="w-3 h-3 text-blue-400" />
                      <p className="text-[10px] text-blue-400">
                        Ingresá cantidad y precio para ver qué Trades se cerrarán (estrategia {accountStrategy})
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Panel de confirmación — estrategia auto (muestra trades afectados con cant. a cerrar) */}
              {!isManualStrategy && strategySortedTUs.some(r => r.closeQty) && (
                <div className="rounded-[8px] border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                  <div className="px-4 py-2 border-b border-blue-500/10 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                      Al guardar, se cerrarán estos Trades — estrategia {accountStrategy}
                    </p>
                  </div>
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr className="text-[9px] font-bold uppercase text-zinc-500 border-b border-white/5 bg-white/[0.02]">
                        <th className="py-1.5 px-3 text-right">ID</th>
                        <th className="py-1.5 px-3 text-center">F.Entrada</th>
                        <th className="py-1.5 px-3 text-right">Disponible</th>
                        <th className="py-1.5 px-3 text-right">Cant. a Cerrar</th>
                        <th className="py-1.5 px-3 text-right">P.Entrada</th>
                        <th className="py-1.5 px-3 text-right">P.Salida</th>
                        <th className="py-1.5 px-3 text-right">PNL Est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategySortedTUs.filter(r => r.closeQty).map(({ tu, closeQty, pnlEst }) => (
                        <tr key={tu.id} className={`border-b border-white/[0.03] ${pnlEst != null ? (pnlEst >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5') : ''}`}>
                          <td className="py-1.5 px-3 text-right text-zinc-500">#{tu.id}</td>
                          <td className="py-1.5 px-3 text-center text-zinc-400">{format(new Date(tu.entryDate), 'dd/MM/yyyy')}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-400">{tu.qty}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-white">{closeQty}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-400">{Number(tu.entryPrice).toFixed(2)}</td>
                          <td className="py-1.5 px-3 text-right text-zinc-300">{watchedPrice ? Number(watchedPrice).toFixed(2) : '—'}</td>
                          <td className={`py-1.5 px-3 text-right font-bold ${pnlEst != null ? (pnlEst >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}`}>
                            {pnlEst != null ? `${pnlEst >= 0 ? '+' : ''}${pnlEst.toFixed(2)}` : '—'}
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

              {pendingClose && isManualStrategy && (() => {
                const rdto = (pendingClose.price - pendingClose.openPrice) * pendingClose.qty;
                const montoSalida = pendingClose.price * pendingClose.qty;
                return (
                  <div className="rounded-[8px] border border-blue-500/20 bg-blue-500/5 overflow-hidden">
                    <div className="px-4 py-2 border-b border-blue-500/10 bg-blue-500/5 flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Al guardar, se cerrará este Trade</p>
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
                          <th className="py-1.5 px-3 text-right">PNL $</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-3 text-right text-zinc-500">#{pendingClose.tuId}</td>
                          <td className="py-2 px-3 text-center text-zinc-400">
                            {format(new Date(pendingClose.openDate + 'T12:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] font-black border border-white/10 text-zinc-200">{pendingClose.symbol}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-white">{pendingClose.qty}</td>
                          <td className="py-2 px-3 text-right text-zinc-400">${pendingClose.openPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold text-zinc-200">${pendingClose.price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-zinc-300">${Math.round(montoSalida).toLocaleString()}</td>
                          <td className="py-2 px-3 text-center text-zinc-400">
                            {format(new Date(pendingClose.date + 'T12:00:00'), 'dd/MM/yyyy')}
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
                  {isSubmitting ? "Guardando..." : initialData?.id ? "Actualizar" : "Guardar Transacción"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
  );

  void onCloseExecution;
  void getOpenExecutionsForClosing;

  if (inline) return <div className="flex justify-center py-6">{inner}</div>;
  return <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">{inner}</div>;
}
