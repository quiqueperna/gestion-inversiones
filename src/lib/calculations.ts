/* eslint-disable @typescript-eslint/no-explicit-any */
import { TradeDB } from "@/server/actions/trades";

export interface TradeMetrics {
  entryAmount: number;
  exitAmount: number;
  days: number;
  returnAmount: number;
  returnPercent: number;
  tna: number;
}

export function calculateTradeMetrics(trade: TradeDB | any): TradeMetrics {
  const quantity = Math.abs(trade.quantity);
  const entryAmount = quantity * trade.entryPrice;
  
  const currentExitPrice = trade.exitPrice || trade.currentPrice || trade.entryPrice;
  const exitAmount = quantity * currentExitPrice;
  
  const returnAmount = exitAmount - entryAmount;
  const returnPercent = entryAmount > 0 ? (returnAmount / entryAmount) * 100 : 0;

  const start = new Date(trade.entryDate);
  const end = trade.exitDate ? new Date(trade.exitDate) : new Date();
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const tna = (returnPercent / days) * 365;

  return {
    entryAmount,
    exitAmount,
    days,
    returnAmount,
    returnPercent,
    tna,
  };
}
