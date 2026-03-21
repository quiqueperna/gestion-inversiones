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
  subMonths, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval
} from "date-fns";
import { cn } from "@/lib/utils";
import YieldsGrid from "@/components/dashboard/YieldsGrid";
import CalendarGrid from "@/components/dashboard/CalendarGrid";
import PieChartComponent from "@/components/ui/PieChart";
import MetricCard from "@/components/ui/MetricCard";
import FilterBar, { DateFilter } from "@/components/ui/FilterBar";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";
import CloseTradeModal from "@/components/trades/CloseTradeModal";
import CashFlowForm from "@/components/cashflow/CashFlowForm";
import ViewDetailModal from "@/components/ui/ViewDetailModal";
import CuentasSection from "@/components/cuentas/CuentasSection";
import BrokersSection from "@/components/brokers/BrokersSection";

// Server Actions
import { getYieldsData as getYields, getStats, getDashboardSummary, getTopStats, getEquityCurve } from "@/server/actions/dashboard";
import { getOperations, getTrades, createOperation, getOpenPositions, deleteOperation, deleteTrade, closeTradeManually, updateOperation, closeTradeWithQuantity } from "@/server/actions/trades";
import { addMemoryCashFlow, getMemoryCuentas, addMemoryCuenta, removeMemoryCuenta, updateMemoryCuenta, getMemoryBrokers, addMemoryBroker, updateMemoryBroker, removeMemoryBroker } from "@/server/actions/transactions";
import TradeForm from "@/components/trades/TradeForm";
import DropdownMultiCheck from "@/components/ui/DropdownMultiCheck";
import { exportToCSV, downloadCSV } from "@/lib/csv-exporter";

