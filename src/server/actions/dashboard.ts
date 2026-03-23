/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from 'fs';
import path from 'path';
import { eachMonthOfInterval, isSameMonth } from "date-fns";
import { getMemoryState, initializeMemoryState, initializeFromDB, TradeUnit } from "@/lib/data-loader";
import { getInstrumentType } from "@/lib/utils";
import { db } from "@/server/db";

// Helper to ensure data is loaded (from DB if available, otherwise CSV)
async function ensureDataLoaded() {
    const state = getMemoryState();
    if (!state.isInitialized) {
        const [dbExecutions, dbTradeUnits, dbCashFlows, dbAccounts, dbBrokers] = await Promise.all([
            db.execution.findMany({ orderBy: { date: 'asc' } }),
            db.tradeUnit.findMany({ orderBy: { entryDate: 'asc' } }),
            db.cashFlow.findMany({ orderBy: { date: 'desc' } }),
            db.account.findMany(),
            db.broker.findMany(),
        ]);

        if (dbExecutions.length > 0) {
            initializeFromDB({ executions: dbExecutions, tradeUnits: dbTradeUnits, cashFlows: dbCashFlows, accounts: dbAccounts, brokers: dbBrokers });
        } else {
            const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
            const csvText = fs.readFileSync(csvPath, 'utf-8');
            initializeMemoryState(csvText, true);
        }
    }
    return getMemoryState();
}

async function computeYearData(state: ReturnType<typeof getMemoryState>, year: number) {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const tradeUnits = state.tradeUnits.filter(t => t.status === 'CLOSED' && t.exitDate && t.exitDate >= startOfYear && t.exitDate <= endOfYear);
    const cashFlows = state.cashFlows.filter(c => c.date >= startOfYear && c.date <= endOfYear);

    const { getAccounts } = await import("@/lib/data-loader");
    const accountsFromState = getAccounts().map((c: any) => c.nombre);
    const accountsFromData = Array.from(new Set(tradeUnits.map(t => t.account || 'USA')));
    const allAccounts = Array.from(new Set([...accountsFromState, ...accountsFromData]));

    const months = eachMonthOfInterval({ start: startOfYear, end: endOfYear });
    const brokerMap: Record<string, string> = { 'IBKR': 'USA', 'Schwab': 'USA', 'IOL': 'Argentina', 'AMR': 'USA', 'Cocos': 'Argentina', 'Balanz': 'Argentina', 'Binance': 'CRYPTO' };

    const rows = months.map(monthDate => {
        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const rowData: any = { month: MESES_ES[monthDate.getMonth()] };
        let totalBalance = 0, totalPL = 0, totalIE = 0;

        allAccounts.forEach(accountName => {
            const cTrades = tradeUnits.filter(t => (t.account || 'USA') === accountName && t.exitDate && isSameMonth(t.exitDate, monthDate));
            const cFlows = cashFlows.filter(c => (brokerMap[c.broker] || 'USA') === accountName && isSameMonth(c.date, monthDate));

            const balance = cTrades.reduce((sum, t) => sum + t.entryAmount, 0);
            const pl = cTrades.reduce((sum, t) => sum + t.pnlNominal, 0);
            const ie = cFlows.reduce((sum, c) => sum + (c.type === 'DEPOSIT' ? c.amount : -c.amount), 0);

            rowData[accountName] = { balance, pl, pct: balance > 0 ? (pl / balance) * 100 : 0, ie, count: cTrades.length };
            totalBalance += balance; totalPL += pl; totalIE += ie;
        });

        rowData['TOTAL'] = { balance: totalBalance, pl: totalPL, pct: totalBalance > 0 ? (totalPL / totalBalance) * 100 : 0, ie: totalIE, count: 0 };
        return rowData;
    });

    const totals: any = { month: "TOTAL" };
    [...allAccounts, 'TOTAL'].forEach(key => {
        const colBalance = rows.reduce((sum, r) => sum + (r[key]?.balance || 0), 0);
        const colPL = rows.reduce((sum, r) => sum + (r[key]?.pl || 0), 0);
        const colIE = rows.reduce((sum, r) => sum + (r[key]?.ie || 0), 0);
        totals[key] = { balance: colBalance, pl: colPL, ie: colIE };
    });

    return { accounts: allAccounts as string[], rows, totals };
}

export async function getYieldsData(year?: number | null) {
    const state = await ensureDataLoaded();

    if (!year) {
        // All years: find distinct years from closed tradeUnits, sort descending
        const closedTUs = state.tradeUnits.filter(t => t.status === 'CLOSED' && t.exitDate);
        const years = [...new Set(closedTUs.map(t => t.exitDate!.getFullYear()))].sort((a, b) => b - a);
        if (years.length === 0) return { accounts: [], rows: [], totals: {}, yearGroups: [] };
        const groups = await Promise.all(years.map(async y => ({ year: y, ...(await computeYearData(state, y)) })));
        return { accounts: groups[0].accounts, rows: [], totals: {}, yearGroups: groups };
    }

    return computeYearData(state, year);
}

