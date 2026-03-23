/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from 'fs';
import path from 'path';
import { getMemoryState, initializeMemoryState, initializeFromDB, TradeUnit, Execution, updateAccountStrategy } from "@/lib/data-loader";
import { getCurrentPriceWithFallback } from "@/lib/prices";
import { db } from "@/server/db";

// Helper to ensure data is loaded in the server instance
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

export async function getExecutions() {
    const state = await ensureDataLoaded();
    return state.executions;
}

export async function getTradeUnits() {
    const state = await ensureDataLoaded();

    const openTUs = state.tradeUnits.filter(t => t.status === 'OPEN');
    if (openTUs.length === 0) return state.tradeUnits;

    // Fetch current prices for open trade units in parallel
    const priceResults = await Promise.all(
        openTUs.map(t => getCurrentPriceWithFallback(t.symbol))
    );
    const today = new Date();

    return state.tradeUnits.map(t => {
        if (t.status === 'CLOSED') return t;
        const idx = openTUs.indexOf(t);
        const currentPrice = priceResults[idx] ?? t.entryPrice;
        const exitAmount = currentPrice * t.qty;
        const days = Math.max(1, Math.ceil((today.getTime() - new Date(t.entryDate).getTime()) / (1000 * 60 * 60 * 24)));
        const pnlNominal = exitAmount - t.entryAmount;
        const pnlPercent = t.entryAmount > 0 ? (pnlNominal / t.entryAmount) * 100 : 0;
        const tna = (pnlPercent / days) * 365;
        return {
            ...t,
            exitPrice: currentPrice,
            exitAmount,
            exitDate: today,
            days,
            pnlNominal,
            pnlPercent,
            tna,
        };
    });
}

export async function createExecution(data: any) {
    const state = await ensureDataLoaded();
    const maxId = state.executions.length > 0 ? Math.max(...state.executions.map(e => e.id)) : 0;
    const newExec: Execution = {
        id: maxId + 1,
        date: new Date(data.date + 'T12:00:00'),
        symbol: data.symbol,
        qty: data.qty ?? data.quantity,
        price: data.price,
        amount: Math.abs((data.qty ?? data.quantity) * data.price),
        broker: data.broker,
        account: data.account || data.cuenta || 'USA',
        side: data.side || data.type,
        remainingQty: Math.abs(data.qty ?? data.quantity),
        isClosed: false,
        currency: data.currency || 'USD',
        commissions: data.commissions || 0,
        exchange_rate: data.exchange_rate ?? 1,
    };

    state.executions.push(newExec);

    // Persist to DB only when state was loaded from DB (not from CSV/tests)
    if (state.isDBBacked) await db.execution.create({
        data: {
            id: newExec.id,
            date: newExec.date,
            symbol: newExec.symbol,
            qty: newExec.qty,
            price: newExec.price,
            amount: newExec.amount,
            broker: newExec.broker,
            account: newExec.account,
            side: newExec.side,
            isClosed: newExec.isClosed,
            remainingQty: newExec.remainingQty,
            currency: newExec.currency,
            commissions: newExec.commissions,
            exchange_rate: newExec.exchange_rate,
        },
    });

    return newExec;
}

export async function deleteExecution(id: number): Promise<boolean> {
    const state = await ensureDataLoaded();
    const exists = state.executions.some(o => o.id === id);
    if (!exists) return false;
    state.executions = state.executions.filter(o => o.id !== id);
    // Persist to DB only when state was loaded from DB
    if (state.isDBBacked) await db.execution.delete({ where: { id } });
    return true;
}

export async function getOpenExecutionsForClosing(symbol: string, side: 'BUY' | 'SELL', account: string, broker: string) {
  // Para cerrar una SELL, buscamos BUYs abiertas. Para cerrar una BUY, buscamos SELLs.
  const oppositeSide = side === 'SELL' ? 'BUY' : 'SELL';
  const state = await ensureDataLoaded();
  return state.executions.filter(exec =>
    exec.symbol === symbol.toUpperCase() &&
    exec.side === oppositeSide &&
    exec.account === account &&
    exec.broker === broker &&
    !exec.isClosed &&
    exec.remainingQty > 0
  ).map(exec => ({
    id: exec.id,
    date: exec.date,
    symbol: exec.symbol,
    qty: exec.remainingQty,
    price: exec.price,
    amount: exec.remainingQty * exec.price,
    broker: exec.broker,
    account: exec.account,
    side: exec.side,
    days: Math.ceil((new Date().getTime() - new Date(exec.date).getTime()) / (1000 * 60 * 60 * 24))
  }));
}