// Tipos
type View = "dashboard" | "analytics" | "operations" | "trades" | "open" | "cuentas" | "brokers" | "nueva-op" | "ie";

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
  const [year, setYear] = useState<number | null>(null);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [prevView, setPrevView] = useState<View>("dashboard");
  const [closeModalData, setCloseModalData] = useState<{
    symbol: string; closePrice: number; closeQuantity: number;
    closeDate: string; broker: string;
    openOps: Array<{ id: number; date: Date; quantity: number; price: number; amount: number; broker: string; days: number }>;
  } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [brokerFilters, setBrokerFilters] = useState<string[]>([]);
  const [instrumentFilters, setInstrumentFilters] = useState<string[]>([]);
  const [tradeEstadoFilters, setTradeEstadoFilters] = useState<string[]>([]);
  const [cuentaFilters, setCuentaFilters] = useState<string[]>([]);
  const [selectedCalendarMonths, setSelectedCalendarMonths] = useState<string[]>([]);
  const [openPage, setOpenPage] = useState(1);
  const [openPageSize, setOpenPageSize] = useState(25);

  // Modal/Edit State
  const [editingOperation, setEditingOperation] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<{ type: 'operation' | 'trade'; data: any } | null>(null);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedCuentas, setSelectedCuentas] = useState<string[]>([]);

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
      const [ops, trs, openPos, st, yld, summ, top, cuentasList, brokersList] = await Promise.all([
        getOperations(),
        getTrades(),
        getOpenPositions(),
        getStats(activeInterval.start, activeInterval.end),
        getYields(year),
        getDashboardSummary(activeInterval.start, activeInterval.end),
        getTopStats(activeInterval.start, activeInterval.end),
        getMemoryCuentas(),
        getMemoryBrokers(),
      ]);
      setOperations(ops);
      setTrades(trs);
      setOpenPositions(openPos);
      setStats(st);
      setYields(yld);
      setSummary(summ);
      setTopStats(top);
      setCuentas(cuentasList);
      setBrokers(brokersList);

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

  useEffect(() => { setOpenPage(1); }, [searchQuery]);

  // Load selectedCuentas from localStorage (SSR-safe)
  useEffect(() => {
    const saved = localStorage.getItem('gemini-capital-selected-cuentas');
    if (saved) {
      try { setSelectedCuentas(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Cargar equity curve cuando se cambia a analytics
  useEffect(() => {
    if (view === "analytics" && equityCurve.length === 0) {
      getEquityCurve().then(setEquityCurve).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const navigateTo = (v: View) => { setPrevView(view); setView(v); };
  const navigateBack = () => setView(prevView === "nueva-op" || prevView === "ie" || prevView === "cuentas" || prevView === "brokers" ? "dashboard" : prevView);

  // Sync year multicheck → dateFilter range for stats and matrix
  const handleYearsChange = (years: string[]) => {
    setSelectedYears(years);
    if (years.length === 0) {
      setYear(null);
      setDateFilter("todo");
    } else if (years.length === 1) {
      const y = Number(years[0]);
      setYear(y);
      setCustomRange({ start: `${y}-01-01`, end: `${y}-12-31` });
      setDateFilter("custom");
    } else {
      setYear(null);
      const sorted = years.map(Number).sort((a, b) => a - b);
      setCustomRange({ start: `${sorted[0]}-01-01`, end: `${sorted[sorted.length - 1]}-12-31` });
      setDateFilter("custom");
    }
  };

  // Available years from loaded data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    operations.forEach((op: any) => { if (op.date) years.add(new Date(op.date).getFullYear()); });
    trades.forEach((t: any) => { if (t.openDate) years.add(new Date(t.openDate).getFullYear()); });
    return [...years].sort((a, b) => b - a);
  }, [operations, trades]);

  // Calendar mode: active when period is ≤ 1 month
  const isCalendarMode = useMemo(() => {
    if (dateFilter === 'hoy' || dateFilter === 'semana' || dateFilter === '7dias' || dateFilter === 'mes' || dateFilter === 'mes_anterior') return true;
    if (dateFilter === 'custom') {
      const days = Math.ceil((activeInterval.end.getTime() - activeInterval.start.getTime()) / (1000 * 60 * 60 * 24));
      return days <= 31;
    }
    return false;
  }, [dateFilter, activeInterval]);

  const calendarYear = useMemo(() => year ?? new Date().getFullYear(), [year]);

  // Months to display in calendar mode: from selectedCalendarMonths or fall back to the active interval month
  const calendarMonthsToShow = useMemo((): number[] => {
    if (selectedCalendarMonths.length > 0) return selectedCalendarMonths.map(Number);
    // Default: month(s) from the active interval
    const m = activeInterval.start.getMonth();
    return [m];
  }, [selectedCalendarMonths, activeInterval]);

  // Calendar grid data: one grid per selected month
  const calendarData = useMemo(() => {
    if (!isCalendarMode) return null;
    const toDateStr = (d: unknown): string =>
      d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

    const dayMap = new Map<string, { pl: number; count: number }>();
    trades.forEach((t: any) => {
      if (!t.isClosed || !t.openDate || !t.closeDate) return;
      const openStr = toDateStr(t.openDate);
      const closeStr = toDateStr(t.closeDate);
      if (openStr !== closeStr) return;
      const existing = dayMap.get(openStr) || { pl: 0, count: 0 };
      dayMap.set(openStr, { pl: existing.pl + (t.returnAmount || 0), count: existing.count + 1 });
    });

    const buildGrid = (monthIdx: number) => {
      const interval = {
        start: new Date(calendarYear, monthIdx, 1),
        end: new Date(calendarYear, monthIdx + 1, 0),
      };
      const totalPL = Array.from(dayMap.entries())
        .filter(([d]) => isWithinInterval(new Date(d + 'T12:00:00'), interval))
        .reduce((sum, [, v]) => sum + v.pl, 0);
      const startWeek = startOfWeek(interval.start, { weekStartsOn: 1 });
      const endWeek = endOfWeek(interval.end, { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({ start: startWeek, end: endWeek });
      const weeks: { date: Date; inRange: boolean; dayNum: number; pl: number; count: number }[][] = [];
      for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7).map(d => {
          const dateStr = format(d, 'yyyy-MM-dd');
          const inRange = isWithinInterval(d, { start: interval.start, end: interval.end });
          const data = dayMap.get(dateStr) || { pl: 0, count: 0 };
          return { date: d, inRange, dayNum: d.getDate(), pl: data.pl, count: data.count };
        }));
      }
      return { weeks, totalPL, monthIdx };
    };

    return calendarMonthsToShow.map(buildGrid);
  }, [isCalendarMode, calendarYear, calendarMonthsToShow, trades]);

  // Balance total: sum of market values of open positions
  const totalMarketValue = useMemo(() =>
    openPositions.reduce((sum: number, p: any) => sum + (p.marketValue || 0), 0),
  [openPositions]);

  // Pie chart data
  const pieByInstrument = useMemo(() => {
    const groups: Record<string, number> = {};
    openPositions.forEach((p: any) => {
      const key = p.instrumentType || 'STOCK';
      groups[key] = (groups[key] || 0) + (p.marketValue || 0);
    });
    const colors: Record<string, string> = { STOCK: '#3b82f6', CEDEAR: '#8b5cf6', CRYPTO: '#f59e0b' };
    return Object.entries(groups).map(([label, value]) => ({ label, value, color: colors[label] || '#6b7280' }));
  }, [openPositions]);

  const pieByCuenta = useMemo(() => {
    const groups: Record<string, number> = {};
    openPositions.forEach((p: any) => {
      const key = p.cuenta || 'USA';
      groups[key] = (groups[key] || 0) + (p.marketValue || 0);
    });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return Object.entries(groups).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [openPositions]);

  const pieByBroker = useMemo(() => {
    const groups: Record<string, number> = {};
    openPositions.forEach((p: any) => {
      const key = p.broker || 'Sin broker';
      groups[key] = (groups[key] || 0) + (p.marketValue || 0);
    });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    return Object.entries(groups).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [openPositions]);

  const handleSaveOperation = async (data: any) => {
    try {
      if (editingOperation?.id) {
        // Edit mode
        await updateOperation(editingOperation.id, {
          symbol: data.symbol?.toUpperCase(),
          quantity: data.quantity,
          price: data.entryPrice,
          broker: data.broker,
          cuenta: data.cuenta,
          isFalopa: data.isFalopa,
          isIntra: data.isIntra,
          date: data.entryDate ? new Date(data.entryDate + 'T12:00:00') : undefined,
        });
        setEditingOperation(null);
        navigateBack();
        await fetchData();
        return;
      }

      // Create mode
      await createOperation({
        date: data.entryDate,
        symbol: data.symbol.toUpperCase(),
        quantity: data.quantity,
        price: data.entryPrice,
        broker: data.broker,
        cuenta: data.cuenta || 'USA',
        type: data.type || "BUY",
        isFalopa: data.isFalopa,
        isIntra: data.isIntra,
      });

      if (data.pendingCloseOpId) {
        await closeTradeWithQuantity({
          symbol: data.symbol.toUpperCase(),
          closeDate: data.pendingCloseDate,
          closePrice: data.pendingClosePrice,
          totalQty: data.pendingCloseQty,
          broker: data.broker,
          primaryOpenOperationId: data.pendingCloseOpId,
        });
      }

      navigateBack();
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

  const handleClosePosition = async (openOpId: number, quantity?: number, price?: number, date?: string) => {
    const pos = openPositions.find((p: any) => p.id === openOpId);
    if (!pos) return;
    const closeQty = quantity ?? (pos as any).quantity;
    const closePrice = price ?? (pos as any).currentPrice;
    const closeDate = date ?? new Date().toISOString().split('T')[0];
    await closeTradeWithQuantity({
      symbol: (pos as any).symbol,
      closeDate,
      closePrice,
      totalQty: closeQty,
      broker: (pos as any).broker,
      primaryOpenOperationId: openOpId,
    });
    navigateBack();
    await fetchData();
  };

  const handleSaveCashFlow = async (data: {
    date: string; amount: number; type: "DEPOSIT" | "WITHDRAWAL"; broker: string; cuenta: string; description?: string;
  }) => {
    await addMemoryCashFlow(data);
    navigateBack();
    await fetchData();
  };

  const handleDeleteOp = async (row: any) => {
    if (!confirm(`¿Eliminar operación #${row.id} (${row.symbol})?`)) return;
    await deleteOperation(row.id);
    fetchData();
  };

  const handleViewOp = (row: any) => {
    setViewingItem({ type: 'operation', data: row });
  };

  const handleEditOp = (row: any) => {
    setEditingOperation(row);
    navigateTo("nueva-op");
  };

  const handleViewTrade = (row: any) => {
    setViewingItem({ type: 'trade', data: row });
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
      const isOpenTrade = view === 'trades' && !item.isClosed;
      if (!isOpenTrade) {
        const rawDate = item.date ?? item.closeDate ?? item.openDate;
        if (rawDate) {
          const itemDate = new Date(rawDate);
          if (!isWithinInterval(itemDate, activeInterval)) return false;
        }
      }

      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        if (!item.symbol?.toLowerCase().includes(term) && !item.broker?.toLowerCase().includes(term)) return false;
      }

      if (view === 'operations') {
        if (brokerFilters.length > 0 && !brokerFilters.includes(item.broker)) return false;
        if (cuentaFilters.length > 0 && !cuentaFilters.includes(item.cuenta)) return false;
      }

      if (view === 'trades') {
        if (instrumentFilters.length > 0 && !instrumentFilters.includes(item.instrumentType)) return false;
        if (tradeEstadoFilters.length > 0) {
          const estado = item.isClosed ? 'Cerrados' : 'Abiertos';
          if (!tradeEstadoFilters.includes(estado)) return false;
        }
      }

      return true;
    });
  }, [operations, trades, openPositions, view, activeInterval, searchQuery, brokerFilters, cuentaFilters, instrumentFilters, tradeEstadoFilters]);

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
    { key: "isFalopa", header: "Falopa", align: "center", render: (v) => v ? <span className="text-orange-400 font-bold text-[10px]">SÍ</span> : <span className="text-zinc-600 text-[10px]">—</span> },
    { key: "isIntra", header: "Intra", align: "center", render: (v) => v ? <span className="text-purple-400 font-bold text-[10px]">SÍ</span> : <span className="text-zinc-600 text-[10px]">—</span> },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "cuenta", header: "Cuenta", align: "center", sortable: true },
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
    { key: "isClosed", header: "Estado", align: "center", render: (v) => <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", v ? "bg-zinc-700 text-zinc-400" : "bg-blue-900/30 text-blue-400")}>{v ? "CERRADO" : "ABIERTO"}</span> },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "cuenta", header: "Cuenta", align: "center", sortable: true },
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
              { id: "cuentas", label: "Cuentas", icon: Briefcase },
              { id: "brokers", label: "Brokers", icon: Wallet },
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
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => navigateTo("ie")}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "ie" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
              <DollarSign className="w-3.5 h-3.5" />
              I/E
            </button>
            <button
              onClick={() => { setEditingOperation(null); navigateTo("nueva-op"); }}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "nueva-op" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Op.
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {refreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
        </div>
      </nav>

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

      {viewingItem && (
        <ViewDetailModal
          type={viewingItem.type}
          data={viewingItem.data}
          onClose={() => setViewingItem(null)}
        />
      )}

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* Filter Bar — oculto en vista Cuentas, Nueva Op y I/E */}
        {view !== "cuentas" && view !== "brokers" && view !== "nueva-op" && view !== "ie" && (
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Buscar por símbolo, broker o instrumento..."
            hideSearch={view === "dashboard"}
            extraFilters={
              <div className="ml-auto flex items-center gap-3 flex-wrap">
                {view === "dashboard" && cuentas.length > 0 && (
                  <DropdownMultiCheck
                    label="Cuenta"
                    options={cuentas.map((c: any) => c.nombre)}
                    selected={selectedCuentas}
                    onChange={(next) => {
                      setSelectedCuentas(next);
                      localStorage.setItem('gemini-capital-selected-cuentas', JSON.stringify(next));
                    }}
                    allLabel="Todas"
                  />
                )}
                {view === "dashboard" && isCalendarMode && (
                  <DropdownMultiCheck
                    label="Mes"
                    options={["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]}
                    selected={selectedCalendarMonths.map(m => ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][Number(m)])}
                    onChange={(names) => {
                      const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                      setSelectedCalendarMonths(names.map(n => String(monthNames.indexOf(n))));
                    }}
                    allLabel="Todos"
                  />
                )}
                {view === "dashboard" && availableYears.length > 0 && (
                  <DropdownMultiCheck
                    label="Año"
                    options={availableYears.map(String)}
                    selected={selectedYears}
                    onChange={handleYearsChange}
                    allLabel="Todos"
                  />
                )}
                <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Sistema Online</span>
                </div>
              </div>
            }
          />
        )}

        {/* --- DASHBOARD VIEW --- */}
        {view === "dashboard" && yields && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Resultado Neto + Balance Total */}
            <div className="flex gap-4">
              {stats && (
                <div className="flex-1 bg-gradient-to-br from-blue-900/20 to-zinc-900 border border-blue-500/10 p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-32 h-32 text-blue-500" /></div>
                  <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">Resultado Neto</p>
                  <h2 className={cn("text-4xl font-black tracking-tight z-10 relative", stats.netProfit >= 0 ? "text-white" : "text-red-400")}>
                    ${stats.netProfit.toLocaleString()}
                  </h2>
                  <div className="flex gap-6 mt-4 z-10 relative">
                    <div><p className="text-[9px] font-bold text-zinc-500 uppercase">Gross Profit</p><p className="text-sm font-bold text-emerald-400">+${stats.grossProfit.toLocaleString()}</p></div>
                    <div><p className="text-[9px] font-bold text-zinc-500 uppercase">Gross Loss</p><p className="text-sm font-bold text-red-400">-${stats.grossLoss.toLocaleString()}</p></div>
                  </div>
                </div>
              )}
              <div className="bg-gradient-to-br from-emerald-900/20 to-zinc-900 border border-emerald-500/10 p-6 rounded-2xl relative overflow-hidden flex-1">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-32 h-32 text-emerald-500" /></div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Balance Total</p>
                <h2 className="text-4xl font-black tracking-tight text-white">
                  ${Math.round(totalMarketValue).toLocaleString()}
                </h2>
                <div className="flex gap-6 mt-4">
                  <div><p className="text-[9px] font-bold text-zinc-500 uppercase">Posiciones</p><p className="text-sm font-bold text-emerald-400">{openPositions.length}</p></div>
                </div>
              </div>
            </div>

            {/* Yields Grid / Calendar */}
            {/* Month names for CalendarGrid titles */}
            <div className="space-y-4">
              {isCalendarMode && calendarData ? (
                <div className="space-y-6">
                  {calendarData.map((grid) => {
                    const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                    return (
                      <div key={grid.monthIdx}>
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-2 px-1">
                          {MONTH_NAMES[grid.monthIdx]} {calendarYear}
                        </p>
                        <CalendarGrid weeks={grid.weeks} totalPL={grid.totalPL} />
                      </div>
                    );
                  })}
                </div>
              ) : yields.yearGroups ? (
                <div className="space-y-6">
                  {(selectedYears.length > 0
                    ? yields.yearGroups.filter((grp: any) => selectedYears.includes(String(grp.year)))
                    : yields.yearGroups
                  ).map((grp: any) => (
                    <YieldsGrid
                      key={grp.year}
                      title={String(grp.year)}
                      cuentas={grp.cuentas || []}
                      rows={grp.rows}
                      totals={grp.totals}
                      selectedCuentas={selectedCuentas}
                    />
                  ))}
                </div>
              ) : (
                <YieldsGrid
                  title={year ? String(year) : "Rendimientos"}
                  cuentas={yields.cuentas || []}
                  rows={yields.rows}
                  totals={yields.totals}
                  selectedCuentas={selectedCuentas}
                />
              )}
            </div>
          </div>
        )}

        {/* --- ANALYTICS VIEW (15+ Metrics) --- */}
        {view === "analytics" && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Summary MetricCards */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard title="Operaciones Abiertas" value={String(summary.openOperations)} subtitle="posiciones activas" accentColor="blue" />
                <MetricCard title="Trades Cerrados" value={String(summary.totalTrades)} subtitle={`${summary.positiveTrades} ganadoras`} accentColor="emerald" />
                <MetricCard title="Tasa de Victorias" value={`${stats.winRate.toFixed(1)}%`} subtitle="trades positivos" accentColor={stats.winRate >= 50 ? "emerald" : "orange"} />
                <MetricCard title="Tamaño Promedio" value={summary.avgTradeSize > 0 ? `$${Math.round(summary.avgTradeSize).toLocaleString()}` : "$0"} subtitle="monto promedio" accentColor="purple" />
              </div>
            )}

            {/* Tasa de Victorias / Factor de Beneficio / Drawdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Tasa de Victorias", val: `${stats.winRate.toFixed(1)}%`, sub: `${stats.totalTrades} Trades`, icon: Trophy, color: "text-orange-400", desc: "Porcentaje de victorias o éxitos obtenidos sobre el total de operaciones realizadas." },
                { label: "Factor de Beneficio", val: stats.profitFactor.toFixed(2), sub: "Riesgo/Beneficio", icon: Activity, color: "text-blue-400", desc: "Relación entre ganancias brutas y pérdidas brutas. Mayor a 1.5 es bueno, mayor a 2 es excelente." },
                { label: "Drawdown Máximo", val: `$${Math.round(stats.maxDrawdown).toLocaleString()}`, sub: "Riesgo Máximo", icon: AlertCircle, color: "text-red-400", desc: "La máxima reducción del capital desde un pico hasta un valle. Mide el riesgo real del sistema." },
              ].map((card, i) => (
                <div key={i} onClick={() => setActiveTooltip(activeTooltip === i ? null : i)}
                  className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all cursor-pointer select-none">
                  <card.icon className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-all", card.color)} />
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{card.label}</p>
                  <p className={cn("text-2xl font-black tabular-nums", card.color)}>{card.val}</p>
                  <p className="text-[10px] font-medium text-zinc-600 mt-1">{card.sub}</p>
                  {activeTooltip === i && (
                    <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed border-t border-white/5 pt-3">{card.desc}</p>
                  )}
                </div>
              ))}
            </div>

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
                        <td className={cn("py-1 px-4 text-right font-black", t.returnAmount >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.round(t.returnAmount).toLocaleString()}</td>
                        <td className={cn("py-1 px-4 text-right font-bold", t.returnPercent >= 0 ? "text-emerald-500" : "text-red-500")}>{t.returnPercent.toFixed(1)}%</td>
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🗓 Mejor Mes</p>
                    <p className="text-2xl font-black text-emerald-400">${Math.round(topStats.bestMonth.total).toLocaleString()}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{topStats.bestMonth.month}</p>
                  </div>
                )}
                {topStats.bestReturnTrade && (
                  <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🏆 Mejor Trade</p>
                    <p className="text-2xl font-black text-emerald-400">{topStats.bestReturnTrade.returnPercent.toFixed(1)}%</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{topStats.bestReturnTrade.symbol} · ${Math.round(topStats.bestReturnTrade.returnAmount).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { l: "Ratio de Sharpe", v: stats.sharpeRatio.toFixed(2), c: "text-purple-400", i: PieChart, d: "Mide el rendimiento ajustado por riesgo. Un Sharpe mayor a 1 es bueno, mayor a 2 es excelente." },
                { l: "Ratio de Sortino", v: stats.sortinoRatio.toFixed(2), c: "text-purple-400", i: PieChart, d: "Similar al Sharpe pero solo considera la volatilidad negativa. Mayor a 2 es excelente." },
                { l: "Expectativa", v: `$${Math.round(stats.expectancy)}`, c: "text-emerald-400", i: DollarSign, d: "Ganancia promedio esperada por operación. Debe ser positiva para un sistema rentable." },
                { l: "Factor Recuperación", v: stats.recoveryFactor.toFixed(2), c: "text-blue-400", i: Activity, d: "Relación entre la ganancia neta y el drawdown máximo. Mayor a 3 es bueno." },
                { l: "SQN", v: stats.sqn.toFixed(2), c: "text-yellow-400", i: Trophy, d: "System Quality Number. Mayor a 3 es bueno, mayor a 5 es excelente." },
                { l: "Criterio de Kelly", v: `${stats.kellyPercent.toFixed(1)}%`, c: "text-zinc-300", i: Scale, d: "Porcentaje óptimo del capital a arriesgar por operación según la fórmula de Kelly." },
                { l: "Ganancia Promedio", v: `$${Math.round(stats.avgWin).toLocaleString()}`, c: "text-emerald-500", i: ArrowUpRight, d: "Importe promedio ganado en las operaciones positivas." },
                { l: "Pérdida Promedio", v: `$${Math.round(stats.avgLoss).toLocaleString()}`, c: "text-red-500", i: ArrowDownRight, d: "Importe promedio perdido en las operaciones negativas." },
                { l: "Ratio G/P", v: stats.payoffRatio.toFixed(2), c: "text-zinc-400", i: Percent, d: "Relación entre la ganancia promedio y la pérdida promedio. Mayor a 1 es favorable." },
                { l: "Mayor Ganancia", v: `$${Math.round(stats.maxWin).toLocaleString()}`, c: "text-emerald-600", i: TrendingUp, d: "La mayor ganancia individual obtenida en una sola operación." },
                { l: "Mayor Pérdida", v: `$${Math.round(stats.maxLoss).toLocaleString()}`, c: "text-red-600", i: TrendingDown, d: "La mayor pérdida individual sufrida en una sola operación." },
                { l: "Racha Ganadora", v: stats.maxWinStreak, c: "text-emerald-400", i: Layers, d: "Número máximo de operaciones ganadoras consecutivas." },
                { l: "Racha Perdedora", v: stats.maxLossStreak, c: "text-red-400", i: Layers, d: "Número máximo de operaciones perdedoras consecutivas." },
                { l: "Tiempo Promedio", v: `${Math.round(stats.avgHoldingTime)}d`, c: "text-zinc-500", i: Clock, d: "Duración promedio de las operaciones en días." },
                { l: "Comisiones", v: "$0", c: "text-zinc-600", i: Wallet, d: "Total de comisiones pagadas en las operaciones registradas." },
              ].map((m, i) => {
                const idx = 100 + i;
                return (
                  <div key={i} onClick={() => setActiveTooltip(activeTooltip === idx ? null : idx)}
                    className="bg-zinc-900/40 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center group hover:border-blue-500/20 transition-all cursor-pointer select-none">
                    <m.i className={cn("w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-opacity", m.c)} />
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">{m.l}</p>
                    <p className={cn("text-lg font-black tabular-nums", m.c)}>{m.v}</p>
                    {activeTooltip === idx && (
                      <p className="mt-2 text-[10px] text-zinc-400 leading-relaxed border-t border-white/5 pt-2 text-left">{m.d}</p>
                    )}
                  </div>
                );
              })}
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
            {/* Gráficos de Torta — Tenencia por tipo y por cuenta */}
            {(pieByInstrument.length > 0 || pieByCuenta.length > 0 || pieByBroker.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pieByInstrument.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
                    <PieChartComponent data={pieByInstrument} title="Tenencia por Tipo de Activo" size={120} />
                  </div>
                )}
                {pieByCuenta.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
                    <PieChartComponent data={pieByCuenta} title="Tenencia por Cuenta" size={120} />
                  </div>
                )}
                {pieByBroker.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
                    <PieChartComponent data={pieByBroker} title="Tenencia por Broker" size={120} />
                  </div>
                )}
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
                <DropdownMultiCheck
                  label="Broker"
                  options={brokers.map((b: any) => b.nombre)}
                  selected={brokerFilters}
                  onChange={setBrokerFilters}
                />
                <DropdownMultiCheck
                  label="Cuenta"
                  options={cuentas.map((c: any) => c.nombre)}
                  selected={cuentaFilters}
                  onChange={setCuentaFilters}
                  allLabel="Todas"
                />
              </div>
            )}

            {/* Filtros extra para trades */}
            {view === "trades" && (
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMultiCheck
                  label="Estado"
                  options={["Abiertos", "Cerrados"]}
                  selected={tradeEstadoFilters}
                  onChange={setTradeEstadoFilters}
                />
                <DropdownMultiCheck
                  label="Instrumento"
                  options={["STOCK", "CEDEAR", "CRYPTO"]}
                  selected={instrumentFilters}
                  onChange={setInstrumentFilters}
                />
              </div>
            )}

            {/* Open Positions: tabla inline */}
            {view === "open" && (() => {
              const totalOpen = filteredList.length;
              const pageCount = openPageSize === 0 ? 1 : Math.ceil(totalOpen / openPageSize);
              const paginated = openPageSize === 0 ? filteredList : filteredList.slice((openPage - 1) * openPageSize, openPage * openPageSize);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-medium">{totalOpen} posición{totalOpen !== 1 ? "es" : ""}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-600 uppercase font-bold mr-1">Mostrar</span>
                      {[25, 50, 100, 0].map(n => (
                        <button key={n} onClick={() => { setOpenPageSize(n); setOpenPage(1); }}
                          className={cn("px-2.5 py-1 rounded text-[10px] font-bold transition-all", openPageSize === n ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                          {n === 0 ? "Todos" : n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                            <th className="py-3 px-4 text-center">Fecha</th>
                            <th className="py-3 px-4 text-center">Símbolo</th>
                            <th className="py-3 px-4 text-right">Cantidad</th>
                            <th className="py-3 px-4 text-right">P.Entrada</th>
                            <th className="py-3 px-4 text-right">P.Actual</th>
                            <th className="py-3 px-4 text-right">P&amp;L Latente</th>
                            <th className="py-3 px-4 text-center">Broker</th>
                            <th className="py-3 px-4 text-center">Cuenta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {paginated.map((item: any) => (
                            <tr key={item.id} className="group hover:bg-white/[0.03] transition-colors h-[34px] text-[12px]">
                              <td className="py-0 px-4 text-center text-zinc-500 font-medium whitespace-nowrap">
                                {format(new Date(item.date ?? item.openDate), "dd/MM/yyyy")}
                              </td>
                              <td className="py-0 px-4 text-center">
                                <span className="px-1.5 py-0.5 bg-white/5 text-zinc-300 rounded text-[10px] font-black uppercase tracking-tighter border border-white/10">
                                  {item.symbol}
                                </span>
                              </td>
                              <td className="py-0 px-4 text-right font-bold text-white">{item.quantity}</td>
                              <td className="py-0 px-4 text-right text-zinc-400">${item.openPrice?.toFixed(2)}</td>
                              <td className="py-0 px-4 text-right text-zinc-200">${item.currentPrice?.toFixed(2)}</td>
                              <td className={cn("py-0 px-4 text-right font-black", item.unrealizedPL >= 0 ? "text-emerald-400" : "text-red-400")}>
                                ${Math.round(item.unrealizedPL).toLocaleString()} <span className="text-[10px] opacity-70">({item.unrealizedPLPercent?.toFixed(1)}%)</span>
                              </td>
                              <td className="py-0 px-4 text-center font-bold text-zinc-500">{item.broker}</td>
                              <td className="py-0 px-4 text-center font-bold text-zinc-500">{item.cuenta ?? 'USA'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {openPageSize > 0 && pageCount > 1 && (
                    <div className="flex items-center justify-center gap-1">
                      {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setOpenPage(p)}
                          className={cn("w-7 h-7 rounded text-[11px] font-bold transition-all", openPage === p ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

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

        {/* --- NUEVA OPERACIÓN VIEW --- */}
        {view === "nueva-op" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TradeForm
              inline
              onClose={() => { setEditingOperation(null); navigateBack(); }}
              onSave={handleSaveOperation}
              onClosePosition={handleClosePosition}
              openPositions={openPositions as any}
              initialData={editingOperation ? {
                id: editingOperation.id,
                symbol: editingOperation.symbol,
                entryDate: editingOperation.date ? new Date(editingOperation.date).toISOString().split('T')[0] : '',
                quantity: Math.abs(editingOperation.quantity || 0),
                entryPrice: editingOperation.price,
                broker: editingOperation.broker,
                cuenta: editingOperation.cuenta || 'USA',
                type: editingOperation.type,
                isFalopa: editingOperation.isFalopa,
                isIntra: editingOperation.isIntra,
                isClosed: editingOperation.isClosed,
              } : undefined}
            />
          </div>
        )}

        {/* --- INGRESOS / EGRESOS VIEW --- */}
        {view === "ie" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CashFlowForm
              inline
              onClose={() => navigateBack()}
              onSave={handleSaveCashFlow}
            />
          </div>
        )}

        {/* --- CUENTAS VIEW --- */}
        {view === "cuentas" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CuentasSection
              cuentas={cuentas}
              onAdd={async (nombre, descripcion) => {
                await addMemoryCuenta(nombre, descripcion);
                setCuentas(await getMemoryCuentas());
              }}
              onRemove={async (id) => {
                await removeMemoryCuenta(id);
                setCuentas(await getMemoryCuentas());
              }}
              onEdit={async (id, nombre, descripcion) => {
                await updateMemoryCuenta(id, nombre, descripcion);
                setCuentas(await getMemoryCuentas());
              }}
            />
          </div>
        )}

        {/* --- BROKERS VIEW --- */}
        {view === "brokers" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <BrokersSection
              brokers={brokers}
              onAdd={async (nombre, descripcion) => {
                await addMemoryBroker(nombre, descripcion);
                setBrokers(await getMemoryBrokers());
              }}
              onRemove={async (id) => {
                await removeMemoryBroker(id);
                setBrokers(await getMemoryBrokers());
              }}
              onEdit={async (id, nombre, descripcion) => {
                await updateMemoryBroker(id, nombre, descripcion);
                setBrokers(await getMemoryBrokers());
              }}
            />
          </div>
        )}

      </main>
    </div>
  );
}
