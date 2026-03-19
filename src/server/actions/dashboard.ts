"use server";

import { getMemoryState } from "@/lib/data-loader";
import { format } from "date-fns";

export async function getYieldsData(year: number = new Date().getFullYear()) {
  const state = getMemoryState();
  const trades = state.trades.filter(t => new Date(t.closeDate).getFullYear() === year);

  const brokers = Array.from(new Set(trades.map((t) => t.broker)));
  const months = Array.from({ length: 12 }, (_, i) => i);

  const gridData = brokers.map((broker) => {
    const monthlyData = months.map((month) => {
      const monthTrades = trades.filter(
        (t) => t.broker === broker && new Date(t.closeDate).getMonth() === month
      );

      const plUsd = monthTrades.reduce((acc, t) => acc + t.returnAmount, 0);
      const entryAmount = monthTrades.reduce((acc, t) => acc + t.openAmount, 0);
      const plPercent = entryAmount > 0 ? (plUsd / entryAmount) * 100 : 0;

      return {
        month: format(new Date(year, month, 1), "MMM"),
        plUsd,
        plPercent,
        count: monthTrades.length,
      };
    });

    return {
      broker,
      monthlyData,
    };
  });

  return gridData;
}
