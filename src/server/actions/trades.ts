/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import fs from 'fs';
import path from 'path';
import { getMemoryState, initializeMemoryState } from "@/lib/data-loader";
import { getCurrentPriceWithFallback } from "@/lib/prices";

// Helper to ensure data is loaded in the server instance
function ensureDataLoaded() {
    const state = getMemoryState();
    if (!state.isInitialized) {
        const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
        const csvText = fs.readFileSync(csvPath, 'utf-8');
        initializeMemoryState(csvText, true);
    }
    return getMemoryState();
}

export async function getOperations() {
    const state = ensureDataLoaded();
    return state.operations;
}

export async function getTrades() {
    const state = ensureDataLoaded();

    const openTrades = state.trades.filter(t => !t.isClosed);
    if (openTrades.length === 0) return state.trades;

    // Fetch current prices for open trades in parallel (UI-Behavior.md)
    const priceResults = await Promise.all(
        openTrades.map(t => getCurrentPriceWithFallback(t.symbol))
    );
    const today = new Date();

    return state.trades.map(t => {
        if (t.isClosed) return t;
        const idx = openTrades.indexOf(t);
        const currentPrice = priceResults[idx] ?? t.openPrice;
        const closeAmount = currentPrice * t.quantity;
        const days = Math.max(1, Math.ceil((today.getTime() - new Date(t.openDate).getTime()) / (1000 * 60 * 60 * 24)));
        const returnAmount = closeAmount - t.openAmount;
        const returnPercent = t.openAmount > 0 ? (returnAmount / t.openAmount) * 100 : 0;
        const tna = (returnPercent / days) * 365;
        return {
            ...t,
            closePrice: currentPrice,
            closeAmount,
            closeDate: today,
            days,
            returnAmount,
            returnPercent,
            tna,
        };
    });
}

export async function getOpenPositions() {
    const state = ensureDataLoaded();
    const openOps = state.operations.filter(op => op.type === 'BUY' && op.remainingQty > 0.0001);

    // Obtener todos los precios en paralelo
    const pricesResults = await Promise.all(
        openOps.map(op => getCurrentPriceWithFallback(op.symbol))
    );

    return openOps.map((op, idx) => {
        const currentPrice = pricesResults[idx] ?? op.price;
        const marketValue = op.remainingQty * currentPrice;
        const costBasis = op.remainingQty * op.price;
        const unrealizedPL = marketValue - costBasis;

        return {
            id: op.id,
            symbol: op.symbol,
            quantity: op.remainingQty,
            openDate: op.date,
            openPrice: op.price,
            currentPrice,
            marketValue,
            unrealizedPL,
            unrealizedPLPercent: costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0,
            broker: op.broker,
            days: Math.ceil((new Date().getTime() - new Date(op.date).getTime()) / (1000 * 60 * 60 * 24)),
        };
    });
}

export async function createOperation(data: any) {
    const state = ensureDataLoaded();
    const newOp: any = {
        id: state.operations.length + 1,
        date: new Date(data.date),
        symbol: data.symbol,
        quantity: data.quantity,
        price: data.price,
        amount: Math.abs(data.quantity * data.price),
        broker: data.broker,
        type: data.type,
        remainingQty: Math.abs(data.quantity),
        isClosed: false,
        isFalopa: data.isFalopa || false,
        isIntra: data.isIntra || false
    };

    state.operations.push(newOp);
    // Note: In memory, FIFO won't persist across refreshes unless we re-run the whole logic
    // but for the current session it works.
    return newOp;
}

export async function deleteOperation(id: number): Promise<boolean> {
    const state = ensureDataLoaded();
    const exists = state.operations.some(o => o.id === id);
    if (!exists) return false;
    state.operations = state.operations.filter(o => o.id !== id);
    return true;
}

export async function getOpenOperationsForClosing(symbol: string, closingType: 'BUY' | 'SELL') {
  // Para cerrar una SELL, buscamos BUYs abiertas. Para cerrar una BUY, buscamos SELLs.
  const oppositeType = closingType === 'SELL' ? 'BUY' : 'SELL';
  const state = ensureDataLoaded();
  return state.operations.filter(op =>
    op.symbol === symbol.toUpperCase() &&
    op.type === oppositeType &&
    !op.isClosed &&
    op.remainingQty > 0
  ).map(op => ({
    id: op.id,
    date: op.date,
    symbol: op.symbol,
    quantity: op.remainingQty,
    price: op.price,
    amount: op.remainingQty * op.price,
    broker: op.broker,
    type: op.type,
    days: Math.ceil((new Date().getTime() - new Date(op.date).getTime()) / (1000 * 60 * 60 * 24))
  }));
}

