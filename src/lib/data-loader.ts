/* eslint-disable @typescript-eslint/no-explicit-any */
import { subDays, subMonths } from "date-fns";

export const USE_DB = process.env.USE_DB === 'true';

// --- Interfaces ---

export interface Operation {
    id: number;
    date: Date;
    symbol: string;
    quantity: number;
    price: number;
    amount: number;
    broker: string;
    type: 'BUY' | 'SELL';
    remainingQty: number;
    isClosed: boolean;
    isFalopa: boolean;
    isIntra: boolean;
}

export interface Trade {
    id: number;
    symbol: string;
    quantity: number;
    openDate: Date;
    closeDate?: Date;
    openPrice: number;
    closePrice?: number;
    openAmount: number;
    closeAmount?: number;
    days: number;
    returnAmount: number;
    returnPercent: number;
    tna: number;
    broker: string;
    instrumentType: string;
    isClosed: boolean;
    openOperationId?: number;
}

export interface CashFlow {
    id: number;
    date: Date;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    broker: string;
    description?: string;
}

// --- Memory State ---

let memoryState = {
    operations: [] as Operation[],
    trades: [] as Trade[],
    cashFlows: [] as CashFlow[],
    isInitialized: false
};

// --- Initialization Logic (CSV + Mock Data) ---

