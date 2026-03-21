/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Activity, List, History,
  TrendingUp, TrendingDown, DollarSign,
  Briefcase, Percent, Clock, PieChart, Wallet,
  Trophy, AlertCircle, Plus, RefreshCw,
  ArrowUpRight, ArrowDownRight, Layers, Scale
} from "lucide-react";
import {
  format, startOfToday, endOfToday,
  startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear, isWithinInterval
} from "date-fns";
import { cn } from "@/lib/utils";
import YieldsGrid from "@/components/dashboard/YieldsGrid";
import MetricCard from "@/components/ui/MetricCard";
import FilterBar, { DateFilter } from "@/components/ui/FilterBar";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";
import CloseTradeModal from "@/components/trades/CloseTradeModal";
import CashFlowForm from "@/components/cashflow/CashFlowForm";

// Server Actions
import { getYieldsData as getYields, getStats, getDashboardSummary, getTopStats, getEquityCurve } from "@/server/actions/dashboard";
import { getOperations, getTrades, createOperation, getOpenPositions, deleteOperation, deleteTrade, getOpenOperationsForClosing, closeTradeManually } from "@/server/actions/trades";
import { addMemoryCashFlow } from "@/server/actions/transactions";
import TradeForm from "@/components/trades/TradeForm";
import { exportToCSV, downloadCSV } from "@/lib/csv-exporter";

// Tipos
type View = "dashboard" | "analytics" | "operations" | "trades" | "open";

