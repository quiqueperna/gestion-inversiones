# Agente 2 — Lógica y API
**Sesión:** v25 | **Fecha:** 2026-03-24

## Objetivo
Aislar el `memoryState` por usuario y filtrar todas las queries DB por `userId`.

## Archivos a modificar
1. `src/lib/data-loader.ts` — memoryState per-user via Map
2. `src/server/actions/trades.ts` — filtrar queries por userId
3. `src/server/actions/transactions.ts` — filtrar queries por userId
4. `src/server/actions/dashboard.ts` — filtrar queries por userId

## Cambios en data-loader.ts

### Reemplazar el singleton por un Map
```ts
// ANTES:
let memoryState = { executions: [], ... };

// DESPUÉS:
const stateMap = new Map<string, MemState>();

function getOrCreateState(userId: string): MemState {
  if (!stateMap.has(userId)) {
    stateMap.set(userId, { executions: [], tradeUnits: [], cashFlows: [],
      accounts: [], brokers: [], isInitialized: false, isDBBacked: false });
  }
  return stateMap.get(userId)!;
}
```

### Cambiar firmas (con default '_test_' para backward compat tests)
```ts
export function getMemoryState(userId: string = '_test_') { return getOrCreateState(userId); }
export function resetMemoryState(userId: string = '_test_') { stateMap.set(userId, emptyState()); }
export function initializeMemoryState(csvText: string, includeMockData = false, userId = '_test_') { ... }
export function initializeFromDB(data: {...}, userId: string) { ... }
```

### Funciones de mutación: agregar `userId = '_test_'` como último param
Afecta: addCashFlow, removeCashFlow, updateCashFlow, getAccounts, addAccount, removeAccount,
updateAccount, updateAccountStrategy, getBrokers, addBroker, updateBroker, removeBroker,
addTransactionToState/addExecutionToState, getTopStats

## Helper getCurrentUserId
Crear `src/server/actions/get-user.ts`:
```ts
"use server";
import { createClient } from "@/utils/supabase/server";

export async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return user.id;
}
```

## Cambios en ensureDataLoaded() / ensureLoaded() (trades.ts, transactions.ts, dashboard.ts)

```ts
async function ensureDataLoaded() {
  // Test mode: CSV-backed state (no Supabase needed)
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
  initializeFromDB({ executions: dbExecutions, tradeUnits: dbTradeUnits, cashFlows: dbCashFlows,
    accounts: dbAccounts, brokers: dbBrokers }, userId);
  return { state: getMemoryState(userId), userId };
}
```

## Cambios en todos los db.X.create() de server actions
Agregar `userId` en el `data: { ..., userId }` de cada:
- `db.execution.create()`
- `db.tradeUnit.create()`
- `db.cashFlow.create()`
- `db.account.create()`
- `db.broker.create()`

## Cambios en llamadas a funciones de data-loader
Pasar `userId` como último argumento:
- `getAccountsLib(userId)`, `addAccountLib(nombre, desc, userId)`, etc.
- `resetMemoryState(userId)` en lugar de `resetMemoryState()`

## Reglas
- Tests usan key '_test_', nunca llaman getCurrentUserId()
- isDBBacked=false → no escribe a DB, no necesita userId real
- Todas las queries de lectura filtran por { userId }
- Todas las writes incluyen userId en data

## Dependencias
Agente 1 debe haber migrado el schema primero.
