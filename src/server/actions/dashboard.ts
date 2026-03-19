"use server";

import { db } from "@/server/db";
import { startOfYear, endOfYear, format } from "date-fns";

export async function getYieldsData(year: number = new Date().getFullYear()) {
  const trades = await db.trade.findMany({
    where: {
      entryDate: {
        gte: startOfYear(new Date(year, 0, 1)),
        lte: endOfYear(new Date(year, 11, 31)),
      },
    },
  });

  const brokers = Array.from(new Set(trades.map((t) => t.broker)));
  const months = Array.from({ length: 12 }, (_, i) => i);

  const gridData = brokers.map((broker) => {
    const monthlyData = months.map((month) => {
      const monthTrades = trades.filter(
        (t) => t.broker === broker && new Date(t.entryDate).getMonth() === month
      );

      const plUsd = monthTrades.reduce((acc, t) => {
          if (!t.exitPrice) return acc;
          const entry = Math.abs(t.quantity * t.entryPrice);
          const exit = Math.abs(t.quantity * t.exitPrice);
          return acc + (exit - entry);
      }, 0);

      const entryAmount = monthTrades.reduce((acc, t) => acc + Math.abs(t.quantity * t.entryPrice), 0);
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
