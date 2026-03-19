"use server";

import { OperationInput } from "@/lib/validations";
import { getMemoryState } from "@/lib/data-loader";

// Emulating DB actions with Memory State for Demo Mode as per core.md
// This avoids Prisma Client generation issues in this environment.

export async function getOperations() {
  return getMemoryState().operations;
}

export async function createOperation(data: OperationInput) {
  const state = getMemoryState();
  const amount = data.quantity * data.price;
  const newOp = {
      ...data,
      id: state.operations.length + 1,
      amount,
      date: data.date
  };
  state.operations.push(newOp);
  return newOp;
}

export async function getOpenOperations(symbol?: string) {
    const state = getMemoryState();
    return state.operations.filter(o => !o.isClosed && (!symbol || o.symbol === symbol));
}

export async function getTrades() {
    return getMemoryState().trades;
}

export async function deleteOperation(id: number) {
    const state = getMemoryState();
    state.operations = state.operations.filter(o => o.id !== id);
}
