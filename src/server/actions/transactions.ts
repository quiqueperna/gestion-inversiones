"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import path from 'path';
import fs from 'fs';
import {
  getMemoryState, initializeMemoryState, initializeFromDB,
  removeCashFlow as removeCashFlowMem, updateCashFlow as updateCashFlowMem,
  getAccounts as getAccountsLib, addAccount as addAccountLib, removeAccount as removeAccountLib,
  updateAccount as updateAccountLib, Account,
  getBrokers as getBrokersLib, addBroker as addBrokerLib,
  updateBroker as updateBrokerLib, removeBroker as removeBrokerLib, Broker,
  updateAccountStrategy,
} from "@/lib/data-loader";

// ─── Shared loader (DB first, CSV fallback) ───────────────────────────────────

async function ensureLoaded() {
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
      initializeFromDB({
        executions: dbExecutions,
        tradeUnits: dbTradeUnits,
        cashFlows: dbCashFlows,
        accounts: dbAccounts,
        brokers: dbBrokers,
      });
    } else {
      const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
      const csvText = fs.readFileSync(csvPath, 'utf-8');
      initializeMemoryState(csvText, true);
    }
  }
  return getMemoryState();
}

// ─── CashFlow (Prisma) ────────────────────────────────────────────────────────

export async function getCashFlows(broker?: string) {
  return await db.cashFlow.findMany({
    where: broker ? { broker } : undefined,
    orderBy: { date: 'desc' },
  });
}

export async function createCashFlow(data: {
  date: Date;
  amount: number;
  type: string;
  broker: string;
  account?: string;
  description?: string;
}) {
  const transaction = await db.cashFlow.create({
    data: {
      date: data.date,
      amount: data.amount,
      type: data.type,
      broker: data.broker,
      account: data.account ?? null,
      description: data.description,
    },
  });

  const state = getMemoryState();
  if (state.isInitialized) {
    state.cashFlows.push({
      id: transaction.id,
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type as 'DEPOSIT' | 'WITHDRAWAL',
      broker: transaction.broker,
      account: transaction.account ?? undefined,
      description: transaction.description ?? undefined,
    });
  }

  revalidatePath("/");
  return transaction;
}

export async function deleteCashFlow(id: number) {
  await db.cashFlow.delete({ where: { id } });
  const state = getMemoryState();
  if (state.isInitialized) {
    const idx = state.cashFlows.findIndex((c) => c.id === id);
    if (idx !== -1) state.cashFlows.splice(idx, 1);
  }
  revalidatePath("/");
}

// ─── CashFlow (Memory + DB) ───────────────────────────────────────────────────

export async function addMemoryCashFlow(data: {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  broker: string;
  account?: string;
  description?: string;
}) {
  const state = await ensureLoaded();
  const parsedDate = new Date(data.date + 'T12:00:00');

  if (state.isDBBacked) {
    const dbRecord = await db.cashFlow.create({
      data: {
        date: parsedDate,
        amount: data.amount,
        type: data.type,
        broker: data.broker,
        account: data.account ?? null,
        description: data.description,
      },
    });
    const newCf = {
      id: dbRecord.id,
      date: parsedDate,
      amount: data.amount,
      type: data.type,
      broker: data.broker,
      account: data.account,
      description: data.description,
    };
    state.cashFlows.push(newCf);
    return newCf;
  }

  // CSV mode fallback
  const maxId = state.cashFlows.length > 0 ? Math.max(...state.cashFlows.map((c) => c.id)) : 0;
  const newCf = { id: maxId + 1, date: parsedDate, amount: data.amount, type: data.type, broker: data.broker, account: data.account, description: data.description };
  state.cashFlows.push(newCf);
  return newCf;
}

export async function removeMemoryCashFlow(id: number) {
  const state = await ensureLoaded();
  if (state.isDBBacked) await db.cashFlow.delete({ where: { id } });
  return removeCashFlowMem(id);
}

export async function updateMemoryCashFlow(id: number, data: {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  broker: string;
  account?: string;
  description?: string;
}) {
  const state = await ensureLoaded();
  const parsedDate = new Date(data.date + 'T12:00:00');
  const amount = Math.abs(data.amount);
  if (state.isDBBacked) {
    await db.cashFlow.update({
      where: { id },
      data: { date: parsedDate, amount, type: data.type, broker: data.broker, account: data.account ?? null, description: data.description },
    });
  }
  return updateCashFlowMem(id, { date: parsedDate, amount, type: data.type, broker: data.broker, account: data.account, description: data.description });
}

export async function getMemoryCashFlows(broker?: string) {
  const state = await ensureLoaded();
  return broker ? state.cashFlows.filter((c) => c.broker === broker) : state.cashFlows;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getMemoryAccounts(): Promise<Account[]> {
  await ensureLoaded();
  return getAccountsLib();
}

export async function addMemoryAccount(nombre: string, descripcion?: string): Promise<Account> {
  const state = await ensureLoaded();
  const newAccount = addAccountLib(nombre, descripcion);
  if (state.isDBBacked) {
    const dbRecord = await db.account.create({ data: { nombre, descripcion: descripcion ?? null, matchingStrategy: 'FIFO' } });
    // Sync DB id back to memory
    newAccount.id = dbRecord.id;
  }
  return newAccount;
}

export async function removeMemoryAccount(id: number): Promise<boolean> {
  const state = await ensureLoaded();
  if (state.isDBBacked) await db.account.delete({ where: { id } });
  return removeAccountLib(id);
}

export async function updateMemoryAccount(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  const state = await ensureLoaded();
  if (state.isDBBacked) {
    await db.account.update({ where: { id }, data: { nombre, descripcion: descripcion ?? null } });
  }
  return updateAccountLib(id, nombre, descripcion);
}

export async function updateAccountMatchingStrategy(id: number, strategy: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL'): Promise<boolean> {
  const state = await ensureLoaded();
  if (state.isDBBacked) {
    await db.account.update({ where: { id }, data: { matchingStrategy: strategy } });
  }
  return updateAccountStrategy(id, strategy);
}

// ─── Brokers ──────────────────────────────────────────────────────────────────

export async function getMemoryBrokers(): Promise<Broker[]> {
  await ensureLoaded();
  return getBrokersLib();
}

export async function addMemoryBroker(nombre: string, descripcion?: string): Promise<Broker> {
  const state = await ensureLoaded();
  const newBroker = addBrokerLib(nombre, descripcion);
  if (state.isDBBacked) {
    const dbRecord = await db.broker.create({ data: { nombre, descripcion: descripcion ?? null } });
    newBroker.id = dbRecord.id;
  }
  return newBroker;
}

export async function updateMemoryBroker(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  const state = await ensureLoaded();
  if (state.isDBBacked) {
    await db.broker.update({ where: { id }, data: { nombre, descripcion: descripcion ?? null } });
  }
  return updateBrokerLib(id, nombre, descripcion);
}

export async function removeMemoryBroker(id: number): Promise<boolean> {
  const state = await ensureLoaded();
  if (state.isDBBacked) await db.broker.delete({ where: { id } });
  return removeBrokerLib(id);
}
