/* eslint-disable @typescript-eslint/no-explicit-any */
import { subDays, subMonths } from "date-fns";
import { getInstrumentType } from "@/lib/utils";

export const USE_DB = process.env.USE_DB === 'true';

// --- Interfaces ---

export interface Execution {
    id: number;
    date: Date;
    symbol: string;
    qty: number;
    price: number;
    amount: number;
    broker: string;
    account: string;
    side: 'BUY' | 'SELL';
    remainingQty: number;
    isClosed: boolean;
    currency: string;
    commissions: number;
    exchange_rate: number; // Tipo de cambio respecto a moneda base. Default: 1
}

export interface TradeUnit {
    id: number;
    symbol: string;
    qty: number;
    entryDate: Date;
    exitDate?: Date;
    entryPrice: number;
    exitPrice?: number;
    entryAmount: number;
    exitAmount?: number;
    days: number;
    pnlNominal: number;
    pnlPercent: number;
    tna: number;
    broker: string;
    account: string;
    status: 'OPEN' | 'CLOSED';
    entryExecId?: number;
    exitExecId?: number;
    side: 'BUY' | 'SELL';
}

export interface Account {
    id: number;
    nombre: string;
    descripcion?: string;
    matchingStrategy: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL';
}

export interface Broker {
    id: number;
    nombre: string;
    descripcion?: string;
}

export interface CashFlow {
    id: number;
    date: Date;
    amount: number;
    type: 'DEPOSIT' | 'WITHDRAWAL';
    broker: string;
    account?: string;
    description?: string;
}

// --- Memory State ---

