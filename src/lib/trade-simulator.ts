/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SimExec {
  ref: string;          // unique reference (import rows: row index; DB: "db-{id}")
  dbId?: number;        // only set for DB-originated execs
  date: Date;
  symbol: string;
  qty: number;
  price: number;
  broker: string;
  account: string;
  side: 'BUY' | 'SELL';
  remainingQty: number;
  isFromDB: boolean;
  currency: string;
  exchange_rate: number;
  commissions: number;
}

export interface ProjectedTrade {
  ref: string;
  symbol: string;
  qty: number;
  entryDate: Date;
  exitDate?: Date;
  entryPrice: number;
  exitPrice?: number;
  entryAmount: number;
  exitAmount?: number;
  pnlNominal: number;
  pnlPercent: number;
  days: number;
  tna: number;
  broker: string;
  account: string;
  status: 'OPEN' | 'CLOSED';
  strategy: string;
  entryExecRef: string;
  exitExecRef?: string;
  dbEntryExecId?: number;  // if entry exec is from DB
  dbExitExecId?: number;   // if exit exec is from DB
}

export interface ManualMatchCandidate {
  ref: string;
  dbId?: number;
  date: Date;
  remainingQty: number;
  price: number;
  isFromDB: boolean;
}

export interface ManualMatchRequired {
  sellRef: string;
  symbol: string;
  date: Date;
  qty: number;
  price: number;
  account: string;
  broker: string;
  candidates: ManualMatchCandidate[];
}

export interface ManualDecision {
  sellRef: string;
  buyRef: string;
  qty: number;
}

