/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from "react";
import { SearchIcon, Plus, LayoutDashboard, Loader2, ArrowRightLeft, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import YieldsGrid from "@/components/dashboard/YieldsGrid";
import { loadCsvData } from "@/lib/data-loader";

export default function Home() {
  const [view, setView] = useState<"operations" | "trades" | "dashboard">("trades");
  const [operations, setOperations] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [showTradeModal, setShowTradeModal] = useState(false);

  useEffect(() => {
    async function init() {
        setLoading(true);
        try {
            const res = await fetch('/data/initial_operations.csv');
            const csvText = await res.text();
            const state = loadCsvData(csvText);
            setOperations(state.operations);
            setTrades(state.trades);
        } catch (e) {
            console.error("Failed to load initial data", e);
        } finally {
            setLoading(false);
        }
    }
    init();
  }, []);

  const filteredData = useMemo(() => {
    const source = view === 'operations' ? operations : trades;
    return source.filter(item => {
      if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [view, operations, trades, searchQuery]);

  return (
    <main className="min-h-screen p-6 max-w-[1600px] mx-auto space-y-6 font-sans antialiased bg-[#09090b] text-white">
      
      {/* Header & View Switcher */}
      <div className="flex justify-between items-center">
        <div className="flex bg-zinc-900 p-1 rounded-[8px] border border-white/5">
            <button 
                onClick={() => setView("operations")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all",
                    view === "operations" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Operaciones</span>
            </button>
            <button 
                onClick={() => setView("trades")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all",
                    view === "trades" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                <TrendingUp className="w-4 h-4" />
                <span>Trades</span>
            </button>
            <button 
                onClick={() => setView("dashboard")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all",
                    view === "dashboard" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
            </button>
        </div>
        
        <button 
            onClick={() => setShowTradeModal(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-[6px] text-[14px] font-bold shadow-lg active:scale-95 transition-all"
        >
            <Plus className="w-4 h-4" />
            <span>Nueva Operación</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-500">Cargando modo demo...</p>
        </div>
      ) : view === "dashboard" ? (
        <div className="space-y-6">
            <h2 className="text-[14px] font-black uppercase tracking-[0.3em] text-zinc-500 border-l-4 border-blue-600 pl-4">Rendimientos (Demo)</h2>
            <YieldsGrid data={[]} /> 
            <p className="text-zinc-500 text-sm italic">Cargado desde initial_operations.csv en memoria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "PL Total (Demo)", value: `$${trades.reduce((acc, t) => acc + t.returnAmount, 0).toLocaleString()}`, border: "border-t-blue-500", text: "text-blue-400" },
              { label: "Win Rate", value: `${Math.round((trades.filter(t => t.returnAmount > 0).length / (trades.length || 1)) * 100)}%`, border: "border-t-emerald-500", text: "text-emerald-400" },
              { label: "Operaciones", value: operations.length, border: "border-t-orange-500", text: "text-orange-400" },
              { label: "Trades Cerrados", value: trades.length, border: "border-t-purple-500", text: "text-purple-400" },
            ].map((stat, i) => (
              <div key={i} className={cn("bg-zinc-900/50 p-4 rounded-[8px] border border-white/5 border-t-2 shadow-sm", stat.border)}>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={cn("text-[20px] font-semibold tabular-nums", stat.text)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative group w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por símbolo..." 
              className="w-full pl-12 pr-4 py-2.5 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] outline-none focus:border-blue-500/50" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>

          {/* Table */}
          <div className="bg-zinc-900/50 rounded-[8px] overflow-hidden border border-white/10 shadow-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-zinc-500 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest">
                      <th className="py-2 px-4">Fecha</th>
                      <th className="py-2 px-4">Símbolo</th>
                      <th className="py-2 px-4 text-right">Cantidad</th>
                      {view === 'trades' ? (
                          <>
                            <th className="py-2 px-4 text-right">P. Entrada</th>
                            <th className="py-2 px-4 text-right">P. Salida</th>
                            <th className="py-2 px-4 text-right">Rend %</th>
                          </>
                      ) : (
                          <>
                            <th className="py-2 px-4 text-right">Precio</th>
                            <th className="py-2 px-4">Tipo</th>
                            <th className="py-2 px-4">Broker</th>
                          </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredData.map((item) => (
                        <tr key={item.id} className="group hover:bg-white/[0.04] transition-colors text-[14px]">
                            <td className="py-2 px-4 text-zinc-400">{view === 'trades' ? item.closeDate : item.date}</td>
                            <td className="py-2 px-4 font-black text-blue-400">{item.symbol}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{item.quantity}</td>
                            {view === 'trades' ? (
                                <>
                                    <td className="py-2 px-4 text-right tabular-nums">${item.openPrice}</td>
                                    <td className="py-2 px-4 text-right tabular-nums">${item.closePrice}</td>
                                    <td className={cn("py-2 px-4 text-right tabular-nums font-bold", item.returnPercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                                        {item.returnPercent.toFixed(1)}%
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="py-2 px-4 text-right tabular-nums">${item.price}</td>
                                    <td className="py-2 px-4">
                                        <span className={cn("px-2 py-0.5 rounded-[4px] text-[10px] font-bold", item.type === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="py-2 px-4 text-zinc-500">{item.broker}</td>
                                </>
                            )}
                        </tr>
                    ))}
                  </tbody>
                </table>
          </div>
        </div>
      )}

      {showTradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-zinc-900 p-6 rounded-[8px] border border-white/10 max-w-md w-full">
                <h2 className="text-lg font-bold mb-4 uppercase tracking-widest text-blue-400">Modo Demo</h2>
                <p className="text-zinc-400 text-sm mb-6">En esta versión demo, los datos se cargan desde el archivo CSV en memoria. La base de datos no está activa para escrituras en este entorno.</p>
                <button onClick={() => setShowTradeModal(false)} className="w-full py-2 bg-blue-600 rounded-[6px] font-bold uppercase tracking-widest">Cerrar</button>
            </div>
        </div>
      )}
    </main>
  );
}