export default function Home() {
  // Estado Global
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todo");
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({
    start: format(new Date(), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd"),
  });

  // UI State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [showCashFlowForm, setShowCashFlowForm] = useState(false);
  const [closeModalData, setCloseModalData] = useState<{
    symbol: string; closePrice: number; closeQuantity: number;
    closeDate: string; broker: string;
    openOps: Array<{ id: number; date: Date; quantity: number; price: number; amount: number; broker: string; days: number }>;
  } | null>(null);
  const [estadoFilter, setEstadoFilter] = useState("Todas");
  const [brokerFilter, setBrokerFilter] = useState("Todos");
  const [instrumentFilter, setInstrumentFilter] = useState("Todos");
  const [tradeEstadoFilter, setTradeEstadoFilter] = useState("Todos");

  // Data State
  const [stats, setStats] = useState<any>(null);
  const [yields, setYields] = useState<any>(null);
  const [operations, setOperations] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [openPositions, setOpenPositions] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [topStats, setTopStats] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<{ date: string; equity: number; trade: string }[]>([]);

  // Cálculo de fechas
  const activeInterval = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case "hoy": return { start: startOfToday(), end: endOfToday() };
      case "semana": return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "7dias": return { start: subDays(now, 7), end: now };
      case "mes": return { start: startOfMonth(now), end: endOfMonth(now) };
      case "mes_anterior": return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case "año": return { start: startOfYear(now), end: endOfYear(now) };
      case "custom": return { start: new Date(customRange.start), end: new Date(customRange.end) };
      default: return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
    }
  }, [dateFilter, customRange]);

  // Carga de datos
  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true); else setRefreshing(true);
    try {
      const [ops, trs, openPos, st, yld, summ, top] = await Promise.all([
        getOperations(),
        getTrades(),
        getOpenPositions(),
        getStats(activeInterval.start, activeInterval.end),
        getYields(year),
        getDashboardSummary(),
        getTopStats(),
      ]);
      setOperations(ops);
      setTrades(trs);
      setOpenPositions(openPos);
      setStats(st);
      setYields(yld);
      setSummary(summ);
      setTopStats(top);

      if (view === "analytics") {
        const curve = await getEquityCurve();
        setEquityCurve(curve);
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const isFirstLoad = React.useRef(true);
  useEffect(() => {
    fetchData(isFirstLoad.current);
    isFirstLoad.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInterval, year]);

  // Cargar equity curve cuando se cambia a analytics
  useEffect(() => {
    if (view === "analytics" && equityCurve.length === 0) {
      getEquityCurve().then(setEquityCurve).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleSaveOperation = async (data: any) => {
    try {
      await createOperation({
        date: data.entryDate,
        symbol: data.symbol.toUpperCase(),
        quantity: data.quantity,
        price: data.entryPrice,
        broker: data.broker,
        type: data.type || "BUY",
        isFalopa: data.isFalopa,
        isIntra: data.isIntra,
      });

      if (data.isClosed && data.exitPrice && data.exitDate) {
        const openOps = await getOpenOperationsForClosing(data.symbol.toUpperCase(), "SELL");
        if (openOps.length > 1) {
          setCloseModalData({
            symbol: data.symbol.toUpperCase(),
            closePrice: data.exitPrice,
            closeQuantity: data.quantity,
            closeDate: data.exitDate,
            broker: data.broker,
            openOps,
          });
          setIsFormOpen(false);
          return;
        } else if (openOps.length === 1) {
          await closeTradeManually({
            symbol: data.symbol.toUpperCase(),
            closeDate: data.exitDate,
            closePrice: data.exitPrice,
            quantity: data.quantity,
            broker: data.broker,
            openOperationId: openOps[0].id,
          });
        } else {
          await createOperation({
            date: data.exitDate,
            symbol: data.symbol.toUpperCase(),
            quantity: data.quantity,
            price: data.exitPrice,
            broker: data.broker,
            type: "SELL",
            isFalopa: data.isFalopa,
            isIntra: data.isIntra,
          });
        }
      }

      setIsFormOpen(false);
      await fetchData();
    } catch (e) {
      console.error("Error al guardar:", e);
    }
  };

  const handleConfirmClose = async (openOperationId: number) => {
    if (!closeModalData) return;
    await closeTradeManually({
      symbol: closeModalData.symbol,
      closeDate: closeModalData.closeDate,
      closePrice: closeModalData.closePrice,
      quantity: closeModalData.closeQuantity,
      broker: closeModalData.broker,
      openOperationId,
    });
    setCloseModalData(null);
    await fetchData();
  };

  const handleSaveCashFlow = async (data: {
    date: string; amount: number; type: "DEPOSIT" | "WITHDRAWAL"; broker: string; description?: string;
  }) => {
    await addMemoryCashFlow(data);
    setShowCashFlowForm(false);
    await fetchData();
  };

  const handleDeleteOp = async (row: any) => {
    if (!confirm(`¿Eliminar operación #${row.id} (${row.symbol})?`)) return;
    await deleteOperation(row.id);
    fetchData();
  };

  const handleViewOp = (row: any) => {
    alert(`Operación #${row.id}\nFecha: ${new Date(row.date).toLocaleDateString("es-AR")}\nSímbolo: ${row.symbol}\nTipo: ${row.type}\nCantidad: ${row.quantity}\nPrecio: $${Number(row.price).toFixed(2)}\nMonto: $${Math.round(row.amount).toLocaleString()}\nBroker: ${row.broker}\nFalopa: ${row.isFalopa ? "Sí" : "No"}\nIntra: ${row.isIntra ? "Sí" : "No"}`);
  };

  const handleEditOp = (row: any) => {
    alert(`Edición de operación #${row.id} — próximamente`);
  };

  const handleViewTrade = (row: any) => {
    const salida = row.closeDate ? `${new Date(row.closeDate).toLocaleDateString("es-AR")} @ $${Number(row.closePrice).toFixed(2)}` : "Abierto";
    alert(`Trade #${row.id}\nSímbolo: ${row.symbol}\nEstado: ${row.isClosed ? "CERRADO" : "ABIERTO"}\nEntrada: ${new Date(row.openDate).toLocaleDateString("es-AR")} @ $${Number(row.openPrice).toFixed(2)}\nSalida: ${salida}\nDías: ${row.days}\nRdto: ${row.isClosed ? `$${Math.round(row.returnAmount).toLocaleString()} (${Number(row.returnPercent).toFixed(2)}%)` : "—"}\nTNA: ${row.isClosed ? `${Number(row.tna).toFixed(1)}%` : "—"}\nBroker: ${row.broker}`);
  };

  const handleEditTrade = (row: any) => {
    alert(`Edición de trade #${row.id} — próximamente`);
  };

  const handleDeleteTrade = async (row: any) => {
    if (!confirm(`¿Eliminar trade #${row.id} (${row.symbol})?`)) return;
    await deleteTrade(row.id);
    fetchData();
  };

  const handleExportOperations = () => {
    const csv = exportToCSV(filteredList, [
      { key: 'date', header: 'Fecha' }, { key: 'symbol', header: 'Símbolo' },
      { key: 'type', header: 'Tipo' }, { key: 'quantity', header: 'Cantidad' },
      { key: 'price', header: 'P.Entrada' }, { key: 'amount', header: 'M.Entrada' },
      { key: 'exitPrice', header: 'P.Salida' }, { key: 'exitDate', header: 'F.Salida' },
      { key: 'broker', header: 'Broker' },
      { key: 'isFalopa', header: 'Falopa' }, { key: 'isIntra', header: 'Intra' },
      { key: 'isClosed', header: 'Estado' },
    ]);
    downloadCSV(csv, `operaciones-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportTrades = () => {
    const csv = exportToCSV(filteredList, [
      { key: 'openDate', header: 'F.Entrada' }, { key: 'closeDate', header: 'F.Salida' },
      { key: 'symbol', header: 'Símbolo' }, { key: 'quantity', header: 'Cantidad' },
      { key: 'openPrice', header: 'P.Entrada' }, { key: 'closePrice', header: 'P.Salida' },
      { key: 'openAmount', header: 'M.Entrada' }, { key: 'closeAmount', header: 'M.Salida' },
      { key: 'days', header: 'Días' }, { key: 'returnAmount', header: 'Rdto $' },
      { key: 'returnPercent', header: 'Rdto %' }, { key: 'tna', header: 'TNA' },
      { key: 'broker', header: 'Broker' },
    ]);
    downloadCSV(csv, `trades-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filtering Logic
  const filteredList = useMemo(() => {
    let source: any[] = [];
    if (view === "operations") source = operations;
    else if (view === "trades") source = trades;
    else if (view === "open") source = openPositions;

    return source.filter((item: any) => {
      // Trades abiertos siempre pasan el filtro de fecha (posición vigente)
      if (view === 'trades' && !item.isClosed) {
        // solo aplicar filtro de búsqueda/instrumento/estado — nunca filtrar por fecha
      } else {
        const itemDate = new Date(item.date || item.closeDate || item.openDate);
        const inRange = isWithinInterval(itemDate, activeInterval);
        if (view !== "open" && !inRange) return false;
      }

      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        if (!item.symbol.toLowerCase().includes(term) && !item.broker.toLowerCase().includes(term)) return false;
      }

      if (view === 'operations') {
        if (brokerFilter !== 'Todos' && item.broker !== brokerFilter) return false;
      }

      if (view === 'trades') {
        if (instrumentFilter !== 'Todos' && item.instrumentType !== instrumentFilter) return false;
        if (tradeEstadoFilter === 'Abiertos' && item.isClosed) return false;
        if (tradeEstadoFilter === 'Cerrados' && !item.isClosed) return false;
      }

      return true;
    });
  }, [operations, trades, openPositions, view, activeInterval, searchQuery, estadoFilter, brokerFilter, instrumentFilter, tradeEstadoFilter]);

  // Column definitions — orden exacto según requirements.md
  // Operations: ID, Fecha, Símbolo, Cantidad, Precio, Monto, Broker, Falopa, Intra
  const operationColumns: ColumnDef<any>[] = [
    { key: "id", header: "ID", align: "right", sortable: true },
    { key: "date", header: "Fecha", align: "center", sortable: true, render: (v) => v ? new Date(v as Date).toLocaleDateString("es-AR") : "-" },
    { key: "symbol", header: "Símbolo", sortable: true, render: (v) => <span className="px-1.5 py-0.5 bg-white/5 text-zinc-200 rounded text-[10px] font-black border border-white/10">{String(v)}</span> },
    { key: "type", header: "Tipo", align: "center", render: (v) => <span className={cn("text-[10px] font-black uppercase", v === "BUY" ? "text-emerald-500" : "text-red-500")}>{String(v)}</span> },
    { key: "quantity", header: "Cantidad", align: "right", sortable: true },
    { key: "price", header: "Precio", align: "right", sortable: true, render: (v) => `$${Number(v).toFixed(2)}` },
    { key: "amount", header: "Monto", align: "right", sortable: true, render: (v) => `$${Math.round(Number(v)).toLocaleString()}` },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "isFalopa", header: "Falopa", align: "center", render: (v) => v ? <span className="text-orange-400 font-bold text-[10px]">SÍ</span> : <span className="text-zinc-600 text-[10px]">—</span> },
    { key: "isIntra", header: "Intra", align: "center", render: (v) => v ? <span className="text-purple-400 font-bold text-[10px]">SÍ</span> : <span className="text-zinc-600 text-[10px]">—</span> },
  ];

  // Trades: ID, F.Entrada, Símbolo, Cantidad, P.Entrada, M.Entrada, P.Salida, M.Salida, F.Salida, Días, Rdto$, Rdto%, TNA, Broker, Estado
  const tradeColumns: ColumnDef<any>[] = [
    { key: "id", header: "ID", align: "right", sortable: true },
    { key: "openDate", header: "F.Entrada", align: "center", sortable: true, render: (v) => v ? new Date(v as Date).toLocaleDateString("es-AR") : "-" },
    { key: "symbol", header: "Símbolo", sortable: true, render: (v) => <span className="px-1.5 py-0.5 bg-white/5 text-zinc-200 rounded text-[10px] font-black border border-white/10">{String(v)}</span> },
    { key: "quantity", header: "Cantidad", align: "right", sortable: true },
    { key: "openPrice", header: "P.Entrada", align: "right", sortable: true, render: (v) => `$${Number(v).toFixed(2)}` },
    { key: "openAmount", header: "M.Entrada", align: "right", sortable: true, render: (v) => `$${Math.round(Number(v)).toLocaleString()}` },
    { key: "closePrice", header: "P.Salida", align: "right", sortable: true, render: (v) => v != null ? `$${Number(v).toFixed(2)}` : <span className="text-zinc-600">—</span> },
    { key: "closeAmount", header: "M.Salida", align: "right", sortable: true, render: (v) => v != null ? `$${Math.round(Number(v)).toLocaleString()}` : <span className="text-zinc-600">—</span> },
    { key: "closeDate", header: "F.Salida", align: "center", sortable: true, render: (v) => v ? new Date(v as Date).toLocaleDateString("es-AR") : <span className="text-zinc-600">—</span> },
    { key: "days", header: "Días", align: "center", sortable: true },
    { key: "returnAmount", header: "Rdto $", align: "right", sortable: true, render: (v) => <span className={cn("font-black", Number(v) >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.round(Number(v)).toLocaleString()}</span> },
    { key: "returnPercent", header: "Rdto %", align: "right", sortable: true, render: (v) => <span className={cn("font-bold", Number(v) >= 0 ? "text-emerald-500" : "text-red-500")}>{Number(v).toFixed(1)}%</span> },
    { key: "tna", header: "TNA", align: "right", sortable: true, render: (v) => `${Number(v ?? 0).toFixed(1)}%` },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "isClosed", header: "Estado", align: "center", render: (v) => <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", v ? "bg-zinc-700 text-zinc-400" : "bg-blue-900/30 text-blue-400")}>{v ? "CERRADO" : "ABIERTO"}</span> },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#09090b] text-zinc-500">
      <RefreshCw className="w-8 h-8 animate-spin mb-4 text-blue-500" />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em]">Cargando Gemini Capital...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.05] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter">Gemini<span className="text-blue-500">Capital</span></span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "analytics", label: "Analytics", icon: Activity },
              { id: "open", label: "Posiciones", icon: Layers },
              { id: "trades", label: "Trades", icon: History },
              { id: "operations", label: "Operaciones", icon: List },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id as View)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                  view === t.id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {refreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
          <button onClick={() => setShowCashFlowForm(true)}
            className="flex items-center gap-2 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all">
            <DollarSign className="w-4 h-4" />
            I/E
          </button>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Operación
          </button>
        </div>
      </nav>

      {isFormOpen && (
        <TradeForm
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveOperation}
        />
      )}

      {showCashFlowForm && (
        <CashFlowForm
          onClose={() => setShowCashFlowForm(false)}
          onSave={handleSaveCashFlow}
        />
      )}

      {closeModalData && (
        <CloseTradeModal
          symbol={closeModalData.symbol}
          closeQuantity={closeModalData.closeQuantity}
          closePrice={closeModalData.closePrice}
          closeDate={closeModalData.closeDate}
          broker={closeModalData.broker}
          openOperations={closeModalData.openOps}
          onConfirm={handleConfirmClose}
          onCancel={() => setCloseModalData(null)}
        />
      )}

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* Filter Bar */}
        <FilterBar
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por símbolo, broker o instrumento..."
          extraFilters={
            <div className="ml-auto flex items-center gap-3">
              <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold uppercase text-zinc-400">Sistema Online</span>
              </div>
            </div>
          }
        />

        {/* --- DASHBOARD VIEW --- */}
        {view === "dashboard" && stats && yields && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-blue-500/10 p-6 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-32 h-32 text-blue-500" /></div>
                <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">Resultado Neto</p>
                <h2 className={cn("text-4xl font-black tracking-tight z-10 relative", stats.netProfit >= 0 ? "text-white" : "text-red-400")}>
                  ${stats.netProfit.toLocaleString()}
                </h2>
                <div className="flex gap-4 mt-4 z-10 relative">
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Gross Profit</p>
                    <p className="text-sm font-bold text-emerald-400">+${stats.grossProfit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase">Gross Loss</p>
                    <p className="text-sm font-bold text-red-400">-${stats.grossLoss.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {[
                { label: "Win Rate", val: `${stats.winRate.toFixed(1)}%`, sub: `${stats.totalTrades} Trades`, icon: Trophy, color: "text-orange-400" },
                { label: "Profit Factor", val: stats.profitFactor.toFixed(2), sub: "Riesgo/Beneficio", icon: Activity, color: "text-blue-400" },
                { label: "Drawdown", val: `$${Math.round(stats.maxDrawdown).toLocaleString()}`, sub: "Riesgo Máximo", icon: AlertCircle, color: "text-red-400" },
              ].map((card, i) => (
                <div key={i} className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
                  <card.icon className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-all", card.color)} />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{card.label}</p>
                  <p className={cn("text-2xl font-black tabular-nums", card.color)}>{card.val}</p>
                  <p className="text-[10px] font-medium text-zinc-600 mt-1">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Summary MetricCards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard title="Operaciones Abiertas" value={String(summary.openOperations)} subtitle="posiciones activas" accentColor="blue" />
                <MetricCard title="Trades Cerrados" value={String(summary.totalTrades)} subtitle={`${summary.positiveTrades} ganadoras`} accentColor="emerald" />
                <MetricCard title="Win Rate" value={stats ? `${stats.winRate.toFixed(1)}%` : "0%"} subtitle="trades positivos" accentColor={stats && stats.winRate >= 50 ? "emerald" : "orange"} />
                <MetricCard title="Avg Trade Size" value={summary.avgTradeSize > 0 ? `$${Math.round(summary.avgTradeSize).toLocaleString()}` : "$0"} subtitle="monto promedio" accentColor="purple" />
              </div>
            )}

            {/* Top 5 Trades */}
            {topStats?.top5Trades && topStats.top5Trades.length > 0 && (
              <div className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/30">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">🏆 Top 5 Trades</span>
                </div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase text-zinc-500 bg-white/[0.02] border-b border-white/5">
                      <th className="py-2 px-4 text-left">Símbolo</th>
                      <th className="py-2 px-4 text-center">F.Entrada</th>
                      <th className="py-2 px-4 text-center">F.Salida</th>
                      <th className="py-2 px-4 text-right">P&amp;L $</th>
                      <th className="py-2 px-4 text-right">P&amp;L %</th>
                      <th className="py-2 px-4 text-right">TNA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {topStats.top5Trades.map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.03] h-8 text-[12px]">
                        <td className="py-1 px-4 font-extrabold text-zinc-200">{t.symbol}</td>
                        <td className="py-1 px-4 text-center text-zinc-500">{t.openDate ? new Date(t.openDate).toLocaleDateString("es-AR") : "-"}</td>
                        <td className="py-1 px-4 text-center text-zinc-500">{t.closeDate ? new Date(t.closeDate).toLocaleDateString("es-AR") : "-"}</td>
                        <td className={cn("py-1 px-4 text-right font-black", t.returnAmount >= 0 ? "text-emerald-400" : "text-red-400")}>
                          ${Math.round(t.returnAmount).toLocaleString()}
                        </td>
                        <td className={cn("py-1 px-4 text-right font-bold", t.returnPercent >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {t.returnPercent.toFixed(1)}%
                        </td>
                        <td className="py-1 px-4 text-right text-zinc-400">{t.tna.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mejor Mes y Mejor Trade */}
            {topStats && (topStats.bestMonth || topStats.bestReturnTrade) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topStats.bestMonth && (
                  <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-2">
                      🗓 Mejor Mes
                    </p>
                    <p className="text-2xl font-black text-emerald-400">
                      ${Math.round(topStats.bestMonth.total).toLocaleString()}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">{topStats.bestMonth.month}</p>
                  </div>
                )}
                {topStats.bestReturnTrade && (
                  <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                      🏆 Mejor Trade
                    </p>
                    <p className="text-2xl font-black text-emerald-400">
                      {topStats.bestReturnTrade.returnPercent.toFixed(1)}%
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {topStats.bestReturnTrade.symbol} · ${Math.round(topStats.bestReturnTrade.returnAmount).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Yields Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-white/10">
                  {[2023, 2024, 2025, 2026].map(y => (
                    <button key={y} onClick={() => setYear(y)} className={cn("px-3 py-1 rounded text-[10px] font-bold transition-all", year === y ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400")}>{y}</button>
                  ))}
                </div>
              </div>
              <YieldsGrid
                title={`Matriz de Rendimientos ${year}`}
                brokers={yields.brokers}
                rows={yields.rows}
                totals={yields.totals}
              />
            </div>
          </div>
        )}

        {/* --- ANALYTICS VIEW (15+ Metrics) --- */}
        {view === "analytics" && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { l: "Sharpe Ratio", v: stats.sharpeRatio.toFixed(2), c: "text-purple-400", i: PieChart },
                { l: "Sortino Ratio", v: stats.sortinoRatio.toFixed(2), c: "text-purple-400", i: PieChart },
                { l: "Expectancy", v: `$${Math.round(stats.expectancy)}`, c: "text-emerald-400", i: DollarSign },
                { l: "Recovery Factor", v: stats.recoveryFactor.toFixed(2), c: "text-blue-400", i: Activity },
                { l: "SQN", v: stats.sqn.toFixed(2), c: "text-yellow-400", i: Trophy },
                { l: "Kelly Criterion", v: `${stats.kellyPercent.toFixed(1)}%`, c: "text-zinc-300", i: Scale },
                { l: "Avg Win", v: `$${Math.round(stats.avgWin).toLocaleString()}`, c: "text-emerald-500", i: ArrowUpRight },
                { l: "Avg Loss", v: `$${Math.round(stats.avgLoss).toLocaleString()}`, c: "text-red-500", i: ArrowDownRight },
                { l: "Payoff Ratio", v: stats.payoffRatio.toFixed(2), c: "text-zinc-400", i: Percent },
                { l: "Max Win", v: `$${Math.round(stats.maxWin).toLocaleString()}`, c: "text-emerald-600", i: TrendingUp },
                { l: "Max Loss", v: `$${Math.round(stats.maxLoss).toLocaleString()}`, c: "text-red-600", i: TrendingDown },
                { l: "Max Win Streak", v: stats.maxWinStreak, c: "text-emerald-400", i: Layers },
                { l: "Max Loss Streak", v: stats.maxLossStreak, c: "text-red-400", i: Layers },
                { l: "Avg Holding", v: `${Math.round(stats.avgHoldingTime)}d`, c: "text-zinc-500", i: Clock },
                { l: "Commissions", v: "$0", c: "text-zinc-600", i: Wallet },
              ].map((m, i) => (
                <div key={i} className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center group hover:border-blue-500/20 transition-all">
                  <m.i className={cn("w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-opacity", m.c)} />
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">{m.l}</p>
                  <p className={cn("text-lg font-black tabular-nums", m.c)}>{m.v}</p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2 mb-6">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Rendimiento por Instrumento
              </h3>
              <div className="space-y-4">
                {stats.instrumentGains.map((ig: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-24 text-[12px] font-bold text-zinc-300">{ig.name}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                      <div
                        className={cn("h-full absolute top-0 left-0", ig.gain >= 0 ? "bg-emerald-500" : "bg-red-500")}
                        style={{ width: `${Math.min(100, Math.abs(ig.gain) / 500)}%` }}
                      />
                    </div>
                    <div className={cn("w-24 text-right text-[12px] font-black tabular-nums", ig.gain >= 0 ? "text-emerald-400" : "text-red-400")}>
                      ${Math.round(ig.gain).toLocaleString()}
                    </div>
                    <div className="w-16 text-right text-[10px] font-bold text-zinc-500">
                      {ig.count} ops
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curva de Equity Acumulada */}
            {equityCurve.length > 0 && (
              <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
                  Curva de Equity Acumulada
                </p>
                <div className="h-20 flex items-end gap-px">
                  {equityCurve.map((point, i) => {
                    const maxVal = Math.max(...equityCurve.map(p => Math.abs(p.equity)), 1);
                    const height = (Math.abs(point.equity) / maxVal) * 100;
                    return (
                      <div key={i}
                        title={`${point.date}: $${point.equity.toLocaleString()}`}
                        style={{ height: `${Math.max(height, 2)}%` }}
                        className={cn("flex-1 rounded-t-sm transition-all",
                          point.equity >= 0 ? "bg-emerald-500/70" : "bg-red-500/70")}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
                  <span>{equityCurve[0]?.date}</span>
                  <span className={cn("font-bold text-[11px]",
                    (equityCurve.at(-1)?.equity ?? 0) >= 0 ? "text-emerald-400" : "text-red-400")}>
                    ${Math.round(equityCurve.at(-1)?.equity ?? 0).toLocaleString()}
                  </span>
                  <span>{equityCurve.at(-1)?.date}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- LIST VIEWS (Operations, Trades, Open) --- */}
        {(view === "operations" || view === "trades" || view === "open") && (
          <div className="space-y-4 animate-in fade-in duration-500">

            {/* Filtros extra para operaciones */}
            {view === "operations" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-600 font-bold">Broker</span>
                {["Todos", "AMR", "IOL", "IBKR"].map(b => (
                  <button key={b} onClick={() => setBrokerFilter(b)}
                    className={cn("px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
                      brokerFilter === b ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-white/5")}>
                    {b}
                  </button>
                ))}
              </div>
            )}

            {/* Filtros extra para trades */}
            {view === "trades" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase text-zinc-600 font-bold">Estado</span>
                {["Todos", "Abiertos", "Cerrados"].map(e => (
                  <button key={e} onClick={() => setTradeEstadoFilter(e)}
                    className={cn("px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
                      tradeEstadoFilter === e ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-white/5")}>
                    {e}
                  </button>
                ))}
                <span className="text-[10px] uppercase text-zinc-600 font-bold ml-3">Instrumento</span>
                {["Todos", "STOCK", "CEDEAR", "CRYPTO"].map(inst => (
                  <button key={inst} onClick={() => setInstrumentFilter(inst)}
                    className={cn("px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
                      instrumentFilter === inst ? "bg-purple-700 text-white" : "text-zinc-400 hover:bg-white/5")}>
                    {inst}
                  </button>
                ))}
              </div>
            )}

            {/* Open Positions: tabla inline legacy */}
            {view === "open" && (
              <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                        <th className="py-3 px-6 text-center">Fecha</th>
                        <th className="py-3 px-4 text-center">Símbolo</th>
                        <th className="py-3 px-4 text-center">Broker</th>
                        <th className="py-3 px-4 text-right">Cant. Actual</th>
                        <th className="py-3 px-4 text-right">Precio Entrada</th>
                        <th className="py-3 px-4 text-right">Precio Actual</th>
                        <th className="py-3 px-4 text-right">P&amp;L Latente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredList.map((item: any) => (
                        <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors h-[34px] text-[12px]">
                          <td className="py-0 px-6 text-center text-zinc-500 font-medium whitespace-nowrap">
                            {format(new Date(item.date || item.openDate), "dd/MM/yyyy")}
                          </td>
                          <td className="py-0 px-4 text-center">
                            <span className="px-1.5 py-0.5 bg-white/5 text-zinc-300 rounded text-[10px] font-black uppercase tracking-tighter border border-white/10">
                              {item.symbol}
                            </span>
                          </td>
                          <td className="py-0 px-4 text-center font-bold text-zinc-500">{item.broker}</td>
                          <td className="py-0 px-4 text-right font-bold text-white">{item.quantity}</td>
                          <td className="py-0 px-4 text-right text-zinc-400">${item.openPrice.toFixed(2)}</td>
                          <td className="py-0 px-4 text-right text-zinc-200">${item.currentPrice.toFixed(2)}</td>
                          <td className={cn("py-0 px-4 text-right font-black", item.unrealizedPL >= 0 ? "text-emerald-400" : "text-red-400")}>
                            ${Math.round(item.unrealizedPL).toLocaleString()} <span className="text-[10px] opacity-70">({item.unrealizedPLPercent.toFixed(1)}%)</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Operations DataTable */}
            {view === "operations" && (
              <DataTable
                data={filteredList}
                columns={operationColumns}
                emptyMessage="Sin operaciones para el período seleccionado"
                onView={handleViewOp}
                onEdit={handleEditOp}
                onDelete={handleDeleteOp}
                onExport={handleExportOperations}
              />
            )}

            {/* Trades DataTable */}
            {view === "trades" && (
              <DataTable
                data={filteredList}
                columns={tradeColumns}
                emptyMessage="Sin trades para el período seleccionado"
                onView={handleViewTrade}
                onEdit={handleEditTrade}
                onDelete={handleDeleteTrade}
                onExport={handleExportTrades}
              />
            )}
          </div>
        )}

      </main>
    </div>
  );
}