export interface SimulationResult {
  trades: ProjectedTrade[];
  manualMatchRequired: ManualMatchRequired[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcDays(entryDate: Date, exitDate: Date): number {
  return Math.max(1, Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function sortByStrategy(
  candidates: SimExec[],
  strategy: string,
  closePrice: number,
): SimExec[] {
  const sorted = [...candidates];
  if (strategy === 'FIFO') {
    sorted.sort((a, b) => a.date.getTime() - b.date.getTime());
  } else if (strategy === 'LIFO') {
    sorted.sort((a, b) => b.date.getTime() - a.date.getTime());
  } else if (strategy === 'MAX_PROFIT') {
    sorted.sort((a, b) => (closePrice - a.price) / a.price - (closePrice - b.price) / b.price);
    sorted.reverse(); // highest PnL first
  } else if (strategy === 'MIN_PROFIT') {
    sorted.sort((a, b) => (closePrice - a.price) / a.price - (closePrice - b.price) / b.price);
  }
  return sorted;
}

function matchBuyToSell(
  buyExec: SimExec,
  qtyToClose: number,
  sellExec: SimExec,
  strategy: string,
  trades: ProjectedTrade[],
  refCounter: { n: number },
): void {
  const qty = Math.min(qtyToClose, buyExec.remainingQty);
  const entryAmount = buyExec.price * qty;
  const exitAmount = sellExec.price * qty;
  const pnlNominal = exitAmount - entryAmount;
  const pnlPercent = entryAmount > 0 ? (pnlNominal / entryAmount) * 100 : 0;
  const days = calcDays(buyExec.date, sellExec.date);

  trades.push({
    ref: `trade-${refCounter.n++}`,
    symbol: buyExec.symbol,
    qty,
    entryDate: buyExec.date,
    exitDate: sellExec.date,
    entryPrice: buyExec.price,
    exitPrice: sellExec.price,
    entryAmount,
    exitAmount,
    pnlNominal,
    pnlPercent,
    days,
    tna: (pnlPercent / days) * 365,
    broker: buyExec.broker,
    account: buyExec.account,
    status: 'CLOSED',
    strategy,
    entryExecRef: buyExec.ref,
    exitExecRef: sellExec.ref,
    dbEntryExecId: buyExec.dbId,
    dbExitExecId: sellExec.dbId,
  });
}

// ─── Main Simulation Engine ───────────────────────────────────────────────────

/**
 * Simulates trade matching for a batch of new executions against existing open positions.
 * Pure function — does not touch the database.
 *
 * @param importRows - New executions being imported
 * @param openDbExecs - Currently open executions from DB (remainingQty > 0, !isClosed)
 * @param accounts - Account configs with matchingStrategy
 * @param manualDecisions - User decisions for MANUAL strategy matches
 */
export function simulateTradeMatching(
  importRows: {
    ref: string;
    date: Date;
    side: 'BUY' | 'SELL';
    qty: number;
    symbol: string;
    price: number;
    broker: string;
    account: string;
    currency?: string;
    exchange_rate?: number;
    commissions?: number;
  }[],
  openDbExecs: {
    id: number;
    date: Date;
    symbol: string;
    qty: number;
    price: number;
    broker: string;
    account: string;
    remainingQty: number;
    currency: string;
    exchange_rate: number;
    commissions: number;
  }[],
  accounts: { nombre: string; matchingStrategy: string }[],
  manualDecisions: ManualDecision[] = [],
): SimulationResult {

  const trades: ProjectedTrade[] = [];
  const manualMatchRequired: ManualMatchRequired[] = [];
  const refCounter = { n: 1 };

  // Build mutable SimExec objects for all DB open execs
  const dbSimExecs: SimExec[] = openDbExecs.map(e => ({
    ref: `db-${e.id}`,
    dbId: e.id,
    date: e.date,
    symbol: e.symbol,
    qty: e.qty,
    price: e.price,
    broker: e.broker,
    account: e.account,
    side: 'BUY' as const,
    remainingQty: e.remainingQty,
    isFromDB: true,
    currency: e.currency,
    exchange_rate: e.exchange_rate,
    commissions: e.commissions,
  }));

  // Build mutable SimExec objects for import rows
  const importSimExecs: SimExec[] = importRows.map(r => ({
    ref: r.ref,
    date: r.date,
    symbol: r.symbol,
    qty: r.qty,
    price: r.price,
    broker: r.broker,
    account: r.account,
    side: r.side,
    remainingQty: r.qty,
    isFromDB: false,
    currency: r.currency ?? 'USD',
    exchange_rate: r.exchange_rate ?? 1,
    commissions: r.commissions ?? 0,
  }));

  // Open inventory: matchKey → SimExec[] (BUYs available to close)
  // matchKey: symbol::account::broker
  const openInventory = new Map<string, SimExec[]>();

  const getKey = (e: { symbol: string; account: string; broker: string }) =>
    `${e.symbol}::${e.account}::${e.broker}`;

  // Seed inventory with DB open execs (sorted chronologically)
  for (const dbExec of dbSimExecs) {
    const key = getKey(dbExec);
    if (!openInventory.has(key)) openInventory.set(key, []);
    openInventory.get(key)!.push(dbExec);
  }

  // Process import rows in chronological order
  const sortedImports = [...importSimExecs].sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const exec of sortedImports) {
    const key = getKey(exec);

    if (exec.side === 'BUY') {
      // Add BUY to inventory and create OPEN projected trade
      if (!openInventory.has(key)) openInventory.set(key, []);
      openInventory.get(key)!.push(exec);

      trades.push({
        ref: `trade-${refCounter.n++}`,
        symbol: exec.symbol,
        qty: exec.qty,
        entryDate: exec.date,
        entryPrice: exec.price,
        entryAmount: exec.price * exec.qty,
        pnlNominal: 0,
        pnlPercent: 0,
        days: 0,
        tna: 0,
        broker: exec.broker,
        account: exec.account,
        status: 'OPEN',
        strategy: '-',
        entryExecRef: exec.ref,
      });
    } else {
      // SELL: find matching BUYs
      const accountConfig = accounts.find(a => a.nombre === exec.account);
      const strategy = accountConfig?.matchingStrategy ?? 'FIFO';
      const available = openInventory.get(key) ?? [];

      if (strategy === 'MANUAL') {
        // Check if user provided decisions for this sell
        const decisions = manualDecisions.filter(d => d.sellRef === exec.ref);
        if (decisions.length === 0 && available.length > 0) {
          // Need user input
          manualMatchRequired.push({
            sellRef: exec.ref,
            symbol: exec.symbol,
            date: exec.date,
            qty: exec.remainingQty,
            price: exec.price,
            account: exec.account,
            broker: exec.broker,
            candidates: available.filter(c => c.remainingQty > 0.0001).map(c => ({
              ref: c.ref,
              dbId: c.dbId,
              date: c.date,
              remainingQty: c.remainingQty,
              price: c.price,
              isFromDB: c.isFromDB,
            })),
          });
          continue;
        }

        // Apply manual decisions
        for (const decision of decisions) {
          const buyExec = available.find(c => c.ref === decision.buyRef);
          if (!buyExec || buyExec.remainingQty < 0.0001) continue;
          const qtyToClose = Math.min(decision.qty, buyExec.remainingQty, exec.remainingQty);
          if (qtyToClose <= 0.0001) continue;

          matchBuyToSell(buyExec, qtyToClose, exec, strategy, trades, refCounter);
          buyExec.remainingQty -= qtyToClose;
          exec.remainingQty -= qtyToClose;

          // If BUY fully closed, remove the OPEN projected trade for it
          if (buyExec.remainingQty <= 0.0001) {
            const openTradeIdx = trades.findIndex(t => t.status === 'OPEN' && t.entryExecRef === buyExec.ref);
            if (openTradeIdx >= 0) trades.splice(openTradeIdx, 1);
          } else {
            // Update open trade qty
            const openTrade = trades.find(t => t.status === 'OPEN' && t.entryExecRef === buyExec.ref);
            if (openTrade) {
              openTrade.qty = buyExec.remainingQty;
              openTrade.entryAmount = buyExec.price * buyExec.remainingQty;
            }
          }
        }
      } else {
        // Auto strategy (FIFO, LIFO, MAX_PROFIT, MIN_PROFIT)
        const sorted = sortByStrategy(available.filter(c => c.remainingQty > 0.0001), strategy, exec.price);

        for (const buyExec of sorted) {
          if (exec.remainingQty <= 0.0001) break;
          const qtyToClose = Math.min(exec.remainingQty, buyExec.remainingQty);

          matchBuyToSell(buyExec, qtyToClose, exec, strategy, trades, refCounter);
          buyExec.remainingQty -= qtyToClose;
          exec.remainingQty -= qtyToClose;

          // Update or remove OPEN projected trade for this BUY
          if (buyExec.remainingQty <= 0.0001) {
            const openTradeIdx = trades.findIndex(t => t.status === 'OPEN' && t.entryExecRef === buyExec.ref);
            if (openTradeIdx >= 0) trades.splice(openTradeIdx, 1);
          } else {
            const openTrade = trades.find(t => t.status === 'OPEN' && t.entryExecRef === buyExec.ref);
            if (openTrade) {
              openTrade.qty = buyExec.remainingQty;
              openTrade.entryAmount = buyExec.price * buyExec.remainingQty;
            }
          }
        }
      }
    }
  }

  return { trades, manualMatchRequired };
}

// ─── Exports for server action use ───────────────────────────────────────────

/** Returns all SimExecs after simulation (for persisting decisions to DB). */
export function buildSimExecsSnapshot(
  importRows: { ref: string; date: Date; side: 'BUY' | 'SELL'; qty: number; symbol: string; price: number; broker: string; account: string; currency?: string; exchange_rate?: number; commissions?: number }[],
  openDbExecs: { id: number; date: Date; symbol: string; qty: number; price: number; broker: string; account: string; remainingQty: number; currency: string; exchange_rate: number; commissions: number }[],
  accounts: { nombre: string; matchingStrategy: string }[],
  manualDecisions: ManualDecision[] = [],
) {
  // Re-run simulation to get the final state of all SimExecs
  const dbSimExecs: SimExec[] = openDbExecs.map(e => ({
    ref: `db-${e.id}`,
    dbId: e.id,
    date: e.date,
    symbol: e.symbol,
    qty: e.qty,
    price: e.price,
    broker: e.broker,
    account: e.account,
    side: 'BUY' as const,
    remainingQty: e.remainingQty,
    isFromDB: true,
    currency: e.currency,
    exchange_rate: e.exchange_rate,
    commissions: e.commissions,
  }));
  const importSimExecs: SimExec[] = importRows.map(r => ({
    ref: r.ref,
    date: r.date,
    symbol: r.symbol,
    qty: r.qty,
    price: r.price,
    broker: r.broker,
    account: r.account,
    side: r.side,
    remainingQty: r.qty,
    isFromDB: false,
    currency: r.currency ?? 'USD',
    exchange_rate: r.exchange_rate ?? 1,
    commissions: r.commissions ?? 0,
  }));

  // Re-run simulation (mutates SimExec.remainingQty)
  const allSimExecs = [...dbSimExecs, ...importSimExecs];
  const { trades } = simulateTradeMatching(importRows, openDbExecs, accounts, manualDecisions);

  return { trades, allSimExecs, importSimExecs, dbSimExecs };
}