let memoryState = {
    executions: [] as Execution[],
    tradeUnits: [] as TradeUnit[],
    cashFlows: [] as CashFlow[],
    accounts: [] as Account[],
    brokers: [] as Broker[],
    isInitialized: false,
    isDBBacked: false, // true when loaded from Supabase/Prisma
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
            if (header === 'date') val = new Date(val + 'T12:00:00');
            op[header] = val;
        });

        if (op.category === 'TRADE') {
            op.amount = Math.abs(op.quantity * op.price);
            op.remainingQty = Math.abs(op.quantity);
            op.side = op.type || (op.quantity > 0 ? 'BUY' : 'SELL');
            op.qty = Math.abs(op.quantity);
            op.currency = 'USD';
            op.commissions = 0;
            // If cuenta not in CSV headers, derive from broker
            if (!headers.includes('cuenta')) {
                const brokerCuentaMap: Record<string, string> = { 'IBKR': 'USA', 'IOL': 'Argentina', 'Schwab': 'USA', 'Binance': 'CRYPTO', 'Cocos': 'Argentina', 'Balanz': 'Argentina' };
                op.account = brokerCuentaMap[op.broker] || 'USA';
            } else {
                op.account = op.cuenta?.trim() || 'USA';
            }
            rawOps.push(op);
        }
    });

    // 2. Add Mock Executions (Open Positions) — skipped in test mode
    const today = new Date();
    const mockOps = includeMockData ? [
        { id: 900, date: subDays(today, 5), symbol: 'TSLA', quantity: 10, qty: 10, price: 200, amount: 2000, broker: 'Schwab', account: 'USA', side: 'BUY', remainingQty: 10, currency: 'USD', commissions: 0, exchange_rate: 1 },
        { id: 901, date: subDays(today, 2), symbol: 'NVDA', quantity: -5, qty: 5, price: 800, amount: 4000, broker: 'IOL', account: 'Argentina', side: 'SELL', remainingQty: 5, currency: 'USD', commissions: 0, exchange_rate: 1 },
        { id: 902, date: subMonths(today, 1), symbol: 'AAPL', quantity: 100, qty: 100, price: 150, amount: 15000, broker: 'Schwab', account: 'USA', side: 'BUY', remainingQty: 100, currency: 'USD', commissions: 0, exchange_rate: 1 },
        { id: 903, date: subDays(today, 10), symbol: 'AAPL', quantity: -50, qty: 50, price: 160, amount: 8000, broker: 'Schwab', account: 'USA', side: 'SELL', remainingQty: 50, currency: 'USD', commissions: 0, exchange_rate: 1 }
    ] : [];

    const allOps = [...rawOps, ...mockOps].sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3. FIFO Matching — key: symbol::account::broker
    const openInventory: Record<string, any[]> = {};
    const tradeUnits: TradeUnit[] = [];
    let tradeIdCounter = 1;

    allOps.forEach(op => {
        const side = op.side || (op.quantity > 0 ? 'BUY' : 'SELL');
        const matchKey = `${op.symbol}::${op.account || 'USA'}::${op.broker}`;

        if (side === 'BUY') {
            if (!openInventory[matchKey]) openInventory[matchKey] = [];
            openInventory[matchKey].push(op);
        } else {
            let sellQty = Math.abs(op.quantity);
            const matches = openInventory[matchKey] || [];

            while (sellQty > 0 && matches.length > 0) {
                const buyOp = matches[0];
                const matchQty = Math.min(sellQty, buyOp.remainingQty);

                const pnlNominal = (op.price - buyOp.price) * matchQty;
                const entryAmount = buyOp.price * matchQty;
                const exitAmount = op.price * matchQty;
                const days = Math.ceil(Math.abs(op.date.getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                const pnlPercent = (pnlNominal / entryAmount) * 100;

                tradeUnits.push({
                    id: tradeIdCounter++,
                    symbol: op.symbol,
                    qty: matchQty,
                    entryDate: buyOp.date,
                    exitDate: op.date,
                    entryPrice: buyOp.price,
                    exitPrice: op.price,
                    entryAmount: entryAmount,
                    exitAmount: exitAmount,
                    days,
                    pnlNominal,
                    pnlPercent,
                    tna: (pnlPercent / days) * 365,
                    broker: op.broker,
                    account: buyOp.account || 'USA',
                    status: 'CLOSED',
                    entryExecId: buyOp.id,
                    exitExecId: op.id,
                    side: 'BUY',
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

    // 4. Create open TradeUnit records for unmatched BUY positions
    Object.values(openInventory).forEach(buyOps => {
        buyOps.forEach(buyOp => {
            if (buyOp.remainingQty <= 0.0001) return;
            const days = Math.ceil(Math.abs(new Date().getTime() - buyOp.date.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            tradeUnits.push({
                id: tradeIdCounter++,
                symbol: buyOp.symbol,
                qty: buyOp.remainingQty,
                entryDate: buyOp.date,
                entryPrice: buyOp.price,
                entryAmount: buyOp.price * buyOp.remainingQty,
                days,
                pnlNominal: 0,
                pnlPercent: 0,
                tna: 0,
                broker: buyOp.broker,
                account: buyOp.account || 'USA',
                status: 'OPEN',
                entryExecId: buyOp.id,
                side: 'BUY',
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

    // Build executions array from allOps, mapping old field names to new
    const executions: Execution[] = allOps.map(op => ({
        id: op.id,
        date: op.date,
        symbol: op.symbol,
        qty: op.qty ?? Math.abs(op.quantity ?? 0),
        price: op.price,
        amount: op.amount,
        broker: op.broker,
        account: op.account || 'USA',
        side: op.side || (op.quantity > 0 ? 'BUY' : 'SELL'),
        remainingQty: op.remainingQty,
        isClosed: op.isClosed || false,
        currency: op.currency || 'USD',
        commissions: op.commissions || 0,
        exchange_rate: op.exchange_rate ?? 1,
    }));

    memoryState = {
        executions,
        tradeUnits,
        cashFlows,
        accounts: [
            { id: 1, nombre: 'USA', descripcion: 'Cuenta internacional', matchingStrategy: 'FIFO' as const },
            { id: 2, nombre: 'Argentina', descripcion: 'Cuenta local', matchingStrategy: 'FIFO' as const },
            { id: 3, nombre: 'CRYPTO', descripcion: 'Criptomonedas', matchingStrategy: 'FIFO' as const },
        ],
        brokers: [
            { id: 1, nombre: 'Schwab', descripcion: 'Interactive Brokers USA' },
            { id: 2, nombre: 'Binance', descripcion: 'Exchange de criptomonedas' },
            { id: 3, nombre: 'Cocos', descripcion: 'Broker argentino' },
            { id: 4, nombre: 'Balanz', descripcion: 'Broker argentino' },
            { id: 5, nombre: 'AMR', descripcion: 'Broker' },
            { id: 6, nombre: 'IOL', descripcion: 'InvertirOnLine' },
            { id: 7, nombre: 'IBKR', descripcion: 'Interactive Brokers' },
            { id: 8, nombre: 'PP', descripcion: 'PPI Broker' },
        ],
        isInitialized: true,
        isDBBacked: false,
    };
}

export function initializeFromDB(data: {
  executions: Array<{
    id: number; date: Date; symbol: string; qty: number; price: number;
    amount: number; broker: string; account: string; side: string;
    isClosed: boolean; remainingQty: number; currency: string;
    commissions: number; exchange_rate: number;
  }>;
  tradeUnits: Array<{
    id: number; symbol: string; qty: number; entryDate: Date; exitDate: Date | null;
    entryPrice: number; exitPrice: number | null; entryAmount: number;
    exitAmount: number | null; days: number; pnlNominal: number; pnlPercent: number;
    tna: number; broker: string; account: string; status: string; side: string;
    entryExecId: number | null; exitExecId: number | null;
  }>;
  cashFlows: Array<{
    id: number; date: Date; amount: number; type: string;
    broker: string; account: string | null; description: string | null;
  }>;
  accounts?: Array<{ id: number; nombre: string; descripcion: string | null; matchingStrategy: string }>;
  brokers?: Array<{ id: number; nombre: string; descripcion: string | null }>;
}) {

  const executions: Execution[] = data.executions.map((e) => ({
    id: e.id, date: e.date, symbol: e.symbol, qty: e.qty, price: e.price,
    amount: e.amount, broker: e.broker, account: e.account,
    side: e.side as 'BUY' | 'SELL', isClosed: e.isClosed,
    remainingQty: e.remainingQty, currency: e.currency,
    commissions: e.commissions, exchange_rate: e.exchange_rate,
  }));

  const tradeUnits: TradeUnit[] = data.tradeUnits.map((t) => ({
    id: t.id, symbol: t.symbol, qty: t.qty, entryDate: t.entryDate,
    exitDate: t.exitDate ?? undefined, entryPrice: t.entryPrice,
    exitPrice: t.exitPrice ?? undefined, entryAmount: t.entryAmount,
    exitAmount: t.exitAmount ?? undefined, days: t.days,
    pnlNominal: t.pnlNominal, pnlPercent: t.pnlPercent, tna: t.tna,
    broker: t.broker, account: t.account,
    status: t.status as 'OPEN' | 'CLOSED',
    side: t.side as 'BUY' | 'SELL',
    entryExecId: t.entryExecId ?? undefined,
    exitExecId: t.exitExecId ?? undefined,
  }));

  const cashFlows: CashFlow[] = data.cashFlows.map((c) => ({
    id: c.id, date: c.date, amount: c.amount,
    type: c.type as 'DEPOSIT' | 'WITHDRAWAL',
    broker: c.broker, account: c.account ?? undefined,
    description: c.description ?? undefined,
  }));

  const defaultAccounts: Account[] = [
    { id: 1, nombre: 'USA', descripcion: 'Cuenta internacional', matchingStrategy: 'FIFO' as const },
    { id: 2, nombre: 'Argentina', descripcion: 'Cuenta local', matchingStrategy: 'FIFO' as const },
    { id: 3, nombre: 'CRYPTO', descripcion: 'Criptomonedas', matchingStrategy: 'FIFO' as const },
  ];

  const defaultBrokers: Broker[] = [
    { id: 1, nombre: 'Schwab', descripcion: 'Schwab USA' },
    { id: 2, nombre: 'Binance', descripcion: 'Exchange de criptomonedas' },
    { id: 3, nombre: 'Cocos', descripcion: 'Broker argentino' },
    { id: 4, nombre: 'Balanz', descripcion: 'Broker argentino' },
    { id: 5, nombre: 'AMR', descripcion: 'Broker' },
    { id: 6, nombre: 'IOL', descripcion: 'InvertirOnLine' },
    { id: 7, nombre: 'IBKR', descripcion: 'Interactive Brokers' },
    { id: 8, nombre: 'PP', descripcion: 'PPI Broker' },
  ];

  memoryState = {
    executions,
    tradeUnits,
    cashFlows,
    accounts: data.accounts
      ? data.accounts.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion ?? undefined,
          matchingStrategy: c.matchingStrategy as Account['matchingStrategy'],
        }))
      : defaultAccounts,
    brokers: data.brokers
      ? data.brokers.map((b) => ({
          id: b.id,
          nombre: b.nombre,
          descripcion: b.descripcion ?? undefined,
        }))
      : defaultBrokers,
    isInitialized: true,
    isDBBacked: true,
  };
}

export function getMemoryState() {
    return memoryState;
}

export function resetMemoryState() {
  memoryState = {
    executions: [] as Execution[],
    tradeUnits: [] as TradeUnit[],
    cashFlows: [] as CashFlow[],
    accounts: [] as Account[],
    brokers: [] as Broker[],
    isInitialized: false,
    isDBBacked: false,
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

export function updateCashFlow(id: number, data: Partial<Omit<CashFlow, 'id'>>): boolean {
  const state = getMemoryState();
  const cf = state.cashFlows.find(c => c.id === id);
  if (!cf) return false;
  Object.assign(cf, data);
  return true;
}

export function getAccounts(): Account[] {
    return memoryState.accounts;
}

export function addAccount(nombre: string, descripcion?: string): Account {
    const state = getMemoryState();
    const newId = state.accounts.length > 0 ? Math.max(...state.accounts.map(c => c.id)) + 1 : 1;
    const newAccount: Account = { id: newId, nombre, descripcion, matchingStrategy: 'FIFO' };
    state.accounts.push(newAccount);
    return newAccount;
}

export function updateAccount(id: number, nombre: string, descripcion?: string): boolean {
    const state = getMemoryState();
    const account = state.accounts.find(c => c.id === id);
    if (!account) return false;
    account.nombre = nombre;
    account.descripcion = descripcion;
    return true;
}

export function removeAccount(id: number): boolean {
    const state = getMemoryState();
    const idx = state.accounts.findIndex(c => c.id === id);
    if (idx === -1) return false;
    state.accounts.splice(idx, 1);
    return true;
}

export function updateAccountStrategy(id: number, strategy: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL'): boolean {
    const state = getMemoryState();
    const account = state.accounts.find(c => c.id === id);
    if (!account) return false;
    account.matchingStrategy = strategy;
    return true;
}

export function getBrokers(): Broker[] {
    return memoryState.brokers;
}

export function addBroker(nombre: string, descripcion?: string): Broker {
    const state = getMemoryState();
    const newId = state.brokers.length > 0 ? Math.max(...state.brokers.map(b => b.id)) + 1 : 1;
    const newBroker: Broker = { id: newId, nombre, descripcion };
    state.brokers.push(newBroker);
    return newBroker;
}

export function updateBroker(id: number, nombre: string, descripcion?: string): boolean {
    const state = getMemoryState();
    const broker = state.brokers.find(b => b.id === id);
    if (!broker) return false;
    broker.nombre = nombre;
    broker.descripcion = descripcion;
    return true;
}

export function removeBroker(id: number): boolean {
    const state = getMemoryState();
    const idx = state.brokers.findIndex(b => b.id === id);
    if (idx === -1) return false;
    state.brokers.splice(idx, 1);
    return true;
}

export function addTransactionToState(data: {
    symbol: string; qty: number; price: number; broker: string;
    account: string; side: 'BUY' | 'SELL'; date?: Date;
    currency?: string; commissions?: number; exchange_rate?: number;
}): Execution {
    const state = getMemoryState();
    const newId = state.executions.length > 0 ? Math.max(...state.executions.map(o => o.id)) + 1 : 1;
    const exec: Execution = {
        id: newId,
        date: data.date || new Date(),
        symbol: data.symbol.toUpperCase(),
        qty: data.qty,
        price: data.price,
        amount: Math.abs(data.qty * data.price),
        broker: data.broker,
        account: data.account || 'USA',
        side: data.side,
        remainingQty: Math.abs(data.qty),
        isClosed: false,
        currency: data.currency || 'USD',
        commissions: data.commissions || 0,
        exchange_rate: data.exchange_rate ?? 1,
    };
    state.executions.push(exec);
    return exec;
}

// Backward compat alias
export const addExecutionToState = addTransactionToState;

export function getTopStats() {
  const state = getMemoryState();
  if (!state.isInitialized || state.tradeUnits.length === 0) return null;

  const closedTUs = state.tradeUnits.filter(t => t.status === 'CLOSED');
  const openExecs = state.executions.filter(op => !op.isClosed && op.remainingQty > 0);

  // Top 5 tradeUnits por pnlNominal desc
  const top5Trades = [...closedTUs].sort((a, b) => b.pnlNominal - a.pnlNominal).slice(0, 5);

  // Mejor mes (agrupar por mes, sumar pnlNominal)
  const monthlyMap = new Map<string, number>();
  closedTUs.forEach(t => {
    const key = `${t.exitDate!.getFullYear()}-${String(t.exitDate!.getMonth()+1).padStart(2,'0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + t.pnlNominal);
  });
  const bestMonthEntry = [...monthlyMap.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestMonth = bestMonthEntry ? { month: bestMonthEntry[0], total: bestMonthEntry[1] } : null;

  // TradeUnit con mejor pnlPercent
  const bestReturnTrade = [...closedTUs].sort((a, b) => b.pnlPercent - a.pnlPercent)[0] || null;

  // Rendimiento por tipo de instrumento
  const byInstrument: Record<string, number> = {};
  closedTUs.forEach(t => {
    const k = getInstrumentType(t.symbol);
    byInstrument[k] = (byInstrument[k] || 0) + t.pnlNominal;
  });

  return {
    top5Trades,
    bestMonth,
    bestReturnTrade,
    byInstrument,
    openPositionsCount: openExecs.length,
    openPositionsBySymbol: Object.entries(
      openExecs.reduce((acc: Record<string, { count: number; totalAmount: number }>, op) => {
        if (!acc[op.symbol]) acc[op.symbol] = { count: 0, totalAmount: 0 };
        acc[op.symbol].count++;
        acc[op.symbol].totalAmount += op.amount;
        return acc;
      }, {})
    ).map(([symbol, data]) => ({ symbol, ...data }))
  };
}
