"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import path from 'path';
import fs from 'fs';
import { getMemoryState, initializeMemoryState, addCashFlow as addCashFlowMem, removeCashFlow as removeCashFlowMem, getCuentas as getCuentasLib, addCuenta as addCuentaLib, removeCuenta as removeCuentaLib, updateCuenta as updateCuentaLib, Cuenta, getBrokers as getBrokersLib, addBroker as addBrokerLib, updateBroker as updateBrokerLib, removeBroker as removeBrokerLib, Broker } from "@/lib/data-loader";

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
  cuenta?: string;
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

export async function getMemoryCuentas(): Promise<Cuenta[]> {
  ensureLoaded();
  return getCuentasLib();
}

export async function addMemoryCuenta(nombre: string, descripcion?: string): Promise<Cuenta> {
  ensureLoaded();
  return addCuentaLib(nombre, descripcion);
}

export async function removeMemoryCuenta(id: number): Promise<boolean> {
  ensureLoaded();
  return removeCuentaLib(id);
}

export async function updateMemoryCuenta(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  ensureLoaded();
  return updateCuentaLib(id, nombre, descripcion);
}

export async function getMemoryBrokers(): Promise<Broker[]> {
  ensureLoaded();
  return getBrokersLib();
}

export async function addMemoryBroker(nombre: string, descripcion?: string): Promise<Broker> {
  ensureLoaded();
  return addBrokerLib(nombre, descripcion);
}

export async function updateMemoryBroker(id: number, nombre: string, descripcion?: string): Promise<boolean> {
  ensureLoaded();
  return updateBrokerLib(id, nombre, descripcion);
}

export async function removeMemoryBroker(id: number): Promise<boolean> {
  ensureLoaded();
  return removeBrokerLib(id);
}