export async function closeTradeUnitManually(data: {
  symbol: string;
  closeDate: string;
  closePrice: number;
  quantity: number;
  broker: string;
  account: string;
  entryExecId: number;
}) {
  const state = await ensureDataLoaded();

  const openExec = state.executions.find(exec => exec.id === data.entryExecId);
  if (!openExec) throw new Error('Ejecución de apertura no encontrada');
  // Validate account isolation
  if (openExec.account !== data.account) throw new Error('Aislamiento de cuenta: la ejecución no pertenece a esta cuenta');
  if (openExec.remainingQty < data.quantity) throw new Error('Cantidad insuficiente en la ejecución de apertura');

  const _now = new Date();
  const [_y, _m, _d] = data.closeDate.split('-').map(Number);
  const closeDate = new Date(_y, _m - 1, _d, _now.getHours(), _now.getMinutes(), _now.getSeconds());
  const entryDate = new Date(openExec.date);
  const days = Math.max(1, Math.ceil((closeDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));

  const entryAmount = openExec.price * data.quantity;
  const exitAmount = data.closePrice * data.quantity;
  const pnlNominal = exitAmount - entryAmount;
  const pnlPercent = entryAmount > 0 ? (pnlNominal / entryAmount) * 100 : 0;
  const tna = (pnlPercent / days) * 365;

  // Create closing execution
  const closeExecId = Math.max(...state.executions.map(o => o.id)) + 1;
  const newCloseExec: Execution = {
    id: closeExecId,
    date: closeDate,
    symbol: data.symbol.toUpperCase(),
    qty: data.quantity,
    price: data.closePrice,
    amount: exitAmount,
    broker: data.broker,
    account: openExec.account || 'USA',
    side: 'SELL',
    remainingQty: 0,
    isClosed: true,
    currency: openExec.currency || 'USD',
    commissions: 0,
    exchange_rate: openExec.exchange_rate || 1,
  };
  state.executions.push(newCloseExec);

  // Update open execution
  openExec.remainingQty -= data.quantity;
  if (openExec.remainingQty <= 0.0001) {
    openExec.isClosed = true;
    openExec.remainingQty = 0;
  }

  // Update existing open trade unit record if found, otherwise create a new one
  const existingOpenTU = state.tradeUnits.find(t => t.status === 'OPEN' && t.entryExecId === data.entryExecId);
  let resultTU: TradeUnit;
  if (existingOpenTU) {
    Object.assign(existingOpenTU, {
      exitDate: closeDate,
      exitPrice: data.closePrice,
      exitAmount,
      days,
      pnlNominal,
      pnlPercent,
      tna,
      status: 'CLOSED' as const,
      exitExecId: closeExecId,
    });
    resultTU = existingOpenTU;
  } else {
    const newTUId = state.tradeUnits.length > 0 ? Math.max(...state.tradeUnits.map(t => t.id)) + 1 : 1;
    resultTU = {
      id: newTUId,
      symbol: data.symbol.toUpperCase(),
      qty: data.quantity,
      entryDate,
      exitDate: closeDate,
      entryPrice: openExec.price,
      exitPrice: data.closePrice,
      entryAmount,
      exitAmount,
      days,
      pnlNominal,
      pnlPercent,
      tna,
      broker: data.broker,
      account: openExec.account || 'USA',
      status: 'CLOSED',
      entryExecId: data.entryExecId,
      exitExecId: closeExecId,
      side: 'BUY',
    };
    state.tradeUnits.push(resultTU);
  }

  // Persist to DB only when state was loaded from DB
  if (state.isDBBacked) await db.$transaction([
    db.execution.create({
      data: {
        id: newCloseExec.id, date: newCloseExec.date, symbol: newCloseExec.symbol,
        qty: newCloseExec.qty, price: newCloseExec.price, amount: newCloseExec.amount,
        broker: newCloseExec.broker, account: newCloseExec.account, side: newCloseExec.side,
        isClosed: newCloseExec.isClosed, remainingQty: newCloseExec.remainingQty,
        currency: newCloseExec.currency, commissions: newCloseExec.commissions,
        exchange_rate: newCloseExec.exchange_rate,
      },
    }),
    db.execution.update({
      where: { id: openExec.id },
      data: { remainingQty: openExec.remainingQty, isClosed: openExec.isClosed },
    }),
    ...(existingOpenTU
      ? [db.tradeUnit.update({
          where: { id: resultTU.id },
          data: {
            exitDate: resultTU.exitDate, exitPrice: resultTU.exitPrice,
            exitAmount: resultTU.exitAmount, days: resultTU.days,
            pnlNominal: resultTU.pnlNominal, pnlPercent: resultTU.pnlPercent,
            tna: resultTU.tna, status: resultTU.status,
            exitExecId: resultTU.exitExecId ?? null,
          },
        })]
      : [db.tradeUnit.create({
          data: {
            symbol: resultTU.symbol, qty: resultTU.qty, entryDate: resultTU.entryDate,
            exitDate: resultTU.exitDate, entryPrice: resultTU.entryPrice,
            exitPrice: resultTU.exitPrice, entryAmount: resultTU.entryAmount,
            exitAmount: resultTU.exitAmount, days: resultTU.days,
            pnlNominal: resultTU.pnlNominal, pnlPercent: resultTU.pnlPercent,
            tna: resultTU.tna, broker: resultTU.broker, account: resultTU.account,
            status: resultTU.status, side: resultTU.side,
            entryExecId: resultTU.entryExecId ?? null,
            exitExecId: resultTU.exitExecId ?? null,
          },
        })]),
  ]);

  return resultTU;
}

export async function closeTradeUnitWithQuantity(data: {
  symbol: string;
  closeDate: string;
  closePrice: number;
  totalQty: number;
  broker: string;
  account: string;
  primaryEntryExecId: number;
  strategy?: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL';
}) {
  const state = await ensureDataLoaded();
  // Use actual current time for the close — preserves the user-entered date but stamps real HH:MM
  const now = new Date();
  const [y, m, d] = data.closeDate.split('-').map(Number);
  const closeDate = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
  let remainingToClose = data.totalQty;

  // Get all open BUY execs for this symbol+account+broker
  const allOpenExecs = state.executions
    .filter(exec =>
      exec.symbol === data.symbol.toUpperCase() &&
      exec.side === 'BUY' &&
      exec.account === data.account &&
      exec.broker === data.broker &&
      !exec.isClosed &&
      exec.remainingQty > 0.0001
    );

  // Si no se pasa strategy, usar la configurada en la cuenta
  let resolvedStrategy = data.strategy;
  if (!resolvedStrategy) {
    const state2 = getMemoryState();
    const accountConfig = state2.accounts.find(c => c.nombre === data.account);
    resolvedStrategy = accountConfig?.matchingStrategy ?? 'FIFO';
  }
  const strategy = resolvedStrategy;

  if (strategy === 'FIFO') {
    allOpenExecs.sort((a, b) => a.date.getTime() - b.date.getTime());
  } else if (strategy === 'LIFO') {
    allOpenExecs.sort((a, b) => b.date.getTime() - a.date.getTime());
  } else if (strategy === 'MAX_PROFIT') {
    allOpenExecs.sort((a, b) => {
      const pnlA = (data.closePrice - a.price) / a.price;
      const pnlB = (data.closePrice - b.price) / b.price;
      return pnlB - pnlA;
    });
  } else if (strategy === 'MIN_PROFIT') {
    allOpenExecs.sort((a, b) => {
      const pnlA = (data.closePrice - a.price) / a.price;
      const pnlB = (data.closePrice - b.price) / b.price;
      return pnlA - pnlB;
    });
  }
  // MANUAL: primaryEntryExecId ya se pone primero en el bloque que sigue

  const primaryIdx = allOpenExecs.findIndex(exec => exec.id === data.primaryEntryExecId);
  if (primaryIdx > 0) {
    const [primary] = allOpenExecs.splice(primaryIdx, 1);
    allOpenExecs.unshift(primary);
  }

  // Collect DB operations to run at the end
  const dbOps: Promise<unknown>[] = [];

  for (const openExec of allOpenExecs) {
    if (remainingToClose <= 0.0001) break;

    const qtyToClose = Math.min(remainingToClose, openExec.remainingQty);
    const qtyRemainder = openExec.remainingQty - qtyToClose;

    const entryDate = new Date(openExec.date);
    const days = Math.max(1, Math.ceil((closeDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)));
    const entryAmount = openExec.price * qtyToClose;
    const exitAmount = data.closePrice * qtyToClose;
    const pnlNominal = exitAmount - entryAmount;
    const pnlPercent = entryAmount > 0 ? (pnlNominal / entryAmount) * 100 : 0;
    const tna = (pnlPercent / days) * 365;

    if (qtyRemainder > 0.0001) {
      // Partial close: create new open exec with remainder
      const newExecId = Math.max(...state.executions.map(o => o.id)) + 1;
      const newOpenExec: Execution = {
        ...openExec,
        id: newExecId,
        remainingQty: qtyRemainder,
        isClosed: false,
        exchange_rate: openExec.exchange_rate || 1,
      };
      state.executions.push(newOpenExec);
      dbOps.push(db.execution.create({
        data: {
          id: newOpenExec.id, date: newOpenExec.date, symbol: newOpenExec.symbol,
          qty: newOpenExec.qty, price: newOpenExec.price, amount: newOpenExec.amount,
          broker: newOpenExec.broker, account: newOpenExec.account, side: newOpenExec.side,
          isClosed: newOpenExec.isClosed, remainingQty: newOpenExec.remainingQty,
          currency: newOpenExec.currency, commissions: newOpenExec.commissions,
          exchange_rate: newOpenExec.exchange_rate,
        },
      }));

      // Redirect existing open trade unit to new exec
      const existingOpenTUPartial = state.tradeUnits.find(t => t.status === 'OPEN' && t.entryExecId === openExec.id);
      if (existingOpenTUPartial) {
        existingOpenTUPartial.entryExecId = newExecId;
        existingOpenTUPartial.qty = qtyRemainder;
        existingOpenTUPartial.entryAmount = openExec.price * qtyRemainder;
        dbOps.push(db.tradeUnit.update({
          where: { id: existingOpenTUPartial.id },
          data: { entryExecId: newExecId, qty: qtyRemainder, entryAmount: openExec.price * qtyRemainder },
        }));
      }
    }

    // Mark original exec as fully closed
    openExec.remainingQty = 0;
    openExec.isClosed = true;
    dbOps.push(db.execution.update({
      where: { id: openExec.id },
      data: { remainingQty: 0, isClosed: true },
    }));

    // Create closing SELL execution record first (so we have its id for exitExecId)
    const closeExecId = Math.max(...state.executions.map(o => o.id)) + 1;
    const closeExec: Execution = {
      id: closeExecId, date: closeDate, symbol: openExec.symbol,
      qty: qtyToClose, price: data.closePrice,
      amount: data.closePrice * qtyToClose, broker: data.broker,
      account: openExec.account || 'USA', side: 'SELL',
      remainingQty: 0, isClosed: true,
      currency: openExec.currency || 'USD', commissions: 0,
      exchange_rate: openExec.exchange_rate || 1,
    };
    state.executions.push(closeExec);
    dbOps.push(db.execution.create({
      data: {
        id: closeExec.id, date: closeExec.date, symbol: closeExec.symbol,
        qty: closeExec.qty, price: closeExec.price, amount: closeExec.amount,
        broker: closeExec.broker, account: closeExec.account, side: closeExec.side,
        isClosed: closeExec.isClosed, remainingQty: closeExec.remainingQty,
        currency: closeExec.currency, commissions: closeExec.commissions,
        exchange_rate: closeExec.exchange_rate,
      },
    }));

    // Update or create closed trade unit record
    const existingOpenTU = state.tradeUnits.find(t => t.status === 'OPEN' && t.entryExecId === openExec.id);
    if (existingOpenTU && qtyRemainder <= 0.0001) {
      Object.assign(existingOpenTU, {
        exitDate: closeDate, exitPrice: data.closePrice,
        exitAmount, qty: qtyToClose, entryAmount, days,
        pnlNominal, pnlPercent, tna, status: 'CLOSED' as const,
        exitExecId: closeExecId,
      });
      dbOps.push(db.tradeUnit.update({
        where: { id: existingOpenTU.id },
        data: {
          exitDate: closeDate, exitPrice: data.closePrice, exitAmount,
          qty: qtyToClose, entryAmount, days, pnlNominal, pnlPercent, tna,
          status: 'CLOSED', exitExecId: closeExecId,
        },
      }));
    } else {
      const newTUId = state.tradeUnits.length > 0 ? Math.max(...state.tradeUnits.map(t => t.id)) + 1 : 1;
      const newTU: TradeUnit = {
        id: newTUId, symbol: openExec.symbol, qty: qtyToClose,
        entryDate, exitDate: closeDate, entryPrice: openExec.price, exitPrice: data.closePrice,
        entryAmount, exitAmount, days, pnlNominal, pnlPercent, tna,
        broker: data.broker, account: openExec.account || 'USA',
        status: 'CLOSED', entryExecId: openExec.id, exitExecId: closeExecId, side: 'BUY',
      };
      state.tradeUnits.push(newTU);
      dbOps.push(db.tradeUnit.create({
        data: {
          symbol: newTU.symbol, qty: newTU.qty, entryDate: newTU.entryDate,
          exitDate: newTU.exitDate, entryPrice: newTU.entryPrice, exitPrice: newTU.exitPrice,
          entryAmount: newTU.entryAmount, exitAmount: newTU.exitAmount,
          days: newTU.days, pnlNominal: newTU.pnlNominal, pnlPercent: newTU.pnlPercent,
          tna: newTU.tna, broker: newTU.broker, account: newTU.account,
          status: newTU.status, side: newTU.side,
          entryExecId: newTU.entryExecId ?? null, exitExecId: newTU.exitExecId ?? null,
        },
      }));
    }

    remainingToClose -= qtyToClose;
  }

  // Excess qty not covered by open execs → create an open SELL execution
  if (remainingToClose > 0.0001) {
    const newExecId = Math.max(...state.executions.map(o => o.id)) + 1;
    const excessExec: Execution = {
      id: newExecId, date: closeDate, symbol: data.symbol.toUpperCase(),
      qty: remainingToClose, price: data.closePrice,
      amount: data.closePrice * remainingToClose, broker: data.broker,
      account: data.account || 'USA', side: 'SELL', remainingQty: remainingToClose,
      isClosed: false,
      currency: 'USD', commissions: 0,
      exchange_rate: 1,
    };
    state.executions.push(excessExec);
    dbOps.push(db.execution.create({
      data: {
        id: excessExec.id, date: excessExec.date, symbol: excessExec.symbol,
        qty: excessExec.qty, price: excessExec.price, amount: excessExec.amount,
        broker: excessExec.broker, account: excessExec.account, side: excessExec.side,
        isClosed: excessExec.isClosed, remainingQty: excessExec.remainingQty,
        currency: excessExec.currency, commissions: excessExec.commissions,
        exchange_rate: excessExec.exchange_rate,
      },
    }));
  }

  // Persist all DB operations (only when state was loaded from DB)
  if (state.isDBBacked && dbOps.length > 0) {
    await Promise.all(dbOps);
  }

  return { success: true };
}

export async function deleteTradeUnit(id: number): Promise<boolean> {
    const state = await ensureDataLoaded();
    const idx = state.tradeUnits.findIndex(t => t.id === id);
    if (idx === -1) return false;
    state.tradeUnits.splice(idx, 1);
    if (state.isDBBacked) await db.tradeUnit.delete({ where: { id } });
    return true;
}

export async function updateExecution(id: number, data: Partial<{
  date: Date;
  symbol: string;
  qty: number;
  price: number;
  broker: string;
  account: string;
  currency: string;
  commissions: number;
}>): Promise<boolean> {
  const state = await ensureDataLoaded();
  const exec = state.executions.find(o => o.id === id);
  if (!exec) return false;
  const newAmount = (data.qty !== undefined && data.price !== undefined)
    ? Math.abs(data.qty * data.price)
    : ((data.qty !== undefined) ? Math.abs(data.qty * exec.price) :
       (data.price !== undefined) ? Math.abs(exec.qty * data.price) : exec.amount);
  Object.assign(exec, { ...data, amount: newAmount });
  // Persist to DB only when state was loaded from DB
  if (state.isDBBacked) {
    await db.execution.update({
      where: { id },
      data: { ...data, amount: newAmount },
    });
  }
  return true;
}

export { updateAccountStrategy };

// Cambio 3: Transaction aliases (primary new names)
export const getTransactions = getExecutions;
export const createTransaction = createExecution;
export const deleteTransaction = deleteExecution;
export const updateTransaction = updateExecution;
export const getOpenTransactionsForClosing = getOpenExecutionsForClosing;

// Legacy aliases for backward compatibility
export const getOperations = getExecutions;
export const getTrades = getTradeUnits;
export const createOperation = createExecution;
export const deleteOperation = deleteExecution;
export const deleteTrade = deleteTradeUnit;
export const closeTradeManually = closeTradeUnitManually;
export const closeTradeWithQuantity = closeTradeUnitWithQuantity;
export const updateOperation = updateExecution;

export async function getOpenOperationsForClosing(symbol: string, side: 'BUY' | 'SELL', account?: string, broker?: string) {
  return getOpenExecutionsForClosing(symbol, side, account || 'USA', broker || 'AMR');
}
