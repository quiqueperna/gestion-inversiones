/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from 'fs';
import path from 'path';
import { eachMonthOfInterval, isSameMonth } from "date-fns";
import { getMemoryState, initializeMemoryState } from "@/lib/data-loader";

// Helper to ensure data is loaded
function ensureDataLoaded() {
    const state = getMemoryState();
    if (!state.isInitialized) {
        const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
        const csvText = fs.readFileSync(csvPath, 'utf-8');
        initializeMemoryState(csvText, true);
    }
    return getMemoryState();
}

async function computeYearData(state: ReturnType<typeof getMemoryState>, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const trades = state.trades.filter(t => t.isClosed && t.closeDate && t.closeDate >= startOfYear && t.closeDate <= endOfYear);
    const cashFlows = state.cashFlows.filter(c => c.date >= startOfYear && c.date <= endOfYear);

    const { getCuentas } = await import("@/lib/data-loader");
    const cuentasFromState = getCuentas().map((c: any) => c.nombre);
    const cuentasFromData = Array.from(new Set(trades.map(t => t.cuenta || 'USA')));
    const allCuentas = Array.from(new Set([...cuentasFromState, ...cuentasFromData]));

    const months = eachMonthOfInterval({ start: startOfYear, end: endOfYear });
    const brokerMap: Record<string, string> = { 'IBKR': 'USA', 'Schwab': 'USA', 'IOL': 'Argentina', 'AMR': 'USA', 'Cocos': 'Argentina', 'Balanz': 'Argentina', 'Binance': 'CRYPTO' };

    const rows = months.map(monthDate => {
        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const rowData: any = { month: MESES_ES[monthDate.getMonth()] };
        let totalBalance = 0, totalPL = 0, totalIE = 0;

        allCuentas.forEach(cuenta => {
            const cTrades = trades.filter(t => (t.cuenta || 'USA') === cuenta && t.closeDate && isSameMonth(t.closeDate, monthDate));
            const cFlows = cashFlows.filter(c => (brokerMap[c.broker] || 'USA') === cuenta && isSameMonth(c.date, monthDate));

            const balance = cTrades.reduce((sum, t) => sum + t.openAmount, 0);
            const pl = cTrades.reduce((sum, t) => sum + t.returnAmount, 0);
            const ie = cFlows.reduce((sum, c) => sum + (c.type === 'DEPOSIT' ? c.amount : -c.amount), 0);

            rowData[cuenta] = { balance, pl, pct: balance > 0 ? (pl / balance) * 100 : 0, ie, count: cTrades.length };
            totalBalance += balance; totalPL += pl; totalIE += ie;
        });

        rowData['TOTAL'] = { balance: totalBalance, pl: totalPL, pct: totalBalance > 0 ? (totalPL / totalBalance) * 100 : 0, ie: totalIE, count: 0 };
        return rowData;
    });

    const totals: any = { month: "TOTAL" };
    [...allCuentas, 'TOTAL'].forEach(key => {
        const colBalance = rows.reduce((sum, r) => sum + (r[key]?.balance || 0), 0);
        const colPL = rows.reduce((sum, r) => sum + (r[key]?.pl || 0), 0);
        const colIE = rows.reduce((sum, r) => sum + (r[key]?.ie || 0), 0);
        totals[key] = { balance: colBalance, pl: colPL, ie: colIE };
    });

    return { cuentas: allCuentas as string[], rows, totals };
}

export async function getYieldsData(year?: number | null) {
    const state = ensureDataLoaded();

    if (!year) {
        // All years: find distinct years from closed trades, sort descending
        const closedTrades = state.trades.filter(t => t.isClosed && t.closeDate);
        const years = [...new Set(closedTrades.map(t => t.closeDate!.getFullYear()))].sort((a, b) => b - a);
        if (years.length === 0) return { cuentas: [], rows: [], totals: {}, yearGroups: [] };
        const groups = await Promise.all(years.map(async y => ({ year: y, ...(await computeYearData(state, y)) })));
        return { cuentas: groups[0].cuentas, rows: [], totals: {}, yearGroups: groups };
    }

    return computeYearData(state, year);
}

