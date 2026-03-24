/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard, Activity, List, History,
  TrendingUp, TrendingDown, DollarSign,
  Briefcase, Percent, Clock, PieChart, Wallet,
  Trophy, AlertCircle, Plus, RefreshCw,
  ArrowUpRight, ArrowDownRight, Layers, Scale, Check, X, Settings,
  User, Globe, Bell, Palette, Languages, BarChart3, Upload, LogOut
} from "lucide-react";
import {
  format, startOfToday, endOfToday,
  startOfWeek, endOfWeek, subDays, startOfMonth, endOfMonth,
  subMonths, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval
} from "date-fns";
import { cn, getInstrumentType } from "@/lib/utils";
import YieldsGrid from "@/components/dashboard/YieldsGrid";
import CalendarGrid from "@/components/dashboard/CalendarGrid";
import PieChartComponent from "@/components/ui/PieChart";
import MetricCard from "@/components/ui/MetricCard";
import FilterBar, { DateFilter } from "@/components/ui/FilterBar";
import DataTable, { ColumnDef } from "@/components/ui/DataTable";
import CloseTradeModal from "@/components/trades/CloseTradeModal";
import CashFlowForm from "@/components/cashflow/CashFlowForm";
import ViewDetailModal from "@/components/ui/ViewDetailModal";
import AccountsSection from "@/components/cuentas/AccountsSection";
import BrokersSection from "@/components/brokers/BrokersSection";

// Server Actions
import { getYieldsData as getYields, getStats, getDashboardSummary, getTopStats, getEquityCurve } from "@/server/actions/dashboard";
import { getExecutions, getTradeUnits, createExecution, deleteExecution, deleteTradeUnit, updateExecution, closeTradeUnitWithQuantity, getOpenExecutionsForClosing, previewBulkImport, confirmBulkImportWithTrades } from "@/server/actions/trades";
import { addMemoryCashFlow, getMemoryCashFlows, removeMemoryCashFlow, updateMemoryCashFlow, getMemoryAccounts, addMemoryAccount, removeMemoryAccount, updateMemoryAccount, getMemoryBrokers, addMemoryBroker, updateMemoryBroker, removeMemoryBroker, updateAccountMatchingStrategy } from "@/server/actions/transactions";
import { logout } from "@/server/actions/auth";
import TradeForm from "@/components/trades/TradeForm";
import ImportCSVView from "@/components/trades/ImportCSVView";
import DropdownMultiCheck from "@/components/ui/DropdownMultiCheck";
import { exportToCSV, downloadCSV } from "@/lib/csv-exporter";

