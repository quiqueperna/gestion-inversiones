/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { SearchIcon, Pencil, Trash2, Plus, Settings2, Check, Calendar, CalendarRange, LayoutDashboard, List, Loader2 } from "lucide-react";
import { TradeInput } from "@/lib/validations";
import { calculateTradeMetrics } from "@/lib/calculations";
import { cn } from "@/lib/utils";
import TradeForm from "@/components/trades/TradeForm";
import YieldsGrid from "@/components/dashboard/YieldsGrid";
import { getTrades, createTrade, updateTrade, deleteTrade } from "@/server/actions/trades";
import { getYieldsData } from "@/server/actions/dashboard";

const ALL_COLUMNS = [
  { id: "entryDate", label: "Fecha In", align: "center" as const },
  { id: "symbol", label: "Símbolo", align: "left" as const },
  { id: "quantity", label: "Q", align: "right" as const },
  { id: "entryPrice", label: "P. Entrada", align: "right" as const },
  { id: "entryAmount", label: "Monto In", align: "right" as const },
  { id: "exitPrice", label: "P. Salida", align: "right" as const },
  { id: "exitAmount", label: "Monto Out", align: "right" as const },
  { id: "days", label: "Días", align: "right" as const },
  { id: "returnAmount", label: "Rend $", align: "right" as const },
  { id: "returnPercent", label: "Rend %", align: "right" as const },
  { id: "tna", label: "TNA", align: "right" as const },
];

