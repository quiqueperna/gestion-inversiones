/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from 'fs';
import path from 'path';
import { format, eachMonthOfInterval, isSameMonth } from "date-fns";
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

export async function getYieldsData(year: number = new Date().getFullYear()) {
    const state = ensureDataLoaded();
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const trades = state.trades.filter(t => t.isClosed && t.closeDate && t.closeDate >= startOfYear && t.closeDate <= endOfYear);
    const cashFlows = state.cashFlows.filter(c => c.date >= startOfYear && c.date <= endOfYear);

    const brokers = Array.from(new Set([...trades.map(t => t.broker), ...cashFlows.map(c => c.broker)]));
    const months = eachMonthOfInterval({ start: startOfYear, end: endOfYear });

    const rows = months.map(monthDate => {
        const rowData: any = { month: format(monthDate, 'MMM') };
        let totalPL = 0;
        let totalIE = 0;

        brokers.forEach(broker => {
            const bTrades = trades.filter(t => t.broker === broker && t.closeDate && isSameMonth(t.closeDate, monthDate));
            const bFlows = cashFlows.filter(c => c.broker === broker && isSameMonth(c.date, monthDate));

            const pl = bTrades.reduce((sum, t) => sum + t.returnAmount, 0);
            const ie = bFlows.reduce((sum, c) => sum + (c.type === 'DEPOSIT' ? c.amount : -c.amount), 0);
            const entrySum = bTrades.reduce((sum, t) => sum + t.openAmount, 0);

            rowData[broker] = {
                pl,
                pct: entrySum > 0 ? (pl / entrySum) * 100 : 0,
                ie,
                count: bTrades.length
            };
            totalPL += pl;
            totalIE += ie;
        });

        rowData['TOTAL'] = { pl: totalPL, pct: 0, ie: totalIE, count: 0 };
        return rowData;
    });

    const totals: any = { month: "TOTAL" };
    [...brokers, 'TOTAL'].forEach(key => {
        const colPL = rows.reduce((sum, r) => sum + (r[key]?.pl || 0), 0);
        const colIE = rows.reduce((sum, r) => sum + (r[key]?.ie || 0), 0);
        totals[key] = { pl: colPL, ie: colIE };
    });

    return { brokers, rows, totals };
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

export async function getTopStats() {
  ensureDataLoaded();
  const { getTopStats: getTopStatsLib } = await import("@/lib/data-loader");
  return getTopStatsLib();
}

export async function getDashboardSummary() {
  const state = ensureDataLoaded();
  const allTrades = state.trades;
  const closedTrades = allTrades.filter(t => t.isClosed);
  const openTrades = allTrades.filter(t => !t.isClosed);
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