// Tipos
type View = "dashboard" | "analytics" | "transactions" | "trade-units" | "cuentas" | "brokers" | "nueva-trans" | "ie" | "movimientos" | "configuraciones" | "importar-csv";

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
    closeDate: string; broker: string; account: string;
    openOps: Array<{ id: number; date: Date; qty: number; price: number; amount: number; broker: string; account: string; days: number }>;
    strategy: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL';
  } | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);
  const [brokerFilters, setBrokerFilters] = useState<string[]>([]);
  const [instrumentFilters, setInstrumentFilters] = useState<string[]>([]);
  const [accountFilters, setAccountFilters] = useState<string[]>([]);
  const [selectedCalendarMonths, setSelectedCalendarMonths] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [openPage, setOpenPage] = useState(1);

  // Trade Units view mode
  const [tuViewMode, setTuViewMode] = useState<'detail' | 'grouped'>('detail');
  const [groupBy, setGroupBy] = useState<string[]>(['symbol']);
  const [tuStatusFilter, setTuStatusFilter] = useState<string>('OPEN');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [configSaved, setConfigSaved] = useState<Record<number, boolean>>({});
  const [configSection, setConfigSection] = useState("mi-cuenta");
  const [groupedSortKey, setGroupedSortKey] = useState<string>('symbol');
  const [groupedSortDir, setGroupedSortDir] = useState<'asc' | 'desc'>('asc');
  const [groupedPageSize, setGroupedPageSize] = useState<number>(25);
  const [groupedShowAll, setGroupedShowAll] = useState<boolean>(false);

  // Modal/Edit State
  const [editingExecution, setEditingExecution] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<{ type: 'operation' | 'trade'; data: any } | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // Data State
  const [stats, setStats] = useState<any>(null);
  const [yields, setYields] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [tradeUnits, setTradeUnits] = useState<any[]>([]);
  const [cashFlows, setCashFlows] = useState<any[]>([]);
  const [editingCfId, setEditingCfId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ date: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amount: string; broker: string; account: string; description: string } | null>(null);
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
      const [execs, tus, st, yld, summ, top, accountsList, brokersList, cfs] = await Promise.all([
        getExecutions(),
        getTradeUnits(),
        getStats(activeInterval.start, activeInterval.end),
        getYields(year),
        getDashboardSummary(activeInterval.start, activeInterval.end),
        getTopStats(activeInterval.start, activeInterval.end),
        getMemoryAccounts(),
        getMemoryBrokers(),
        getMemoryCashFlows(),
      ]);
      setExecutions(execs);
      setTradeUnits(tus);
      setStats(st);
      setYields(yld);
      setSummary(summ);
      setTopStats(top);
      setAccounts(accountsList);
      setBrokers(brokersList);
      setCashFlows(cfs);

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

  // Load selectedAccounts from localStorage (SSR-safe)
  useEffect(() => {
    const saved = localStorage.getItem('gemini-capital-selected-cuentas');
    if (saved) {
      try { setSelectedAccounts(JSON.parse(saved)); } catch { /* ignore */ }
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
  const navigateBack = () => setView(prevView === "nueva-trans" || prevView === "ie" || prevView === "cuentas" || prevView === "brokers" || prevView === "movimientos" || prevView === "configuraciones" || prevView === "importar-csv" ? "dashboard" : prevView);

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
    executions.forEach((exec: any) => { if (exec.date) years.add(new Date(exec.date).getFullYear()); });
    tradeUnits.forEach((t: any) => { if (t.entryDate) years.add(new Date(t.entryDate).getFullYear()); });
    return [...years].sort((a, b) => b - a);
  }, [executions, tradeUnits]);

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
    tradeUnits.forEach((t: any) => {
      if (t.status !== 'CLOSED' || !t.entryDate || !t.exitDate) return;
      const openStr = toDateStr(t.entryDate);
      const closeStr = toDateStr(t.exitDate);
      if (openStr !== closeStr) return;
      const existing = dayMap.get(openStr) || { pl: 0, count: 0 };
      dayMap.set(openStr, { pl: existing.pl + (t.pnlNominal || 0), count: existing.count + 1 });
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
  }, [isCalendarMode, calendarYear, calendarMonthsToShow, tradeUnits]);

  // Balance total: sum of market values of open trade units
  const totalMarketValue = useMemo(() =>
    tradeUnits
      .filter((t: any) => t.status === 'OPEN')
      .reduce((sum: number, t: any) => sum + (t.exitAmount || t.entryAmount || 0), 0),
  [tradeUnits]);

  // Pie chart data from open trade units
  const pieByInstrument = useMemo(() => {
    const groups: Record<string, number> = {};
    tradeUnits.filter((t: any) => t.status === 'OPEN').forEach((t: any) => {
      const key = getInstrumentType(t.symbol as string);
      groups[key] = (groups[key] || 0) + (t.exitAmount || t.entryAmount || 0);
    });
    const colors: Record<string, string> = { STOCK: '#3b82f6', CEDEAR: '#8b5cf6', CRYPTO: '#f59e0b' };
    return Object.entries(groups).map(([label, value]) => ({ label, value, color: colors[label] || '#6b7280' }));
  }, [tradeUnits]);

  const pieByAccount = useMemo(() => {
    const groups: Record<string, number> = {};
    tradeUnits.filter((t: any) => t.status === 'OPEN').forEach((t: any) => {
      const key = t.account || 'USA';
      groups[key] = (groups[key] || 0) + (t.exitAmount || t.entryAmount || 0);
    });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return Object.entries(groups).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [tradeUnits]);

  const pieByBroker = useMemo(() => {
    const groups: Record<string, number> = {};
    tradeUnits.filter((t: any) => t.status === 'OPEN').forEach((t: any) => {
      const key = t.broker || 'Sin broker';
      groups[key] = (groups[key] || 0) + (t.exitAmount || t.entryAmount || 0);
    });
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];
    return Object.entries(groups).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
  }, [tradeUnits]);

  const handleSaveExecution = async (data: any) => {
    try {
      if (editingExecution?.id) {
        // Edit mode
        await updateExecution(editingExecution.id, {
          symbol: data.symbol?.toUpperCase(),
          qty: data.qty,
          price: data.entryPrice,
          broker: data.broker,
          account: data.account,
          date: data.entryDate ? new Date(data.entryDate + 'T12:00:00') : undefined,
          currency: data.currency,
          commissions: data.commissions,
        });
        setEditingExecution(null);
        navigateBack();
        await fetchData();
        return;
      }

      // Create mode
      await createExecution({
        date: data.entryDate,
        symbol: data.symbol.toUpperCase(),
        qty: data.qty,
        price: data.entryPrice,
        broker: data.broker,
        account: data.account || 'USA',
        side: data.side || "BUY",
        currency: data.currency || 'USD',
        commissions: data.commissions || 0,
      });

      // Cierre MANUAL: usa pendingCloseOpId
      if (data.pendingCloseOpId && data.pendingCloseQty && data.pendingClosePrice) {
        await closeTradeUnitWithQuantity({
          symbol: data.symbol.toUpperCase(),
          closeDate: data.pendingCloseDate,
          closePrice: data.pendingClosePrice,
          totalQty: data.pendingCloseQty,
          broker: data.broker,
          account: data.account || 'USA',
          primaryEntryExecId: data.pendingCloseOpId,
          strategy: 'MANUAL',
        });
      }
      // Cierre AUTOMÁTICO por estrategia (FIFO/LIFO/etc)
      else if (data.pendingCloseStrategy && data.pendingCloseQty && data.pendingClosePrice) {
        await closeTradeUnitWithQuantity({
          symbol: data.symbol.toUpperCase(),
          closeDate: data.pendingCloseDate,
          closePrice: data.pendingClosePrice,
          totalQty: data.pendingCloseQty,
          broker: data.broker,
          account: data.account || 'USA',
          primaryEntryExecId: 0, // no importa para estrategias automáticas
          strategy: data.pendingCloseStrategy,
        });
      }

      navigateBack();
      await fetchData();
    } catch (e) {
      console.error("Error al guardar:", e);
    }
  };

  const handleConfirmClose = async (entryExecId: number) => {
    if (!closeModalData) return;
    await closeTradeUnitWithQuantity({
      symbol: closeModalData.symbol,
      closeDate: closeModalData.closeDate,
      closePrice: closeModalData.closePrice,
      totalQty: closeModalData.closeQuantity,
      broker: closeModalData.broker,
      account: closeModalData.account,
      primaryEntryExecId: entryExecId,
      strategy: closeModalData.strategy,
    });
    setCloseModalData(null);
    await fetchData();
  };

  const handleSaveCashFlow = async (data: {
    date: string; amount: number; type: "DEPOSIT" | "WITHDRAWAL"; broker: string; account: string; description?: string;
  }) => {
    await addMemoryCashFlow(data);
    setCashFlows(await getMemoryCashFlows());
    setView("movimientos");
  };

  const handleEditCashFlow = (row: any) => {
    setEditingCfId(row.id);
    const d = row.date instanceof Date ? row.date : new Date(String(row.date) + 'T12:00:00');
    setEditDraft({
      date: d.toISOString().slice(0, 10),
      type: row.type,
      amount: String(Math.abs(row.amount)),
      broker: row.broker || '',
      account: row.account || 'USA',
      description: row.description || '',
    });
  };

  const handleCancelEditCashFlow = () => {
    setEditingCfId(null);
    setEditDraft(null);
  };

  const handleSaveCashFlowEdit = async () => {
    if (!editDraft || !editingCfId) return;
    const amt = parseFloat(editDraft.amount);
    if (isNaN(amt) || amt <= 0) return;
    await updateMemoryCashFlow(editingCfId, {
      date: editDraft.date,
      amount: Math.abs(amt),
      type: editDraft.type,
      broker: editDraft.broker,
      account: editDraft.account,
      description: editDraft.description || undefined,
    });
    setCashFlows(await getMemoryCashFlows());
    setEditingCfId(null);
    setEditDraft(null);
  };

  const handleDeleteExecution = async (row: any) => {
    if (!confirm(`¿Eliminar transacción #${row.id} (${row.symbol})?`)) return;
    await deleteExecution(row.id);
    fetchData();
  };

  const handleViewExecution = (row: any) => {
    setViewingItem({ type: 'operation', data: row });
  };

  const handleEditExecution = (row: any) => {
    setEditingExecution(row);
    navigateTo("nueva-trans");
  };

  const handleViewTradeUnit = (row: any) => {
    setViewingItem({ type: 'trade', data: row });
  };

  const handleEditTradeUnit = (row: any) => {
    alert(`Edición de trade unit #${row.id} — próximamente`);
  };

  const handleDeleteTradeUnit = async (row: any) => {
    if (!confirm(`¿Eliminar trade unit #${row.id} (${row.symbol})?`)) return;
    await deleteTradeUnit(row.id);
    fetchData();
  };

  const handleExportExecutions = () => {
    const csv = exportToCSV(filteredList, [
      { key: 'date', header: 'Fecha' }, { key: 'symbol', header: 'Símbolo' },
      { key: 'side', header: 'Lado' }, { key: 'qty', header: 'Cant.' },
      { key: 'price', header: 'P.Entrada' }, { key: 'amount', header: 'M.Entrada' },
      { key: 'broker', header: 'Broker' }, { key: 'account', header: 'Cuenta' },
      { key: 'currency', header: 'Moneda' }, { key: 'commissions', header: 'Comis.' },
    ]);
    downloadCSV(csv, `ejecuciones-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportTradeUnits = () => {
    const csv = exportToCSV(filteredList, [
      { key: 'entryDate', header: 'F.Entrada' }, { key: 'exitDate', header: 'F.Salida' },
      { key: 'symbol', header: 'Símbolo' }, { key: 'side', header: 'Lado' },
      { key: 'qty', header: 'Cant.' }, { key: 'entryPrice', header: 'P.Entrada' },
      { key: 'exitPrice', header: 'P.Salida' },
      { key: 'entryAmount', header: 'M.Entrada' }, { key: 'exitAmount', header: 'M.Salida' },
      { key: 'days', header: 'Días' }, { key: 'pnlNominal', header: 'PNL $' },
      { key: 'pnlPercent', header: 'PNL %' }, { key: 'tna', header: 'TNA' },
      { key: 'broker', header: 'Broker' }, { key: 'account', header: 'Cuenta' },
      { key: 'status', header: 'Estado' },
    ]);
    downloadCSV(csv, `trade-units-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filtering Logic
  const filteredList = useMemo(() => {
    let source: any[] = [];
    if (view === "transactions") source = executions;
    else if (view === "trade-units") source = tradeUnits;

    let list = source.filter((item: any) => {
      // TradeUnits con status OPEN son inmunes al filtro de período
      const isOpenTU = view === 'trade-units' && item.status === 'OPEN';
      if (!isOpenTU) {
        const rawDate = item.date ?? item.exitDate ?? item.entryDate;
        if (rawDate) {
          const itemDate = new Date(rawDate);
          if (!isWithinInterval(itemDate, activeInterval)) return false;
        }
      }

      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        if (!item.symbol?.toLowerCase().includes(term) && !item.broker?.toLowerCase().includes(term)) return false;
      }

      if (view === 'transactions') {
        if (brokerFilters.length > 0 && !brokerFilters.includes(item.broker)) return false;
        if (accountFilters.length > 0 && !accountFilters.includes(item.account)) return false;
      }

      if (view === 'trade-units') {
        if (instrumentFilters.length > 0 && !instrumentFilters.includes(getInstrumentType(item.symbol as string))) return false;
        if (tuStatusFilter) {
          if (item.status !== tuStatusFilter) return false;
        }
      }

      return true;
    });

    // Sort trade-units detail view by entryDate desc
    if (view === 'trade-units' && tuViewMode === 'detail') {
      list = [...list].sort((a: any, b: any) => {
        const da = a.entryDate instanceof Date ? a.entryDate : new Date(a.entryDate);
        const db = b.entryDate instanceof Date ? b.entryDate : new Date(b.entryDate);
        return db.getTime() - da.getTime();
      });
    }

    return list;
  }, [executions, tradeUnits, view, activeInterval, searchQuery, brokerFilters, accountFilters, instrumentFilters, tuStatusFilter, tuViewMode]);

  // Trade Units grouped view
  const tradeUnitsGrouped = useMemo(() => {
    if (tuViewMode !== 'grouped') return null;

    const getKey = (tu: any) => {
      const parts: string[] = [];
      if (groupBy.includes('symbol')) parts.push(tu.symbol);
      if (groupBy.includes('account')) parts.push(tu.account ?? '');
      if (groupBy.includes('broker')) parts.push(tu.broker ?? '');
      return parts.join('::') || tu.symbol;
    };

    const groups: Record<string, any[]> = {};
    const source = view === 'trade-units' ? filteredList : [];
    source.forEach((tu: any) => {
      const key = getKey(tu);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tu);
    });

    return Object.values(groups).map(tus => {
      const openTUs = tus.filter((tu: any) => tu.status === 'OPEN');
      const netQty = openTUs.reduce((sum: number, tu: any) => sum + tu.qty, 0);
      const totalEntryValue = openTUs.reduce((sum: number, tu: any) => sum + (tu.entryPrice * tu.qty), 0);
      const avgEntryPrice = netQty > 0 ? totalEntryValue / netQty : 0;
      const totalPnl = tus.reduce((sum: number, tu: any) => sum + (tu.pnlNominal ?? 0), 0);
      const totalEntry = tus.reduce((sum: number, tu: any) => sum + tu.entryAmount, 0);
      const totalPnlPct = totalEntry > 0 ? (totalPnl / totalEntry) * 100 : 0;
      const lastExit = tus.filter((tu: any) => tu.exitPrice != null).sort((a: any, b: any) => {
        const da = a.exitDate instanceof Date ? a.exitDate : new Date(a.exitDate ?? 0);
        const db = b.exitDate instanceof Date ? b.exitDate : new Date(b.exitDate ?? 0);
        return db.getTime() - da.getTime();
      })[0];
      const avgDays = tus.length > 0 ? Math.round(tus.reduce((s: number, tu: any) => s + (tu.days ?? 0), 0) / tus.length) : 0;
      const rep = tus[0];
      return {
        id: `grp-${getKey(rep)}`,
        symbol: rep.symbol,
        side: rep.side,
        account: groupBy.includes('account') ? rep.account : '(varios)',
        broker: groupBy.includes('broker') ? rep.broker : '(varios)',
        netQty,
        avgEntryPrice,
        lastExitPrice: lastExit?.exitPrice ?? null,
        entryMarket: openTUs.reduce((s: number, tu: any) => s + (tu.entryAmount ?? 0), 0),
        exitMarket: openTUs.reduce((s: number, tu: any) => s + (tu.exitAmount ?? tu.entryAmount ?? 0), 0),
        avgDays,
        pnlNominal: totalPnl,
        pnlPercent: totalPnlPct,
        tna: tus.reduce((s: number, tu: any) => s + (tu.tna ?? 0), 0) / (tus.length || 1),
        count: tus.length,
        openCount: openTUs.length,
        status: openTUs.length > 0 ? 'OPEN' : 'CLOSED',
        _children: tus,
        _isGrouped: true,
      };
    }).sort((a: any, b: any) => {
      const va = a[groupedSortKey];
      const vb = b[groupedSortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      let cmp = 0;
      if (typeof va === 'string') cmp = va.localeCompare(String(vb));
      else cmp = Number(va) - Number(vb);
      return groupedSortDir === 'asc' ? cmp : -cmp;
    });
  }, [tuViewMode, groupBy, filteredList, view, groupedSortKey, groupedSortDir]);

  // Filtered cashflows para vista movimientos
  const filteredCashFlows = useMemo(() => {
    return [...cashFlows]
      .filter((cf) => {
        const d = cf.date instanceof Date ? cf.date : new Date(String(cf.date) + 'T12:00:00');
        if (!isWithinInterval(d, activeInterval)) return false;
        if (searchQuery) {
          const term = searchQuery.toLowerCase();
          if (
            !cf.broker?.toLowerCase().includes(term) &&
            !cf.account?.toLowerCase().includes(term) &&
            !cf.description?.toLowerCase().includes(term)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashFlows, activeInterval, searchQuery]);

  // Column definitions
  // Executions: ID, Fecha, SÍMBOLO, LADO(side), CANT(qty), PRECIO, MONTO, BROKER, CUENTA(account), MONEDA(currency), COMIS(commissions), FALOPA, INTRA
  const executionColumns: ColumnDef<any>[] = [
    { key: "id", header: "ID", align: "right", sortable: true },
    { key: "date", header: "Fecha", align: "center", sortable: true, render: (v) => v ? new Date(v as Date).toLocaleDateString("es-AR") : "-" },
    { key: "symbol", header: "Símbolo", sortable: true, render: (v) => <span className="px-1.5 py-0.5 bg-white/5 text-zinc-200 rounded text-[10px] font-black border border-white/10">{String(v)}</span> },
    { key: "side", header: "Lado", align: "center", render: (v) => <span className={cn("text-[10px] font-black uppercase", v === "BUY" ? "text-emerald-500" : "text-red-500")}>{String(v)}</span> },
    { key: "qty", header: "Cant.", align: "right", sortable: true },
    { key: "price", header: "Precio", align: "right", sortable: true, render: (v) => `$${Number(v).toFixed(2)}` },
    { key: "amount", header: "Monto", align: "right", sortable: true, render: (v) => `$${Math.round(Number(v)).toLocaleString()}` },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "account", header: "Cuenta", align: "center", sortable: true },
    { key: "currency", header: "Moneda", align: "center", sortable: true },
    { key: "commissions", header: "Comis.", align: "right", sortable: true, render: (v) => v ? `$${Number(v).toFixed(2)}` : <span className="text-zinc-600">—</span> },
  ];

  // TradeUnits: ID, F.ENTRADA, F.SALIDA, SÍMBOLO, LADO, CANT(qty), P.ENTRADA(entryPrice), P.SALIDA(exitPrice), M.ENTRADA(entryAmount), M.SALIDA(exitAmount), DÍAS, PNL $(pnlNominal), PNL %(pnlPercent), TNA, BROKER, CUENTA(account), ESTADO(status)
  const tradeUnitColumns: ColumnDef<any>[] = [
    { key: "id", header: "ID", align: "right", sortable: true, render: (v) => <span className="text-zinc-400">{String(v)}</span> },
    { key: "entryDate", header: "F.Entrada", align: "center", sortable: true, render: (v: any) => { const d = v instanceof Date ? v : new Date(String(v)); return isNaN(d.getTime()) ? '—' : <span className="whitespace-nowrap text-zinc-400">{format(d, 'dd/MM/yyyy HH:mm')}</span>; } },
    { key: "exitDate", header: "F.Salida", align: "center", sortable: true, render: (v: any) => { if (!v) return <span className="text-zinc-600">—</span>; const d = v instanceof Date ? v : new Date(String(v)); return isNaN(d.getTime()) ? '—' : <span className="whitespace-nowrap text-zinc-400">{format(d, 'dd/MM/yyyy HH:mm')}</span>; } },
    { key: "symbol", header: "Símbolo", sortable: true, render: (v) => <span className="px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded text-[10px] font-black border border-white/10">{String(v)}</span> },
    { key: "side", header: "Lado", align: "center", render: (v) => <span className={cn("text-[10px] font-black uppercase", v === "BUY" ? "text-emerald-500" : "text-red-500")}>{String(v)}</span> },
    { key: "qty", header: "Cant.", align: "right", sortable: true, render: (v) => <span className="text-zinc-400">{String(v)}</span> },
    { key: "entryPrice", header: "P.Entrada", align: "right", sortable: true, render: (v) => <span className="text-zinc-400">${Number(v).toFixed(2)}</span> },
    { key: "exitPrice", header: "P.Salida", align: "right", sortable: true, render: (v) => v != null ? <span className="text-zinc-400">${Number(v).toFixed(2)}</span> : <span className="text-zinc-600">—</span> },
    { key: "entryAmount", header: "M.Entrada", align: "right", sortable: true, render: (v) => <span className="text-zinc-400">${Math.round(Number(v)).toLocaleString()}</span> },
    { key: "exitAmount", header: "M.Salida", align: "right", sortable: true, render: (v) => v != null ? <span className="text-zinc-400">${Math.round(Number(v)).toLocaleString()}</span> : <span className="text-zinc-600">—</span> },
    { key: "days", header: "Días", align: "center", sortable: true, render: (v) => <span className="text-zinc-400">{String(v)}</span> },
    { key: "pnlNominal", header: "PNL $", align: "right", sortable: true, render: (v) => <span className={cn("font-black", Number(v) >= 0 ? "text-emerald-400" : "text-red-400")}>{Math.round(Number(v)).toLocaleString()}</span> },
    { key: "pnlPercent", header: "PNL %", align: "right", sortable: true, render: (v) => <span className={cn("font-bold", Number(v) >= 0 ? "text-emerald-500" : "text-red-500")}>{Number(v).toFixed(1)}%</span> },
    { key: "tna", header: "TNA", align: "right", sortable: true, render: (v) => <span className="text-zinc-400">{Number(v ?? 0).toFixed(1)}%</span> },
    { key: "status", header: "Estado", align: "center", render: (v) => <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", v === 'CLOSED' ? "bg-zinc-700 text-zinc-400" : "bg-blue-900/30 text-blue-400")}>{v === 'CLOSED' ? "CERRADO" : "ABIERTO"}</span> },
    { key: "broker", header: "Broker", align: "center", sortable: true, render: (v) => <span className="text-zinc-400">{String(v)}</span> },
    { key: "account", header: "Cuenta", align: "center", sortable: true, render: (v) => <span className="text-zinc-400">{String(v)}</span> },
  ];

  // Movimientos (CashFlow): Fecha, Tipo, Monto, Broker, Cuenta, Descripción
  const cashFlowColumns: ColumnDef<any>[] = [
    { key: "date", header: "Fecha", align: "center", sortable: true, render: (v) => { const d = v instanceof Date ? v : new Date(String(v) + 'T12:00:00'); return d.toLocaleDateString("es-AR"); } },
    { key: "type", header: "Tipo", align: "center", render: (v) => <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider", v === "DEPOSIT" ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400")}>{v === "DEPOSIT" ? "▲ Depósito" : "▼ Retiro"}</span> },
    { key: "amount", header: "Monto", align: "right", sortable: true, render: (v, row) => <span className={cn("font-mono font-semibold tabular-nums", row.type === "DEPOSIT" ? "text-emerald-400" : "text-red-400")}>{row.type === "DEPOSIT" ? "+" : "-"}${Math.abs(Number(v)).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> },
    { key: "broker", header: "Broker", align: "center", sortable: true },
    { key: "account", header: "Cuenta", align: "center", sortable: true, render: (v) => v ? String(v) : <span className="text-zinc-600">—</span> },
    { key: "description", header: "Descripción", render: (v) => v ? String(v) : <span className="text-zinc-600">—</span> },
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
              { id: "trade-units", label: "Trades", icon: History },
              { id: "transactions", label: "Transacciones", icon: List },
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
            <button onClick={() => setView("movimientos")}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "movimientos" || view === "ie" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
              <DollarSign className="w-3.5 h-3.5" />
              Dep / Ret
            </button>
            <button
              onClick={() => { setEditingExecution(null); navigateTo("nueva-trans"); }}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "nueva-trans" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Trans.
            </button>
            <button
              onClick={() => navigateTo("importar-csv")}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "importar-csv" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
            >
              <Upload className="w-3.5 h-3.5" />
              Importar CSV
            </button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={() => setView("configuraciones")}
              className={cn("flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all",
                view === "configuraciones" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}>
              <Settings className="w-3.5 h-3.5" />
              Config.
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {refreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
          <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase text-zinc-400">Sistema Online</span>
          </div>
          <button
            onClick={() => logout()}
            title="Cerrar sesión"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-zinc-950 text-zinc-500 hover:text-red-400 hover:border-red-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase">Salir</span>
          </button>
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
          strategy={closeModalData.strategy}
          onStrategyChange={(s) => setCloseModalData(prev => prev ? { ...prev, strategy: s } : null)}
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

        {/* Filter Bar — oculto en vista Cuentas, Nueva Exec, I/E y Configuraciones */}
        {view !== "cuentas" && view !== "brokers" && view !== "nueva-trans" && view !== "ie" && view !== "configuraciones" && view !== "importar-csv" && (
          <FilterBar
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customRange={customRange}
            onCustomRangeChange={setCustomRange}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={view === "movimientos" ? "Buscar por broker, cuenta o descripción..." : "Buscar por símbolo, broker o instrumento..."}
            hideSearch={view === "dashboard"}
            extraFilters={
              <div className="ml-auto flex items-center gap-3 flex-wrap">
                {view === "dashboard" && accounts.length > 0 && (
                  <DropdownMultiCheck
                    label="Cuenta"
                    options={accounts.map((c: any) => c.nombre)}
                    selected={selectedAccounts}
                    onChange={(next) => {
                      setSelectedAccounts(next);
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
                {view === "movimientos" && (
                  <button
                    onClick={() => navigateTo("ie")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo Dep/Ret
                  </button>
                )}
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
                  <div><p className="text-[9px] font-bold text-zinc-500 uppercase">Trades Abiertos</p><p className="text-sm font-bold text-emerald-400">{tradeUnits.filter((t: any) => t.status === 'OPEN').length}</p></div>
                </div>
              </div>
            </div>

            {/* Yields Grid / Calendar */}
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
                      accounts={grp.accounts || []}
                      rows={grp.rows}
                      totals={grp.totals}
                      selectedAccounts={selectedAccounts}
                    />
                  ))}
                </div>
              ) : (
                <YieldsGrid
                  title={year ? String(year) : "Rendimientos"}
                  accounts={yields.accounts || []}
                  rows={yields.rows}
                  totals={yields.totals}
                  selectedAccounts={selectedAccounts}
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
                <MetricCard title="Ejecuciones Abiertas" value={String(summary.openOperations)} subtitle="posiciones activas" accentColor="blue" />
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">🏆 Top 5 Trade Units</span>
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
                        <td className="py-1 px-4 text-center text-zinc-500">{t.entryDate ? new Date(t.entryDate).toLocaleDateString("es-AR") : "-"}</td>
                        <td className="py-1 px-4 text-center text-zinc-500">{t.exitDate ? new Date(t.exitDate).toLocaleDateString("es-AR") : "-"}</td>
                        <td className={cn("py-1 px-4 text-right font-black", t.pnlNominal >= 0 ? "text-emerald-400" : "text-red-400")}>${Math.round(t.pnlNominal).toLocaleString()}</td>
                        <td className={cn("py-1 px-4 text-right font-bold", t.pnlPercent >= 0 ? "text-emerald-500" : "text-red-500")}>{t.pnlPercent.toFixed(1)}%</td>
                        <td className="py-1 px-4 text-right text-zinc-400">{t.tna.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mejor Mes y Mejor Trade Unit */}
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🏆 Mejor Trade Unit</p>
                    <p className="text-2xl font-black text-emerald-400">{topStats.bestReturnTrade.pnlPercent.toFixed(1)}%</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{topStats.bestReturnTrade.symbol} · ${Math.round(topStats.bestReturnTrade.pnlNominal).toLocaleString()}</p>
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
            {/* Gráficos de Torta */}
            {(pieByInstrument.length > 0 || pieByAccount.length > 0 || pieByBroker.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pieByInstrument.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
                    <PieChartComponent data={pieByInstrument} title="Tenencia por Tipo de Activo" size={120} />
                  </div>
                )}
                {pieByAccount.length > 0 && (
                  <div className="bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
                    <PieChartComponent data={pieByAccount} title="Tenencia por Cuenta" size={120} />
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

        {/* --- LIST VIEWS (Transactions, TradeUnits) --- */}
        {(view === "transactions" || view === "trade-units") && (
          <div className="space-y-4 animate-in fade-in duration-500">

            {/* Filtros extra para transacciones */}
            {view === "transactions" && (
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMultiCheck
                  label="Broker"
                  options={brokers.map((b: any) => b.nombre)}
                  selected={brokerFilters}
                  onChange={setBrokerFilters}
                />
                <DropdownMultiCheck
                  label="Cuenta"
                  options={accounts.map((c: any) => c.nombre)}
                  selected={accountFilters}
                  onChange={setAccountFilters}
                  allLabel="Todas"
                />
              </div>
            )}

            {/* Filtros extra para trade units */}
            {view === "trade-units" && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider mr-1">Estado:</span>
                  {[
                    { value: '', label: 'Todos' },
                    { value: 'OPEN', label: 'Abiertos' },
                    { value: 'CLOSED', label: 'Cerrados' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTuStatusFilter(opt.value)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        tuStatusFilter === opt.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <DropdownMultiCheck
                  label="Instrumento"
                  options={["STOCK", "CEDEAR", "CRYPTO"]}
                  selected={instrumentFilters}
                  onChange={setInstrumentFilters}
                />
              </div>
            )}

            {/* Transactions DataTable */}
            {view === "transactions" && (
              <DataTable
                data={filteredList}
                columns={executionColumns}
                emptyMessage="Sin transacciones para el período seleccionado"
                onView={handleViewExecution}
                onEdit={handleEditExecution}
                onDelete={handleDeleteExecution}
                onExport={handleExportExecutions}
              />
            )}

            {/* TradeUnits view */}
            {view === "trade-units" && (
              <>
                {/* Toggle Desagregada / Agregada */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-1">
                    <button
                      onClick={() => setTuViewMode('grouped')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${tuViewMode === 'grouped' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Agrupar
                    </button>
                    <button
                      onClick={() => setTuViewMode('detail')}
                      className={`px-3 py-1 text-xs rounded-md transition-colors ${tuViewMode === 'detail' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Desagrupar
                    </button>
                  </div>

                  {tuViewMode === 'grouped' && (
                    <DropdownMultiCheck
                      label="Agrupar por"
                      options={['Símbolo', 'Cuenta', 'Broker']}
                      selected={groupBy.map(v => v === 'symbol' ? 'Símbolo' : v === 'account' ? 'Cuenta' : v === 'broker' ? 'Broker' : v)}
                      onChange={(newSelected: string[]) => {
                        const toKey = (v: string) => v === 'Símbolo' ? 'symbol' : v === 'Cuenta' ? 'account' : v === 'Broker' ? 'broker' : v;
                        setGroupBy(newSelected.map(toKey));
                      }}
                      allLabel="Todos"
                      allSelectsAll
                    />
                  )}
                </div>

                {tuViewMode === 'grouped' && tradeUnitsGrouped ? (() => {
                  const pagedGrouped = groupedShowAll ? tradeUnitsGrouped : tradeUnitsGrouped.slice(0, groupedPageSize);
                  return (
                  <div className="bg-zinc-900/50 rounded-lg border border-white/5 overflow-hidden">
                    {/* Metadata bar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-zinc-900/30">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{tradeUnitsGrouped.length} REGISTROS</span>
                      <div className="flex items-center gap-1">
                        {[25, 50, 100].map(n => (
                          <button key={n} onClick={() => { setGroupedPageSize(n); setGroupedShowAll(false); }}
                            className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-all", !groupedShowAll && groupedPageSize === n ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                            {n}
                          </button>
                        ))}
                        <button onClick={() => setGroupedShowAll(true)}
                          className={cn("px-2 py-0.5 rounded text-[10px] font-bold transition-all", groupedShowAll ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                          Todos
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-white/[0.03] border-b border-white/5">
                          <th className="w-8 px-2 py-2"></th>
                          {([
                            { key: 'symbol', label: 'SÍMBOLO', align: 'text-left' },
                            { key: '_entryDate', label: 'F.ENTRADA', align: 'text-center' },
                            { key: '_exitDate', label: 'F.SALIDA', align: 'text-center' },
                            { key: 'side', label: 'LADO', align: 'text-center' },
                            { key: 'netQty', label: 'CANT', align: 'text-right' },
                            { key: 'avgEntryPrice', label: 'P.ENTRADA', align: 'text-right' },
                            { key: 'lastExitPrice', label: 'P.SALIDA', align: 'text-right' },
                            { key: 'entryMarket', label: 'M.ENTRADA', align: 'text-right' },
                            { key: 'exitMarket', label: 'M.SALIDA', align: 'text-right' },
                            { key: 'avgDays', label: 'DÍAS', align: 'text-center' },
                            { key: 'pnlNominal', label: 'PNL $', align: 'text-right' },
                            { key: 'pnlPercent', label: 'PNL %', align: 'text-right' },
                            { key: 'tna', label: 'TNA', align: 'text-right' },
                            { key: 'status', label: 'ESTADO', align: 'text-center' },
                            { key: 'broker', label: 'BROKER', align: 'text-center' },
                            { key: 'account', label: 'CUENTA', align: 'text-center' },
                          ] as { key: string; label: string; align: string }[]).map(col => (
                            <th
                              key={col.key}
                              onClick={() => {
                                if (groupedSortKey === col.key) setGroupedSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                else { setGroupedSortKey(col.key); setGroupedSortDir('asc'); }
                              }}
                              className={`px-3 py-2 text-[10px] font-bold uppercase text-zinc-500 tracking-widest cursor-pointer hover:text-zinc-300 select-none whitespace-nowrap ${col.align}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {col.label}
                                {groupedSortKey === col.key ? (groupedSortDir === 'asc' ? <span className="text-blue-400">↑</span> : <span className="text-blue-400">↓</span>) : <span className="opacity-30">↕</span>}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {pagedGrouped.map((row) => (
                          <React.Fragment key={row.id}>
                            <tr className="group hover:bg-white/[0.03] transition-colors h-8">
                              <td className="px-2 py-1 text-center">
                                <button
                                  onClick={() => {
                                    const newSet = new Set(expandedGroups);
                                    if (newSet.has(row.id)) newSet.delete(row.id);
                                    else newSet.add(row.id);
                                    setExpandedGroups(newSet);
                                  }}
                                  className="w-5 h-5 rounded border border-zinc-600 text-zinc-400 hover:text-zinc-200 hover:border-zinc-400 text-xs flex items-center justify-center transition-colors"
                                >
                                  {expandedGroups.has(row.id) ? '−' : '+'}
                                </button>
                              </td>
                              <td className="px-3 py-1 text-[13px]"><span className="px-1.5 py-0.5 bg-white/5 text-zinc-400 rounded text-[10px] font-black border border-white/10">{row.symbol}</span></td>
                              <td className="px-3 py-1 text-[13px] text-center text-zinc-600">—</td>
                              <td className="px-3 py-1 text-[13px] text-center text-zinc-600">—</td>
                              <td className="px-3 py-1 text-[13px] text-center"><span className={cn("text-[10px] font-black uppercase", row.side === 'BUY' ? 'text-emerald-500' : 'text-red-500')}>{row.side}</span></td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{row.netQty}</td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{Number(row.avgEntryPrice).toFixed(2)}</td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{row.lastExitPrice != null ? Number(row.lastExitPrice).toFixed(2) : <span className="text-zinc-600">—</span>}</td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{Math.round(row.entryMarket).toLocaleString()}</td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{Math.round(row.exitMarket).toLocaleString()}</td>
                              <td className="px-3 py-1 text-[13px] text-center text-zinc-400">{row.avgDays}</td>
                              <td className="px-3 py-1 text-[13px] text-right"><span className={cn("font-black", row.pnlNominal >= 0 ? 'text-emerald-400' : 'text-red-400')}>{Math.round(row.pnlNominal).toLocaleString()}</span></td>
                              <td className="px-3 py-1 text-[13px] text-right"><span className={cn("font-bold", row.pnlPercent >= 0 ? 'text-emerald-400' : 'text-red-400')}>{Number(row.pnlPercent).toFixed(2)}%</span></td>
                              <td className="px-3 py-1 text-[13px] text-right text-zinc-400">{Number(row.tna ?? 0).toFixed(1)}%</td>
                              <td className="px-3 py-1 text-[13px] text-center"><span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", row.status === 'CLOSED' ? "bg-zinc-700 text-zinc-400" : "bg-blue-900/30 text-blue-400")}>{row.status === 'CLOSED' ? 'CERRADO' : 'ABIERTO'}</span></td>
                              <td className="px-3 py-1 text-[13px] text-center text-zinc-400">{row.broker}</td>
                              <td className="px-3 py-1 text-[13px] text-center text-zinc-400">{row.account}</td>
                            </tr>
                            {expandedGroups.has(row.id) && row._children?.map((child: any) => (
                              <tr key={child.id} className="bg-zinc-950/50 border-b border-white/[0.02] text-[12px]">
                                <td className="px-2 py-1.5"></td>
                                <td className="px-3 py-1.5 text-zinc-500">#{child.id}</td>
                                <td className="px-3 py-1.5 text-center text-zinc-500 whitespace-nowrap">{child.entryDate ? format(child.entryDate instanceof Date ? child.entryDate : new Date(child.entryDate), 'dd/MM/yyyy HH:mm') : '—'}</td>
                                <td className="px-3 py-1.5 text-center text-zinc-500 whitespace-nowrap">{child.exitDate ? format(child.exitDate instanceof Date ? child.exitDate : new Date(child.exitDate), 'dd/MM/yyyy HH:mm') : <span className="text-zinc-600">—</span>}</td>
                                <td className="px-3 py-1.5 text-center"><span className={cn("text-[10px] font-black uppercase", child.side === 'BUY' ? 'text-emerald-600' : 'text-red-600')}>{child.side}</span></td>
                                <td className="px-3 py-1.5 text-right text-zinc-400">{child.qty}</td>
                                <td className="px-3 py-1.5 text-right text-zinc-500">{Number(child.entryPrice).toFixed(2)}</td>
                                <td className="px-3 py-1.5 text-right text-zinc-500">{child.exitPrice != null ? Number(child.exitPrice).toFixed(2) : '—'}</td>
                                <td className="px-3 py-1.5 text-right text-zinc-500">{Math.round(child.entryAmount).toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right text-zinc-500">{child.exitAmount != null ? Math.round(child.exitAmount).toLocaleString() : '—'}</td>
                                <td className="px-3 py-1.5 text-center text-zinc-500">{child.days}</td>
                                <td className="px-3 py-1.5 text-right"><span className={cn("font-bold", child.pnlNominal >= 0 ? 'text-emerald-500' : 'text-red-500')}>{Math.round(child.pnlNominal).toLocaleString()}</span></td>
                                <td className="px-3 py-1.5 text-right"><span className={cn(child.pnlPercent >= 0 ? 'text-emerald-500' : 'text-red-500')}>{Number(child.pnlPercent).toFixed(2)}%</span></td>
                                <td className="px-3 py-1.5 text-right text-zinc-500">{Number(child.tna ?? 0).toFixed(1)}%</td>
                                <td className="px-3 py-1.5 text-center"><span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", child.status === 'CLOSED' ? "bg-zinc-800 text-zinc-500" : "bg-blue-900/20 text-blue-500")}>{child.status === 'CLOSED' ? 'CERRADO' : 'ABIERTO'}</span></td>
                                <td className="px-3 py-1.5 text-center text-zinc-500">{child.broker}</td>
                                <td className="px-3 py-1.5 text-center text-zinc-500">{child.account}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  );
                })() : (
                  <DataTable
                    data={filteredList}
                    columns={tradeUnitColumns}
                    emptyMessage="Sin trade units para el período seleccionado"
                    onView={handleViewTradeUnit}
                    onEdit={handleEditTradeUnit}
                    onDelete={handleDeleteTradeUnit}
                    onExport={handleExportTradeUnits}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* --- NUEVA TRANSACCIÓN VIEW --- */}
        {view === "nueva-trans" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TradeForm
              inline
              onClose={() => { setEditingExecution(null); navigateBack(); }}
              onSave={handleSaveExecution}
              brokers={brokers}
              accounts={accounts}
              onCloseExecution={async (entryExecId, qty, price, date, account, broker) => {
                await closeTradeUnitWithQuantity({
                  symbol: executions.find((e: any) => e.id === entryExecId)?.symbol || '',
                  closeDate: date ?? new Date().toISOString().split('T')[0],
                  closePrice: price ?? 0,
                  totalQty: qty ?? 0,
                  broker: broker ?? 'AMR',
                  account: account ?? 'USA',
                  primaryEntryExecId: entryExecId,
                });
                navigateBack();
                await fetchData();
              }}
              openTradeUnits={tradeUnits.filter((tu: any) => tu.status === 'OPEN') as any}
              initialData={editingExecution ? {
                id: editingExecution.id,
                symbol: editingExecution.symbol,
                entryDate: editingExecution.date ? new Date(editingExecution.date).toISOString().split('T')[0] : '',
                qty: Math.abs(editingExecution.qty || 0),
                entryPrice: editingExecution.price,
                broker: editingExecution.broker,
                account: editingExecution.account || 'USA',
                side: editingExecution.side,
                isClosed: editingExecution.isClosed,
                currency: editingExecution.currency || 'USD',
                commissions: editingExecution.commissions || 0,
              } : undefined}
              getOpenExecutionsForClosing={getOpenExecutionsForClosing}
            />
          </div>
        )}

        {/* --- INGRESOS / EGRESOS FORM --- */}
        {view === "ie" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CashFlowForm
              inline
              onClose={() => navigateBack()}
              onSave={handleSaveCashFlow}
              brokers={brokers.map((b: any) => b.nombre)}
              accounts={accounts.map((c: any) => c.nombre)}
            />
          </div>
        )}

        {/* --- IMPORTAR CSV --- */}
        {view === "importar-csv" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 px-2">
            <ImportCSVView
              onClose={() => navigateBack()}
              brokers={brokers.map((b: any) => b.nombre)}
              accounts={accounts.map((c: any) => c.nombre)}
              onPreview={previewBulkImport}
              onConfirm={async (rows, decisions) => {
                const result = await confirmBulkImportWithTrades(rows, decisions);
                await fetchData();
                return result;
              }}
            />
          </div>
        )}

        {/* --- MOVIMIENTOS VIEW --- */}
        {view === "movimientos" && (() => {
          const totalIngresos = filteredCashFlows.filter(c => c.type === 'DEPOSIT').reduce((s, c) => s + c.amount, 0);
          const totalEgresos = filteredCashFlows.filter(c => c.type === 'WITHDRAWAL').reduce((s, c) => s + c.amount, 0);
          const balanceNeto = totalIngresos - totalEgresos;
          const draftAmt = editDraft ? parseFloat(editDraft.amount) : NaN;
          const amountInvalid = editDraft != null && (isNaN(draftAmt) || draftAmt <= 0);

          const renderCashFlowEditRow = (row: any) => {
            if (!editDraft || row.id !== editingCfId) return null;
            const inputCls = "w-full px-2 py-0.5 bg-zinc-950 border border-blue-500/40 rounded text-[12px] text-zinc-200 outline-none focus:border-blue-400";
            return (
              <>
                {/* Fecha */}
                <td className="py-1 px-3">
                  <input type="date" value={editDraft.date}
                    onChange={e => setEditDraft({ ...editDraft, date: e.target.value })}
                    className={inputCls} />
                </td>
                {/* Tipo */}
                <td className="py-1 px-3 text-center">
                  <div className="flex gap-1">
                    {(['DEPOSIT', 'WITHDRAWAL'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setEditDraft({ ...editDraft, type: t })}
                        className={cn(
                          "flex-1 py-0.5 rounded text-[9px] font-black uppercase tracking-wide transition-all",
                          editDraft.type === t
                            ? t === 'DEPOSIT' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                            : 'border border-white/10 text-zinc-500 hover:text-zinc-300'
                        )}>
                        {t === 'DEPOSIT' ? '▲ Dep' : '▼ Ret'}
                      </button>
                    ))}
                  </div>
                </td>
                {/* Monto */}
                <td className="py-1 px-3">
                  <div className="flex items-center gap-1">
                    <span className={cn("text-[11px] font-black shrink-0", editDraft.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-red-400')}>
                      {editDraft.type === 'DEPOSIT' ? '+' : '−'}$
                    </span>
                    <input type="number" value={editDraft.amount} min="0.01" step="any"
                      onChange={e => setEditDraft({ ...editDraft, amount: e.target.value })}
                      placeholder="0.00"
                      className={cn(inputCls, "text-right", amountInvalid && "border-red-500/60 text-red-400")} />
                  </div>
                  {amountInvalid && <p className="text-[9px] text-red-400 mt-0.5">Monto debe ser positivo</p>}
                </td>
                {/* Broker */}
                <td className="py-1 px-3 text-center">
                  <select value={editDraft.broker} onChange={e => setEditDraft({ ...editDraft, broker: e.target.value })}
                    className={inputCls}>
                    {brokers.map((b: any) => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}
                  </select>
                </td>
                {/* Cuenta */}
                <td className="py-1 px-3 text-center">
                  <select value={editDraft.account} onChange={e => setEditDraft({ ...editDraft, account: e.target.value })}
                    className={inputCls}>
                    {accounts.map((c: any) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                  </select>
                </td>
                {/* Descripción */}
                <td className="py-1 px-3">
                  <input type="text" value={editDraft.description}
                    onChange={e => setEditDraft({ ...editDraft, description: e.target.value })}
                    placeholder="Descripción opcional"
                    className={inputCls} />
                </td>
                {/* Acciones guardar/cancelar */}
                <td className="py-1 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={handleSaveCashFlowEdit} disabled={amountInvalid}
                      className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 transition-colors" title="Guardar">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleCancelEditCashFlow}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Cancelar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </>
            );
          };

          return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
              {/* Bloque 1 — Metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard title="Depósitos" value={`$${Math.round(totalIngresos).toLocaleString('es-AR')}`} subtitle={`${filteredCashFlows.filter(c => c.type === 'DEPOSIT').length} movimientos`} accentColor="emerald" icon={ArrowUpRight} />
                <MetricCard title="Retiros" value={`$${Math.round(totalEgresos).toLocaleString('es-AR')}`} subtitle={`${filteredCashFlows.filter(c => c.type === 'WITHDRAWAL').length} movimientos`} accentColor="red" icon={ArrowDownRight} />
                <MetricCard title="Balance Neto" value={`$${Math.round(balanceNeto).toLocaleString('es-AR')}`} subtitle="depósitos − retiros" accentColor={balanceNeto >= 0 ? "blue" : "orange"} icon={DollarSign} />
                <MetricCard title="Movimientos" value={String(filteredCashFlows.length)} subtitle="en el período" accentColor="purple" icon={Clock} />
              </div>

              {/* Bloque 2 — DataTable con row-level editing */}
              <DataTable
                data={filteredCashFlows}
                columns={cashFlowColumns}
                editingRowId={editingCfId}
                renderEditRow={renderCashFlowEditRow}
                onCancelEdit={handleCancelEditCashFlow}
                onEdit={handleEditCashFlow}
                onDelete={async (row: any) => {
                  if (!confirm('¿Eliminar este movimiento?')) return;
                  await removeMemoryCashFlow(row.id);
                  setCashFlows(await getMemoryCashFlows());
                }}
                onExport={() => {
                  const csv = exportToCSV(filteredCashFlows, [
                    { key: 'date', header: 'Fecha' },
                    { key: 'type', header: 'Tipo' },
                    { key: 'amount', header: 'Monto' },
                    { key: 'broker', header: 'Broker' },
                    { key: 'account', header: 'Cuenta' },
                    { key: 'description', header: 'Descripción' },
                  ]);
                  downloadCSV(csv, `movimientos-${new Date().toISOString().split('T')[0]}.csv`);
                }}
                emptyMessage="Sin movimientos en el período seleccionado"
              />
            </div>
          );
        })()}

        {/* --- CUENTAS VIEW --- */}
        {view === "cuentas" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AccountsSection
              accounts={accounts}
              onAdd={async (nombre, descripcion) => {
                await addMemoryAccount(nombre, descripcion);
                setAccounts(await getMemoryAccounts());
              }}
              onRemove={async (id) => {
                await removeMemoryAccount(id);
                setAccounts(await getMemoryAccounts());
              }}
              onEdit={async (id, nombre, descripcion) => {
                await updateMemoryAccount(id, nombre, descripcion);
                setAccounts(await getMemoryAccounts());
              }}
            />
          </div>
        )}

        {/* --- CONFIGURACIONES VIEW --- */}
        {view === "configuraciones" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex gap-6 min-h-[600px]">

            {/* Sidebar */}
            <nav className="hidden md:flex flex-col w-56 shrink-0 space-y-6">
              {/* Sección CUENTA */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 px-3 mb-1">Cuenta</p>
                {[
                  { id: "mi-cuenta", label: "Mi cuenta", icon: User },
                  { id: "mi-plan", label: "Mi plan", icon: Trophy },
                  { id: "zona-peligro", label: "Zona de peligro", icon: AlertCircle },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setConfigSection(id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-left",
                      configSection === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Sección PREFERENCIAS */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 px-3 mb-1">Preferencias</p>
                {[
                  { id: "apariencia", label: "Apariencia", icon: Palette },
                  { id: "idioma", label: "Idioma", icon: Languages },
                  { id: "regional", label: "Regional", icon: Globe },
                  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setConfigSection(id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-left",
                      configSection === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Sección ALERTAS */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 px-3 mb-1">Alertas</p>
                {[
                  { id: "alertas", label: "Alertas", icon: Bell },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setConfigSection(id)}
                    className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-left",
                      configSection === id ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5")}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Divisor */}
            <div className="hidden md:block w-px bg-white/5" />

            {/* Panel de contenido */}
            <section className="flex-1 min-w-0">

              {/* Dashboard — Estrategia de matching */}
              {configSection === "dashboard" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Dashboard</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Configuración del comportamiento del dashboard y matching de operaciones.</p>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Estrategia de Matching por Cuenta</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {accounts.map((acc: any) => (
                        <div key={acc.id} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                          <div>
                            <p className="text-[13px] font-black text-zinc-200">{acc.nombre}</p>
                            {acc.descripcion && <p className="text-[11px] text-zinc-500 mt-0.5">{acc.descripcion}</p>}
                          </div>
                          <div className="space-y-2">
                            <select
                              value={acc.matchingStrategy ?? 'FIFO'}
                              onChange={async (e) => {
                                const strategy = e.target.value as 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL';
                                await updateAccountMatchingStrategy(acc.id, strategy);
                                setAccounts(await getMemoryAccounts());
                                setConfigSaved(prev => ({ ...prev, [acc.id]: true }));
                                setTimeout(() => setConfigSaved(prev => ({ ...prev, [acc.id]: false })), 2000);
                              }}
                              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-[12px] text-zinc-200 outline-none focus:border-blue-500 transition-colors appearance-none"
                            >
                              <option value="FIFO">FIFO — Más antiguo primero</option>
                              <option value="LIFO">LIFO — Más reciente primero</option>
                              <option value="MAX_PROFIT">Máximo Profit — Mayor ganancia primero</option>
                              <option value="MIN_PROFIT">Mínimo Profit — Menor ganancia primero</option>
                              <option value="MANUAL">Manual — Selección manual</option>
                            </select>
                            {configSaved[acc.id] && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>Guardado</span>
                              </div>
                            )}
                            <p className="text-[10px] text-zinc-600">
                              {(acc.matchingStrategy ?? 'FIFO') === 'FIFO' && 'Las posiciones se cierran comenzando por las más antiguas (First In, First Out).'}
                              {(acc.matchingStrategy ?? 'FIFO') === 'LIFO' && 'Las posiciones se cierran comenzando por las más recientes (Last In, First Out).'}
                              {(acc.matchingStrategy ?? 'FIFO') === 'MAX_PROFIT' && 'Las posiciones con mayor ganancia potencial se cierran primero.'}
                              {(acc.matchingStrategy ?? 'FIFO') === 'MIN_PROFIT' && 'Las posiciones con menor ganancia potencial (o mayor pérdida) se cierran primero.'}
                              {(acc.matchingStrategy ?? 'FIFO') === 'MANUAL' && 'El usuario selecciona manualmente qué posición cerrar en cada operación.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mi cuenta */}
              {configSection === "mi-cuenta" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Mi Cuenta</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Información y configuración de tu cuenta de usuario.</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-zinc-200">Usuario</p>
                      <p className="text-[11px] text-zinc-500">Cuenta personal — Activa</p>
                    </div>
                    <span className="ml-auto px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/40 rounded text-[10px] font-bold text-emerald-400 uppercase">Activo</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Más opciones de cuenta próximamente.</p>
                </div>
              )}

              {/* Mi plan */}
              {configSection === "mi-plan" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Mi Plan</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Información sobre tu plan actual.</p>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                    <Trophy className="w-8 h-8 text-yellow-400 shrink-0" />
                    <div>
                      <p className="text-[13px] font-black text-zinc-200">Plan Personal</p>
                      <p className="text-[11px] text-zinc-500">Acceso completo a todas las funcionalidades.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Gestión de planes próximamente.</p>
                </div>
              )}

              {/* Zona de peligro */}
              {configSection === "zona-peligro" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-red-400">Zona de Peligro</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Acciones irreversibles. Proceder con precaución.</p>
                  </div>
                  <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-[12px] font-bold text-zinc-200">Restablecer datos</p>
                      <p className="text-[11px] text-zinc-500">Esta acción eliminará todos los datos en memoria y recargará el estado inicial desde el CSV.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Acciones destructivas próximamente.</p>
                </div>
              )}

              {/* Apariencia */}
              {configSection === "apariencia" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Apariencia</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Personaliza el aspecto visual de la aplicación.</p>
                  </div>
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center gap-3">
                    <Palette className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-zinc-200">Tema oscuro</p>
                      <p className="text-[11px] text-zinc-500">Activo — Glassmorphism dark.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Temas adicionales próximamente.</p>
                </div>
              )}

              {/* Idioma */}
              {configSection === "idioma" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Idioma</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Selecciona el idioma de la interfaz.</p>
                  </div>
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center gap-3">
                    <Languages className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-zinc-200">Español</p>
                      <p className="text-[11px] text-zinc-500">Idioma actual de la interfaz.</p>
                    </div>
                    <span className="ml-auto px-2 py-0.5 bg-blue-900/40 border border-blue-700/40 rounded text-[10px] font-bold text-blue-400 uppercase">Activo</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Soporte multiidioma próximamente.</p>
                </div>
              )}

              {/* Regional */}
              {configSection === "regional" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Regional</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Configuración de zona horaria, moneda y formato de fechas.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Zona horaria", value: "UTC-3 (Argentina)" },
                      { label: "Moneda", value: "USD ($)" },
                      { label: "Formato de fecha", value: "dd/MM/yyyy" },
                      { label: "Separador decimal", value: "Coma (,)" },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">{label}</p>
                          <p className="text-[13px] font-black text-zinc-200 mt-0.5">{value}</p>
                        </div>
                        <Globe className="w-4 h-4 text-zinc-600" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Configuración regional editable próximamente.</p>
                </div>
              )}

              {/* Alertas */}
              {configSection === "alertas" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[13px] font-black uppercase tracking-[0.15em] text-white">Alertas</h2>
                    <p className="text-[11px] text-zinc-500 mt-1">Configuración de notificaciones y alertas del sistema.</p>
                  </div>
                  <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center gap-3">
                    <Bell className="w-4 h-4 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-zinc-200">Notificaciones del sistema</p>
                      <p className="text-[11px] text-zinc-500">Alertas de precios, P&L y eventos de mercado.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-600 italic">Sistema de alertas próximamente.</p>
                </div>
              )}

            </section>
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