export function initializeMemoryState(csvText: string, includeMockData = false) {
    if (memoryState.isInitialized) return;

    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rawOps: any[] = [];

    // 1. Parse CSV
    lines.slice(1).filter(line => line.trim() !== '').forEach((line, index) => {
        const values = line.split(',');
        const op: any = { id: index + 1 };
        headers.forEach((header, i) => {
            let val: any = values[i];
            if (header === 'quantity' || header === 'price') val = parseFloat(val);
            if (header === 'isFalopa') val = val === 'true';
            if (header === 'date') val = new Date(val);
            op[header] = val;
        });

        if (op.category === 'TRADE') {
            op.amount = Math.abs(op.quantity * op.price);
            op.remainingQty = Math.abs(op.quantity);
            op.type = op.type || (op.quantity > 0 ? 'BUY' : 'SELL');
            rawOps.push(op);
        }
    });

    // 2. Add Mock Operations (Open Positions) — skipped in test mode
    const today = new Date();
    const mockOps = includeMockData ? [
        { id: 900, date: subDays(today, 5), symbol: 'TSLA', quantity: 10, price: 200, amount: 2000, broker: 'AMR', type: 'BUY', remainingQty: 10, isFalopa: false, isIntra: false },
        { id: 901, date: subDays(today, 2), symbol: 'NVDA', quantity: -5, price: 800, amount: 4000, broker: 'IOL', type: 'SELL', remainingQty: 5, isFalopa: false, isIntra: true },
        { id: 902, date: subMonths(today, 1), symbol: 'AAPL', quantity: 100, price: 150, amount: 15000, broker: 'AMR', type: 'BUY', remainingQty: 100, isFalopa: false, isIntra: false },
        { id: 903, date: subDays(today, 10), symbol: 'AAPL', quantity: -50, price: 160, amount: 8000, broker: 'AMR', type: 'SELL', remainingQty: 50, isFalopa: false, isIntra: false }
    ] : [];

    const allOps = [...rawOps, ...mockOps].sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3. FIFO Matching
    const openInventory: Record<string, any[]> = {};
    const trades: Trade[] = [];
    let tradeIdCounter = 1;

    allOps.forEach(op => {
        // Simple Instrument Heuristic
        let instrumentType = 'STOCK';
        if (op.symbol.includes('BTC') || op.symbol.includes('ETH')) instrumentType = 'CRYPTO';
        else if (op.symbol.endsWith('D') || op.symbol.length > 4) instrumentType = 'CEDEAR';

        if (op.type === 'BUY') {
            if (!openInventory[op.symbol]) openInventory[op.symbol] = [];
            openInventory[op.symbol].push(op);
        } else {
            let sellQty = Math.abs(op.quantity);
            const matches = openInventory[op.symbol] || [];
            
            while (sellQty > 0 && matches.length > 0) {
                const buyOp = matches[0];
                const matchQty = Math.min(sellQty, buyOp.remainingQty);
                
                const returnAmount = (op.price - buyOp.price) * matchQty;
                const entryAmount = buyOp.price * matchQty;
                const closeAmount = op.price * matchQty;
                const days = Math.ceil(Math.abs(op.date.getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                const returnPercent = (returnAmount / entryAmount) * 100;

                trades.push({
                    id: tradeIdCounter++,
                    symbol: op.symbol,
                    quantity: matchQty,
                    openDate: buyOp.date,
                    closeDate: op.date,
                    openPrice: buyOp.price,
                    closePrice: op.price,
                    openAmount: entryAmount,
                    closeAmount: closeAmount,
                    days,
                    returnAmount,
                    returnPercent,
                    tna: (returnPercent / days) * 365,
                    broker: op.broker,
                    instrumentType,
                    isClosed: true,
                    openOperationId: buyOp.id,
                });

                buyOp.remainingQty -= matchQty;
                sellQty -= matchQty;
                if (buyOp.remainingQty <= 0.0001) {
                    buyOp.isClosed = true;
                    matches.shift();
                }
            }
            op.remainingQty = sellQty;
            op.isClosed = sellQty <= 0.0001;
        }
    });

    // 4. Create open Trade records for unmatched BUY positions
    Object.values(openInventory).forEach(buyOps => {
        buyOps.forEach(buyOp => {
            if (buyOp.remainingQty <= 0.0001) return;
            let instrumentType = 'STOCK';
            if (buyOp.symbol.includes('BTC') || buyOp.symbol.includes('ETH')) instrumentType = 'CRYPTO';
            else if (buyOp.symbol.endsWith('D') || buyOp.symbol.length > 4) instrumentType = 'CEDEAR';

            const days = Math.ceil(Math.abs(new Date().getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            trades.push({
                id: tradeIdCounter++,
                symbol: buyOp.symbol,
                quantity: buyOp.remainingQty,
                openDate: buyOp.date,
                openPrice: buyOp.price,
                openAmount: buyOp.price * buyOp.remainingQty,
                days,
                returnAmount: 0,
                returnPercent: 0,
                tna: 0,
                broker: buyOp.broker,
                instrumentType,
                isClosed: false,
                openOperationId: buyOp.id,
            });
        });
    });

    // 5. Mock CashFlows
    const cashFlows: CashFlow[] = [];
    const brokers = ['AMR', 'IOL', 'BINANCE'];
    brokers.forEach((b, i) => {
        cashFlows.push({ id: i*3+1, date: new Date(2023, 0, 1), amount: 10000, type: 'DEPOSIT', broker: b, description: 'Deposito Inicial' });
        cashFlows.push({ id: i*3+2, date: new Date(2023, 5, 15), amount: 500, type: 'DEPOSIT', broker: b, description: 'Aporte' });
        cashFlows.push({ id: i*3+3, date: new Date(2023, 11, 20), amount: 2000, type: 'WITHDRAWAL', broker: b, description: 'Retiro' });
    });

    memoryState = {
        operations: allOps,
        trades,
        cashFlows,
        isInitialized: true
    };
}

export function getMemoryState() {
    return memoryState;
}

export function resetMemoryState() {
  memoryState = {
    operations: [] as Operation[],
    trades: [] as Trade[],
    cashFlows: [] as CashFlow[],
    isInitialized: false,
  };
}

export function addCashFlow(cf: Omit<CashFlow, 'id'>): CashFlow {
  const state = getMemoryState();
  const newId = state.cashFlows.length > 0
    ? Math.max(...state.cashFlows.map(c => c.id)) + 1
    : 1;
  const newCf: CashFlow = { ...cf, id: newId };
  state.cashFlows.push(newCf);
  return newCf;
}

export function removeCashFlow(id: number): boolean {
  const state = getMemoryState();
  const idx = state.cashFlows.findIndex(c => c.id === id);
  if (idx === -1) return false;
  state.cashFlows.splice(idx, 1);
  return true;
}

export function getTopStats() {
  const state = getMemoryState();
  if (!state.isInitialized || state.trades.length === 0) return null;

  const closedTrades = state.trades.filter(t => t.isClosed);
  const openOps = state.operations.filter(op => !op.isClosed && op.remainingQty > 0);

  // Top 5 trades por returnAmount desc
  const top5Trades = [...closedTrades].sort((a, b) => b.returnAmount - a.returnAmount).slice(0, 5);

  // Mejor mes (agrupar por mes, sumar returnAmount)
  const monthlyMap = new Map<string, number>();
  closedTrades.forEach(t => {
    const key = `${t.closeDate!.getFullYear()}-${String(t.closeDate!.getMonth()+1).padStart(2,'0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.returnAmount);
  });
  const bestMonthEntry = [...monthlyMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestMonth = bestMonthEntry ? { month: bestMonthEntry[0], total: bestMonthEntry[1] } : null;

  // Trade con mejor returnPercent
  const bestReturnTrade = [...closedTrades].sort((a, b) => b.returnPercent - a.returnPercent)[0] || null;

  // Rendimiento por tipo de instrumento
  const byInstrument: Record<string, number> = {};
  closedTrades.forEach(t => {
    const k = t.instrumentType || 'STOCK';
    byInstrument[k] = (byInstrument[k] || 0) + t.returnAmount;
  });

  return {
    top5Trades,
    bestMonth,
    bestReturnTrade,
    byInstrument,
    openPositionsCount: openOps.length,
    openPositionsBySymbol: Object.entries(
      openOps.reduce((acc: Record<string, { count: number; totalAmount: number }>, op) => {
        if (!acc[op.symbol]) acc[op.symbol] = { count: 0, totalAmount: 0 };
        acc[op.symbol].count++;
        acc[op.symbol].totalAmount += op.amount;
        return acc;
      }, {})
    ).map(([symbol, data]) => ({ symbol, ...data }))
  };
}
