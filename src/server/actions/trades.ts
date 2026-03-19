"use server";

import { db } from "@/server/db";
import { TradeInput, tradeSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export interface TradeDB {
  id: number;
  entryDate: Date;
  symbol: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  exitDate: Date | null;
  broker: string;
  isClosed: boolean;
  isFalopa: boolean;
  shouldFollow: boolean;
  isIntra: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getTrades(): Promise<TradeDB[]> {
  const data = await db.trade.findMany({
    orderBy: { entryDate: "desc" },
  });
  return data as TradeDB[];
}

export async function createTrade(data: TradeInput) {
  const validated = tradeSchema.parse(data);
  const trade = await db.trade.create({
    data: {
      ...validated,
      entryDate: new Date(validated.entryDate),
      exitDate: validated.exitDate ? new Date(validated.exitDate) : null,
    },
  });
  revalidatePath("/");
  return trade;
}

export async function updateTrade(id: number, data: TradeInput) {
  const validated = tradeSchema.parse(data);
  const trade = await db.trade.update({
    where: { id },
    data: {
      ...validated,
      entryDate: new Date(validated.entryDate),
      exitDate: validated.exitDate ? new Date(validated.exitDate) : null,
    },
  });
  revalidatePath("/");
  return trade;
}

export async function deleteTrade(id: number) {
  await db.trade.delete({
    where: { id },
  });
  revalidatePath("/");
}