export async function getStats(startDate: Date, endDate: Date) {
    const state = ensureDataLoaded();
    const trades = state.trades
        .filter(t => t.isClosed && t.closeDate && t.closeDate >= startDate && t.closeDate <= endDate)
        .sort((a, b) => a.closeDate!.getTime() - b.closeDate!.getTime());

    const totalTrades = trades.length;
    if (totalTrades === 0) return createEmptyStats();

    const wins = trades.filter(t => t.returnAmount > 0);
    const losses = trades.filter(t => t.returnAmount <= 0);
    const grossProfit = wins.reduce((acc, t) => acc + t.returnAmount, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.returnAmount, 0));
    const netProfit = grossProfit - grossLoss;

    const winRate = (wins.length / totalTrades) * 100;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    const expectancy = netProfit / totalTrades;

    // 1. Max Drawdown
    let peak = -Infinity;
    let maxDrawdown = 0;
    let runningBalance = 0;
    trades.forEach(t => {
        runningBalance += t.returnAmount;
        if (runningBalance > peak) peak = runningBalance;
        const dd = peak - runningBalance;
        if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // 2. Streaks
    let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
    trades.forEach(t => {
        if (t.returnAmount > 0) { curWin++; curLoss = 0; if (curWin > maxWinStreak) maxWinStreak = curWin; }
        else { curLoss++; curWin = 0; if (curLoss > maxLossStreak) maxLossStreak = curLoss; }
    });

    // 3. Sharpe/Sortino Simplified
    const returns = trades.map(t => t.returnPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / totalTrades;
    const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / totalTrades);
    const negativeReturns = returns.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(negativeReturns.map(x => Math.pow(x, 2)).reduce((a, b) => a + b, 0) / totalTrades);

    // 4. Instrument Stats
    const instrumentStats = trades.reduce((acc: any, t) => {
        const type = t.instrumentType || 'STOCK';
        if (!acc[type]) acc[type] = { pl: 0, count: 0 };
        acc[type].pl += t.returnAmount;
        acc[type].count++;
        return acc;
    }, {});

    return {
        netProfit, grossProfit, grossLoss, totalTrades, winRate,
        avgWin, avgLoss, profitFactor, expectancy, maxDrawdown,
        payoffRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin,
        recoveryFactor: maxDrawdown > 0 ? netProfit / maxDrawdown : 0,
        sharpeRatio: stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0,
        sortinoRatio: downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0,
        sqn: stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(totalTrades) : 0,
        maxWin: Math.max(...trades.map(t => t.returnAmount), 0),
        maxLoss: Math.min(...trades.map(t => t.returnAmount), 0),
        maxWinStreak, maxLossStreak,
        avgHoldingTime: trades.reduce((acc, t) => acc + t.days, 0) / totalTrades,
        kellyPercent: (avgLoss > 0 ? (winRate/100) - ((1 - winRate/100) / (avgWin/avgLoss)) : 0) * 100,
        instrumentGains: Object.entries(instrumentStats).map(([name, data]: [string, any]) => ({ name, gain: data.pl, count: data.count }))
    };
}

function createEmptyStats() {
    return {
        netProfit: 0, grossProfit: 0, grossLoss: 0, totalTrades: 0, winRate: 0,
        avgWin: 0, avgLoss: 0, profitFactor: 0, expectancy: 0, maxDrawdown: 0,
        payoffRatio: 0,
        recoveryFactor: 0, sharpeRatio: 0, sortinoRatio: 0, sqn: 0,
        maxWin: 0, maxLoss: 0, maxWinStreak: 0, maxLossStreak: 0,
        avgHoldingTime: 0, kellyPercent: 0, instrumentGains: []
    };
}

export async function getTopStats(startDate?: Date, endDate?: Date) {
  const state = ensureDataLoaded();
  const closedTrades = state.trades.filter(t => {
    if (!t.isClosed || !t.closeDate) return false;
    if (startDate && endDate) return t.closeDate >= startDate && t.closeDate <= endDate;
    return true;
  });
  if (closedTrades.length === 0) return null;

  const top5Trades = [...closedTrades].sort((a, b) => b.returnAmount - a.returnAmount).slice(0, 5);

  const monthlyMap = new Map<string, number>();
  closedTrades.forEach(t => {
    const key = `${t.closeDate!.getFullYear()}-${String(t.closeDate!.getMonth()+1).padStart(2,'0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.returnAmount);
  });
  const bestMonthEntry = [...monthlyMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestMonth = bestMonthEntry ? { month: bestMonthEntry[0], total: bestMonthEntry[1] } : null;
  const bestReturnTrade = [...closedTrades].sort((a, b) => b.returnPercent - a.returnPercent)[0] || null;

  return { top5Trades, bestMonth, bestReturnTrade };
}

export async function getDashboardSummary(startDate?: Date, endDate?: Date) {
  const state = ensureDataLoaded();
  const allTrades = state.trades;
  const openTrades = allTrades.filter(t => !t.isClosed);
  const closedTrades = allTrades.filter(t => {
    if (!t.isClosed || !t.closeDate) return false;
    if (startDate && endDate) return t.closeDate >= startDate && t.closeDate <= endDate;
    return true;
  });
  const allOps = state.operations;
  const openOps = allOps.filter(op => !op.isClosed && op.remainingQty > 0);
  const closedOps = allOps.filter(op => op.isClosed);

  return {
    totalOperations: allOps.length,
    openOperations: openOps.length,
    closedOperations: closedOps.length,
    totalTrades: closedTrades.length,
    openTrades: openTrades.length,
    positiveTrades: closedTrades.filter(t => t.returnAmount > 0).length,
    negativeTrades: closedTrades.filter(t => t.returnAmount <= 0).length,
    avgTradeSize: closedTrades.length > 0
      ? closedTrades.reduce((s, t) => s + t.openAmount, 0) / closedTrades.length
      : 0,
    totalCapitalInvested: openOps.reduce((s, op) => s + (op.remainingQty * op.price), 0),
  };
}

export async function getEquityCurve(): Promise<{ date: string; equity: number; trade: string }[]> {
  const state = ensureDataLoaded();
  const sorted = [...state.trades]
    .filter(t => t.isClosed && t.closeDate)
    .sort((a, b) => new Date(a.closeDate!).getTime() - new Date(b.closeDate!).getTime());
  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.returnAmount;
    return {
      date: new Date(t.closeDate!).toISOString().split('T')[0],
      equity: Math.round(cumulative * 100) / 100,
      trade: t.symbol,
    };
  });
}