export async function closeTradeManually(data: {
  symbol: string;
  closeDate: string;
  closePrice: number;
  quantity: number;
  broker: string;
  openOperationId: number;
}) {
  const state = ensureDataLoaded();

  const openOp = state.operations.find(op => op.id === data.openOperationId);
  if (!openOp) throw new Error('Operación de apertura no encontrada');
  if (openOp.remainingQty < data.quantity) throw new Error('Cantidad insuficiente en la operación de apertura');

  const closeDate = new Date(data.closeDate);
  const openDate = new Date(openOp.date);
  const days = Math.max(1, Math.ceil((closeDate.getTime() - openDate.getTime()) / (1000 * 60 * 60 * 24)));

  const openAmount = openOp.price * data.quantity;
  const closeAmount = data.closePrice * data.quantity;
  const returnAmount = closeAmount - openAmount;
  const returnPercent = openAmount > 0 ? (returnAmount / openAmount) * 100 : 0;
  const tna = (returnPercent / days) * 365;

  // Determine instrument type
  let instrumentType = 'STOCK';
  if (openOp.symbol.includes('BTC') || openOp.symbol.includes('ETH')) instrumentType = 'CRYPTO';
  else if (['GGAL', 'YPF', 'BBAR', 'MELI', 'GLOB', 'PAMP', 'TXAR'].includes(openOp.symbol)) instrumentType = 'CEDEAR';

  // Create closing operation
  const closeOpId = Math.max(...state.operations.map(o => o.id)) + 1;
  const newCloseOp = {
    id: closeOpId,
    date: closeDate,
    symbol: data.symbol.toUpperCase(),
    quantity: -data.quantity,
    price: data.closePrice,
    amount: closeAmount,
    broker: data.broker,
    type: 'SELL' as const,
    remainingQty: 0,
    isClosed: true,
    isFalopa: false,
    isIntra: false,
  };
  state.operations.push(newCloseOp);

  // Update open operation
  openOp.remainingQty -= data.quantity;
  if (openOp.remainingQty <= 0.0001) {
    openOp.isClosed = true;
    openOp.remainingQty = 0;
  }

  // Update existing open trade record if found, otherwise create a new one
  const existingOpenTrade = state.trades.find(t => !t.isClosed && t.openOperationId === data.openOperationId);
  let resultTrade;
  if (existingOpenTrade) {
    Object.assign(existingOpenTrade, {
      closeDate,
      closePrice: data.closePrice,
      closeAmount,
      days,
      returnAmount,
      returnPercent,
      tna,
      isClosed: true,
    });
    resultTrade = existingOpenTrade;
  } else {
    const newTradeId = state.trades.length > 0 ? Math.max(...state.trades.map(t => t.id)) + 1 : 1;
    resultTrade = {
      id: newTradeId,
      symbol: data.symbol.toUpperCase(),
      quantity: data.quantity,
      openDate,
      closeDate,
      openPrice: openOp.price,
      closePrice: data.closePrice,
      openAmount,
      closeAmount,
      days,
      returnAmount,
      returnPercent,
      tna,
      broker: data.broker,
      instrumentType,
      isClosed: true,
      openOperationId: data.openOperationId,
    };
    state.trades.push(resultTrade);
  }

  return resultTrade;
}

export async function deleteTrade(id: number): Promise<boolean> {
    const state = ensureDataLoaded();
    const idx = state.trades.findIndex(t => t.id === id);
    if (idx === -1) return false;
    state.trades.splice(idx, 1);
    return true;
}

export async function updateOperation(id: number, data: Partial<{
  date: Date;
  symbol: string;
  quantity: number;
  price: number;
  broker: string;
  isFalopa: boolean;
  isIntra: boolean;
}>): Promise<boolean> {
  const state = ensureDataLoaded();
  const op = state.operations.find(o => o.id === id);
  if (!op) return false;
  Object.assign(op, {
    ...data,
    amount: (data.quantity !== undefined && data.price !== undefined)
      ? Math.abs(data.quantity * data.price)
      : ((data.quantity !== undefined) ? Math.abs(data.quantity * op.price) :
         (data.price !== undefined) ? Math.abs(op.quantity * data.price) : op.amount),
  });
  return true;
}
