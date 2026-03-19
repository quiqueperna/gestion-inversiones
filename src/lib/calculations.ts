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
  const quantity = Math.abs(trade.quantity);
  const entryAmount = quantity * (trade.openPrice || trade.entryPrice || 0);
  
  const currentExitPrice = trade.closePrice || trade.exitPrice || trade.currentPrice || (trade.openPrice || trade.entryPrice || 0);
  const exitAmount = quantity * currentExitPrice;
  
  const returnAmount = exitAmount - entryAmount;
  const returnPercent = entryAmount > 0 ? (returnAmount / entryAmount) * 100 : 0;

  const start = new Date(trade.openDate || trade.entryDate || new Date());
  const end = trade.closeDate || trade.exitDate ? new Date(trade.closeDate || trade.exitDate) : new Date();
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
