# Misión: Agente de Lógica y API — v17
**Fecha:** 2026-03-23
**Versión:** 17
**Dependencias:** Agente Infra

## Objetivo
Corregir el bug de `isDBBacked=false` y agregar persistencia a Brokers y Cuentas.

## Bug crítico a corregir

`ensureLoaded()` en `transactions.ts` usa `initializeMemoryState` (CSV) → setea `isDBBacked=false`.
Si se llama antes que `ensureDataLoaded()` en trades/dashboard, NINGUNA mutación escribe a la BD.

**Solución:** Reemplazar `ensureLoaded()` síncrona por `ensureLoaded()` async que carga desde DB.

## Tareas

### 1. `src/lib/data-loader.ts` — extender `initializeFromDB()` con brokers y cuentas
Agregar parámetros opcionales:
```typescript
cuentas?: Array<{ id: number; nombre: string; descripcion: string | null; matchingStrategy: string }>;
brokers?: Array<{ id: number; nombre: string; descripcion: string | null }>;
```
Cuando se proveen, usarlos en vez de los hardcoded defaults.

### 2. `src/server/actions/transactions.ts` — fix `ensureLoaded()`
Cambiar a async, cargar desde DB igual que trades.ts/dashboard.ts:
```typescript
async function ensureLoaded() {
  const state = getMemoryState();
  if (!state.isInitialized) {
    const [dbExecutions, dbTradeUnits, dbCashFlows, dbCuentas, dbBrokers] = await Promise.all([
      db.execution.findMany({ orderBy: { date: 'asc' } }),
      db.tradeUnit.findMany({ orderBy: { entryDate: 'asc' } }),
      db.cashFlow.findMany({ orderBy: { date: 'desc' } }),
      db.cuenta.findMany(),
      db.broker.findMany(),
    ]);
    if (dbExecutions.length > 0) {
      initializeFromDB({ executions: dbExecutions, tradeUnits: dbTradeUnits, cashFlows: dbCashFlows, cuentas: dbCuentas, brokers: dbBrokers });
    } else {
      // fallback CSV
      ...
    }
  }
  return getMemoryState();
}
```
Actualizar todas las llamadas a `ensureLoaded()` para agregar `await`.

### 3. Persistencia Cuentas — `transactions.ts`
- `addMemoryCuenta()` → `db.cuenta.create()` + sincronizar memoria
- `removeMemoryCuenta()` → `db.cuenta.delete()` + sincronizar memoria
- `updateMemoryCuenta()` → `db.cuenta.update()` + sincronizar memoria
- `updateCuentaMatchingStrategy()` → `db.cuenta.update({ matchingStrategy })` + sincronizar memoria

### 4. Persistencia Brokers — `transactions.ts`
- `addMemoryBroker()` → `db.broker.create()` + sincronizar memoria
- `removeMemoryBroker()` → `db.broker.delete()` + sincronizar memoria
- `updateMemoryBroker()` → `db.broker.update()` + sincronizar memoria

### 5. Mismo fix en `trades.ts` y `dashboard.ts`
Agregar carga de cuentas y brokers desde DB en sus respectivas `ensureDataLoaded()`.
