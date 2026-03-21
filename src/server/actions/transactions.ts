"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import path from 'path';
import fs from 'fs';
import { getMemoryState, initializeMemoryState, addCashFlow as addCashFlowMem, removeCashFlow as removeCashFlowMem } from "@/lib/data-loader";

export async function getCashFlows(broker?: string) {
  return await db.cashFlow.findMany({
    where: broker ? { broker } : undefined,
    orderBy: { date: 'desc' }
  });
}

export async function createCashFlow(data: {
  date: Date;
  amount: number;
  type: string;
  broker: string;
  description?: string;
}) {
  const transaction = await db.cashFlow.create({
    data: {
      date: data.date,
      amount: data.amount,
      type: data.type,
      broker: data.broker,
      description: data.description
    }
  });
  
  revalidatePath("/");
  return transaction;
}

export async function deleteCashFlow(id: number) {
  await db.cashFlow.delete({ where: { id } });
  revalidatePath("/");
}

function ensureLoaded() {
  const state = getMemoryState();
  if (!state.isInitialized) {
    const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
    const csvText = fs.readFileSync(csvPath, 'utf-8');
    initializeMemoryState(csvText, true);
  }
  return getMemoryState();
}

export async function addMemoryCashFlow(data: {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  broker: string;
  description?: string;
}) {
  ensureLoaded();
  return addCashFlowMem({
    date: new Date(data.date),
    amount: data.amount,
    type: data.type,
    broker: data.broker,
    description: data.description,
  });
}

export async function removeMemoryCashFlow(id: number) {
  return removeCashFlowMem(id);
}

export async function getMemoryCashFlows(broker?: string) {
  const state = ensureLoaded();
  return broker ? state.cashFlows.filter(c => c.broker === broker) : state.cashFlows;
}
