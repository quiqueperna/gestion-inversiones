"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import {
  getMemoryState, initializeFromDB, resetMemoryState,
  removeCashFlow as removeCashFlowMem, updateCashFlow as updateCashFlowMem,
  getAccounts as getAccountsLib, addAccount as addAccountLib, removeAccount as removeAccountLib,
  updateAccount as updateAccountLib, Account,
  getBrokers as getBrokersLib, addBroker as addBrokerLib,
  updateBroker as updateBrokerLib, removeBroker as removeBrokerLib, Broker,
  updateAccountStrategy,
} from "@/lib/data-loader";
import { getCurrentUserId } from "@/server/actions/get-user";

// ─── Shared loader: siempre recarga desde DB ─────────────────────────────────
// Excepción: si el estado fue inicializado desde CSV (tests), no resetea.

async function ensureLoaded(): Promise<{ state: ReturnType<typeof getMemoryState>; userId: string }> {
  // Test mode: estado CSV sin DB (no llama Supabase)
  const testState = getMemoryState('_test_');
  if (testState.isInitialized && !testState.isDBBacked) return { state: testState, userId: '_test_' };

  const userId = await getCurrentUserId();
  resetMemoryState(userId);
  const [dbExecutions, dbTradeUnits, dbCashFlows, dbAccounts, dbBrokers] = await Promise.all([
    db.execution.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
    db.tradeUnit.findMany({ where: { userId }, orderBy: { entryDate: 'asc' } }),
    db.cashFlow.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    db.account.findMany({ where: { userId } }),
    db.broker.findMany({ where: { userId } }),
  ]);

  // Siempre inicializa desde DB aunque esté vacía (nunca fallback a CSV en producción)
  initializeFromDB({
    executions: dbExecutions,
    tradeUnits: dbTradeUnits,
    cashFlows: dbCashFlows,
    accounts: dbAccounts,
    brokers: dbBrokers,
  }, userId);
  return { state: getMemoryState(userId), userId };
}

// ─── CashFlow (Prisma) ────────────────────────────────────────────────────────

export async function getCashFlows(broker?: string) {
  const userId = await getCurrentUserId();
  return await db.cashFlow.findMany({
    where: broker ? { broker, userId } : { userId },
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
  const userId = await getCurrentUserId();
  const transaction = await db.cashFlow.create({
    data: {
      date: data.date,
      amount: data.amount,
      type: data.type,
      broker: data.broker,
      account: data.account ?? null,
      description: data.description,
      userId,
    },
  });

  const state = getMemoryState(userId);
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
  const userId = await getCurrentUserId();
  await db.cashFlow.delete({ where: { id } });
  const state = getMemoryState(userId);
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
  const { state, userId } = await ensureLoaded();
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
        userId,
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
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) await db.cashFlow.delete({ where: { id } });
  return removeCashFlowMem(id, userId);
}

export async function updateMemoryCashFlow(id: number, data: {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  broker: string;
  account?: string;
  description?: string;
}) {
  const { state, userId } = await ensureLoaded();
  const parsedDate = new Date(data.date + 'T12:00:00');
  const amount = Math.abs(data.amount);
  if (state.isDBBacked) {
    await db.cashFlow.update({
      where: { id },
      data: { date: parsedDate, amount, type: data.type, broker: data.broker, account: data.account ?? null, description: data.description },
    });
  }
  return updateCashFlowMem(id, { date: parsedDate, amount, type: data.type, broker: data.broker, account: data.account, description: data.description }, userId);
}

export async function getMemoryCashFlows(broker?: string) {
  const { state } = await ensureLoaded();
  return broker ? state.cashFlows.filter((c) => c.broker === broker) : state.cashFlows;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export async function getMemoryAccounts(): Promise<Account[]> {
  const { userId } = await ensureLoaded();
  return getAccountsLib(userId);
}

export async function addMemoryAccount(nombre: string, descripcion?: string): Promise<Account> {
  const { state, userId } = await ensureLoaded();
  const newAccount = addAccountLib(nombre, descripcion, userId);
  if (state.isDBBacked) {
    const dbRecord = await db.account.create({ data: { nombre, descripcion: descripcion ?? null, matchingStrategy: 'FIFO', userId } });
    // Sync DB id back to memory
    newAccount.id = dbRecord.id;
  }
  return newAccount;
}

export async function removeMemoryAccount(id: number): Promise<boolean> {
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) await db.account.delete({ where: { id } });
  return removeAccountLib(id, userId);
}

export async function updateMemoryAccount(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) {
    await db.account.update({ where: { id }, data: { nombre, descripcion: descripcion ?? null } });
  }
  return updateAccountLib(id, nombre, descripcion, userId);
}

export async function updateAccountMatchingStrategy(id: number, strategy: 'FIFO' | 'LIFO' | 'MAX_PROFIT' | 'MIN_PROFIT' | 'MANUAL'): Promise<boolean> {
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) {
    await db.account.update({ where: { id }, data: { matchingStrategy: strategy } });
  }
  return updateAccountStrategy(id, strategy, userId);
}

// ─── Brokers ──────────────────────────────────────────────────────────────────

export async function getMemoryBrokers(): Promise<Broker[]> {
  const { userId } = await ensureLoaded();
  return getBrokersLib(userId);
}

export async function addMemoryBroker(nombre: string, descripcion?: string): Promise<Broker> {
  const { state, userId } = await ensureLoaded();
  const newBroker = addBrokerLib(nombre, descripcion, userId);
  if (state.isDBBacked) {
    const dbRecord = await db.broker.create({ data: { nombre, descripcion: descripcion ?? null, userId } });
    newBroker.id = dbRecord.id;
  }
  return newBroker;
}

export async function updateMemoryBroker(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) {
    await db.broker.update({ where: { id }, data: { nombre, descripcion: descripcion ?? null } });
  }
  return updateBrokerLib(id, nombre, descripcion, userId);
}

export async function removeMemoryBroker(id: number): Promise<boolean> {
  const { state, userId } = await ensureLoaded();
  if (state.isDBBacked) await db.broker.delete({ where: { id } });
  return removeBrokerLib(id, userId);
}
