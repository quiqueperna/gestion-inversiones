/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TradeMetrics {
  entryAmount: number;
  exitAmount: number;
  days: number;
  returnAmount: number;
  returnPercent: number;
  tna: number;
}

export function calculateTradeMetrics(trade: any): TradeMetrics {
  const quantity = Math.abs(trade.qty ?? trade.quantity ?? 0);
  // Support both new field names (entryPrice) and old (openPrice)
  const entryPriceVal = trade.entryPrice || trade.openPrice || 0;
  const entryAmount = quantity * entryPriceVal;

  // Support both new field names (exitPrice) and old (closePrice)
  const currentExitPrice = trade.exitPrice || trade.closePrice || trade.currentPrice || entryPriceVal;
  const exitAmount = quantity * currentExitPrice;

  const returnAmount = exitAmount - entryAmount;
  const returnPercent = entryAmount > 0 ? (returnAmount / entryAmount) * 100 : 0;

  const start = new Date(trade.entryDate || trade.openDate || new Date());
  const end = (trade.exitDate || trade.closeDate) ? new Date(trade.exitDate || trade.closeDate) : new Date();
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