export default function Home() {
  const [view, setView] = useState<"list" | "dashboard">("list");
  const [trades, setTrades] = useState<any[]>([]);
  const [yieldsData, setYieldsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState("Todo");
  const [visibleColumns, setVisibleColumns] = useState(ALL_COLUMNS.map(c => c.id));
  const [searchQuery, setSearchQuery] = useState("");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showCustomDateMenu, setShowCustomDateMenu] = useState(false);
  const [editingTrade, setEditingTrade] = useState<any>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);

  const columnsRef = useRef<HTMLDivElement>(null);
  const customDateRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [tradesData, yields] = await Promise.all([
            getTrades(),
            getYieldsData()
        ]);
        const formattedTrades = (tradesData as any[]).map(t => ({
            ...t,
            entryDate: new Date(t.entryDate).toISOString().split('T')[0],
            exitDate: t.exitDate ? new Date(t.exitDate).toISOString().split('T')[0] : null
        }));
        setTrades(formattedTrades);
        setYieldsData(yields);
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnsRef.current && !columnsRef.current.contains(event.target as Node)) setShowColumnsMenu(false);
      if (customDateRef.current && !customDateRef.current.contains(event.target as Node)) setShowCustomDateMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const tradeDate = new Date(trade.entryDate);
      const now = new Date();
      if (searchQuery && !trade.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (activeFilter === "Hoy") return trade.entryDate === now.toISOString().split("T")[0];
      if (activeFilter === "Personalizado") {
        if (!customRange.start || !customRange.end) return true;
        return tradeDate >= new Date(customRange.start) && tradeDate <= new Date(customRange.end);
      }
      return true;
    });
  }, [trades, activeFilter, searchQuery, customRange]);

  const handleSaveTrade = async (data: TradeInput) => {
    try {
        if (editingTrade) {
            await updateTrade(editingTrade.id, data);
        } else {
            await createTrade(data);
        }
        setShowTradeModal(false);
        setEditingTrade(null);
        fetchData();
    } catch {
        alert("Error al guardar la operación");
    }
  };

  const handleDeleteTrade = async (id: number) => {
    if (confirm("¿Está seguro de eliminar esta operación?")) {
        await deleteTrade(id);
        fetchData();
    }
  };

  const filterOptions = ["Hoy", "Esta semana", "Últ. 7 días", "Este mes", "Mes anterior", "Este año", "Todo"];

  return (
    <main className="min-h-screen p-6 max-w-[1600px] mx-auto space-y-6 font-sans antialiased bg-[#09090b] text-white">
      
      {/* View Switcher */}
      <div className="flex justify-between items-center">
        <div className="flex bg-zinc-900 p-1 rounded-[8px] border border-white/5">
            <button 
                onClick={() => setView("list")}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-all",
                    view === "list" ? "bg-blue-600 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                <List className="w-4 h-4" />
                <span>Listado</span>
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
            onClick={() => { setEditingTrade(null); setShowTradeModal(true); }} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-[6px] text-[14px] font-bold shadow-lg active:scale-95 transition-all"
        >
            <Plus className="w-4 h-4" />
            <span>Nueva Operación</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-zinc-500">Cargando datos...</p>
        </div>
      ) : view === "dashboard" ? (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-[14px] font-black uppercase tracking-[0.3em] text-zinc-500 border-l-4 border-blue-600 pl-4">Rendimientos por Cuenta</h2>
            <YieldsGrid data={yieldsData} />
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* 1. Bloque Superior: Tarjetas de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "P&L Total", value: `+$${trades.reduce((acc, t) => acc + (calculateTradeMetrics(t).returnAmount || 0), 0).toLocaleString()}`, border: "border-t-blue-500", text: "text-blue-400" },
              { label: "Registros", value: filteredTrades.length, border: "border-t-emerald-500", text: "text-emerald-400" },
              { label: "Win Rate", value: `${Math.round((trades.filter(t => (calculateTradeMetrics(t).returnAmount || 0) > 0).length / (trades.length || 1)) * 100)}%`, border: "border-t-orange-500", text: "text-orange-400" },
              { label: "TNA Promedio", value: `${Math.round(trades.reduce((acc, t) => acc + (calculateTradeMetrics(t).tna || 0), 0) / (trades.length || 1))}%`, border: "border-t-purple-500", text: "text-purple-400" },
            ].map((stat, i) => (
              <div key={i} className={cn("bg-zinc-900/50 p-4 rounded-[8px] border border-white/5 border-t-2 shadow-sm", stat.border)}>
                <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className={cn("text-[20px] font-semibold tabular-nums", stat.text)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* 2. Barra de Filtros */}
          <section className="bg-zinc-900 p-4 rounded-[8px] space-y-4 border border-white/5 shadow-xl relative">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-zinc-500 min-w-fit">
                <Calendar className="w-4 h-4" />
                <span className="text-[12px] font-bold uppercase tracking-wider">Periodo:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {filterOptions.map((f) => (
                  <button 
                    key={f} 
                    onClick={() => { setActiveFilter(f); setShowCustomDateMenu(false); }} 
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all border", 
                      activeFilter === f ? "bg-blue-600 border-blue-500 text-white shadow-lg" : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {f}
                  </button>
                ))}
                
                <div className="relative" ref={customDateRef}>
                  <button 
                    onClick={() => setShowCustomDateMenu(!showCustomDateMenu)} 
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all border ml-2", 
                      activeFilter === "Personalizado" ? "bg-purple-600 border-purple-500 text-white shadow-lg" : "bg-white/5 border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                    )}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Personalizado</span>
                  </button>

                  {showCustomDateMenu && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-zinc-900 rounded-[8px] border border-white/10 shadow-2xl z-50 p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Desde</label>
                                <input type="date" className="w-full px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-[6px] text-[12px]" value={customRange.start} onChange={(e) => setCustomRange({...customRange, start: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase">Hasta</label>
                                <input type="date" className="w-full px-3 py-1.5 bg-zinc-950 border border-white/10 rounded-[6px] text-[12px]" value={customRange.end} onChange={(e) => setCustomRange({...customRange, end: e.target.value})} />
                            </div>
                        </div>
                        <button onClick={() => { setActiveFilter("Personalizado"); setShowCustomDateMenu(false); }} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-[6px] text-[12px] font-bold uppercase tracking-widest transition-colors">Aplicar Filtro</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
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
          </section>

          {/* 3. Tabla de Datos */}
          <section className="space-y-2">
            <div className="flex justify-between items-center px-2 py-1">
              <span className="text-[12px] font-bold text-zinc-500 uppercase tracking-wider">{filteredTrades.length} REGISTROS</span>
              <div className="relative" ref={columnsRef}>
                <button onClick={() => setShowColumnsMenu(!showColumnsMenu)} className={cn("flex items-center gap-2 px-3 py-1.5 glass-button border-blue-500/20 rounded-[6px] text-[12px] font-bold transition-all uppercase tracking-wider", showColumnsMenu ? "text-white bg-blue-600 border-blue-500" : "text-blue-400 hover:text-blue-300")}>
                  <Settings2 className="w-4 h-4" />
                  <span>Columnas</span>
                </button>
                {showColumnsMenu && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 rounded-[8px] border border-white/10 shadow-2xl z-50 p-2 grid grid-cols-1 gap-1 max-h-[400px] overflow-y-auto">
                    {ALL_COLUMNS.map((col) => (
                      <button key={col.id} onClick={() => setVisibleColumns(prev => prev.includes(col.id) ? prev.filter(c => c !== col.id) : [...prev, col.id])} className={cn("flex items-center justify-between px-3 py-2 rounded-[4px] text-[12px] transition-all", visibleColumns.includes(col.id) ? "bg-blue-600/10 text-blue-400" : "text-zinc-500 hover:bg-white/5")}>
                        <span>{col.label}</span>
                        {visibleColumns.includes(col.id) && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/50 rounded-[8px] overflow-hidden border border-white/10 shadow-xl overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-zinc-500 border-b border-white/10">
                      {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map((col) => (
                        <th key={col.id} className={cn("py-2 px-4 text-[10px] uppercase font-bold tracking-[0.15em]", col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left")}>
                          {col.label}
                        </th>
                      ))}
                      <th className="py-2 px-4 text-right text-[10px] uppercase font-bold tracking-widest opacity-40">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTrades.map((trade) => {
                      const metrics = calculateTradeMetrics(trade);
                      const dataMap: any = { 
                          ...trade, 
                          entryAmount: metrics.entryAmount.toLocaleString(), 
                          exitAmount: metrics.exitAmount?.toLocaleString() || "-", 
                          days: metrics.days || "-",
                          returnAmount: metrics.returnAmount?.toLocaleString() || "-", 
                          returnPercent: metrics.returnPercent ? `${metrics.returnPercent.toFixed(1)}%` : "-", 
                          tna: metrics.tna ? `${metrics.tna.toFixed(0)}%` : "-", 
                          entryPrice: `$${trade.entryPrice.toLocaleString()}`, 
                          exitPrice: trade.exitPrice ? `$${trade.exitPrice.toLocaleString()}` : "-" 
                      };
                      return (
                        <tr key={trade.id} className="group hover:bg-white/[0.04] transition-colors">
                          {ALL_COLUMNS.filter(c => visibleColumns.includes(c.id)).map((col) => (
                            <td key={col.id} className={cn("py-1 px-4 text-[14px] tabular-nums", col.id === "symbol" ? "font-[800] text-blue-400 uppercase" : "text-zinc-300", col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left", (col.id === "returnAmount" || col.id === "returnPercent") && ((metrics.returnAmount || 0) >= 0 ? "text-emerald-400" : "text-red-400"))}>
                              {dataMap[col.id]}
                            </td>
                          ))}
                          <td className="py-1 px-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingTrade(trade); setShowTradeModal(true); }} className="p-1.5 hover:bg-white/10 rounded-[6px] text-emerald-400"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteTrade(trade.id)} className="p-1.5 hover:bg-white/10 rounded-[6px] text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
          </section>
        </div>
      )}

      {/* Trade Form Modal */}
      {showTradeModal && (
        <TradeForm 
            onClose={() => { setShowTradeModal(false); setEditingTrade(null); }} 
            onSave={handleSaveTrade}
            initialData={editingTrade}
        />
      )}
    </main>
  );
}