export async function getStats(startDate: Date, endDate: Date) {
    const state = await ensureDataLoaded();
    const tradeUnits = state.tradeUnits
        .filter(t => t.status === 'CLOSED' && t.exitDate && t.exitDate >= startDate && t.exitDate <= endDate)
        .sort((a, b) => a.exitDate!.getTime() - b.exitDate!.getTime());

    const totalTrades = tradeUnits.length;
    if (totalTrades === 0) return createEmptyStats();

    const wins = tradeUnits.filter(t => t.pnlNominal > 0);
    const losses = tradeUnits.filter(t => t.pnlNominal <= 0);
    const grossProfit = wins.reduce((acc, t) => acc + t.pnlNominal, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnlNominal, 0));
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
    tradeUnits.forEach(t => {
        runningBalance += t.pnlNominal;
        if (runningBalance > peak) peak = runningBalance;
        const dd = peak - runningBalance;
        if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // 2. Streaks
    let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
    tradeUnits.forEach(t => {
        if (t.pnlNominal > 0) { curWin++; curLoss = 0; if (curWin > maxWinStreak) maxWinStreak = curWin; }
        else { curLoss++; curWin = 0; if (curLoss > maxLossStreak) maxLossStreak = curLoss; }
    });

    // 3. Sharpe/Sortino Simplified
    const returns = tradeUnits.map(t => t.pnlPercent);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / totalTrades;
    const stdDev = Math.sqrt(returns.map(x => Math.pow(x - avgReturn, 2)).reduce((a, b) => a + b, 0) / totalTrades);
    const negativeReturns = returns.filter(r => r < 0);
    const downsideStdDev = Math.sqrt(negativeReturns.map(x => Math.pow(x, 2)).reduce((a, b) => a + b, 0) / totalTrades);

    // 4. Instrument Stats
    const instrumentStats = tradeUnits.reduce((acc: any, t) => {
        const type = getInstrumentType(t.symbol);
        if (!acc[type]) acc[type] = { pl: 0, count: 0 };
        acc[type].pl += t.pnlNominal;
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
        maxWin: Math.max(...tradeUnits.map(t => t.pnlNominal), 0),
        maxLoss: Math.min(...tradeUnits.map(t => t.pnlNominal), 0),
        maxWinStreak, maxLossStreak,
        avgHoldingTime: tradeUnits.reduce((acc, t) => acc + t.days, 0) / totalTrades,
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
  const state = await ensureDataLoaded();
  const closedTUs = state.tradeUnits.filter((t: TradeUnit) => {
    if (t.status !== 'CLOSED' || !t.exitDate) return false;
    if (startDate && endDate) return t.exitDate >= startDate && t.exitDate <= endDate;
    return true;
  });
  if (closedTUs.length === 0) return null;

  const top5Trades = [...closedTUs].sort((a: TradeUnit, b: TradeUnit) => b.pnlNominal - a.pnlNominal).slice(0, 5);

  const monthlyMap = new Map<string, number>();
  closedTUs.forEach((t: TradeUnit) => {
    const key = `${t.exitDate!.getFullYear()}-${String(t.exitDate!.getMonth()+1).padStart(2,'0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.pnlNominal);
  });
  const bestMonthEntry = [...monthlyMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestMonth = bestMonthEntry ? { month: bestMonthEntry[0], total: bestMonthEntry[1] } : null;
  const bestReturnTrade = [...closedTUs].sort((a: TradeUnit, b: TradeUnit) => b.pnlPercent - a.pnlPercent)[0] || null;

  return { top5Trades, bestMonth, bestReturnTrade };
}

export async function getDashboardSummary(startDate?: Date, endDate?: Date) {
  const state = await ensureDataLoaded();
  const allTUs = state.tradeUnits;
  const openTUs = allTUs.filter((t: TradeUnit) => t.status === 'OPEN');
  const closedTUs = allTUs.filter((t: TradeUnit) => {
    if (t.status !== 'CLOSED' || !t.exitDate) return false;
    if (startDate && endDate) return t.exitDate >= startDate && t.exitDate <= endDate;
    return true;
  });
  const allExecs = state.executions;
  const openExecs = allExecs.filter(exec => !exec.isClosed && exec.remainingQty > 0);
  const closedExecs = allExecs.filter(exec => exec.isClosed);

  return {
    totalOperations: allExecs.length,
    openOperations: openExecs.length,
    closedOperations: closedExecs.length,
    totalTrades: closedTUs.length,
    openTrades: openTUs.length,
    positiveTrades: closedTUs.filter((t: TradeUnit) => t.pnlNominal > 0).length,
    negativeTrades: closedTUs.filter((t: TradeUnit) => t.pnlNominal <= 0).length,
    avgTradeSize: closedTUs.length > 0
      ? closedTUs.reduce((s: number, t: TradeUnit) => s + t.entryAmount, 0) / closedTUs.length
      : 0,
    totalCapitalInvested: openExecs.reduce((s, exec) => s + (exec.remainingQty * exec.price), 0),
  };
}

export async function getEquityCurve(): Promise<{ date: string; equity: number; trade: string }[]> {
  const state = await ensureDataLoaded();
  const sorted = [...state.tradeUnits]
    .filter(t => t.status === 'CLOSED' && t.exitDate)
    .sort((a, b) => new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime());
  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.pnlNominal;
    return {
      date: new Date(t.exitDate!).toISOString().split('T')[0],
      equity: Math.round(cumulative * 100) / 100,
      trade: t.symbol,
    };
  });
}
