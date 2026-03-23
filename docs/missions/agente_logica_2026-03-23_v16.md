# Misión: Agente de Lógica y API — v16
**Fecha:** 2026-03-23
**Versión:** 16
**Dependencias:** Agente Infra (schema migrado + seed ejecutado)

## Objetivo
Activar persistencia real en Supabase/Prisma para todas las entidades (Execution, TradeUnit, CashFlow).
El sistema debe cargar datos desde la BD al arrancar, y persistir todas las mutaciones.

## Estrategia: DB como fuente de verdad + Memoria como cache de runtime

- **Al iniciar la app:** `ensureDataLoaded()` carga desde Prisma → `initializeFromDB()`
- **Lecturas:** desde memoryState (rápido, sin round-trip DB en cada read)
- **Escrituras:** persist a DB **y** actualiza memoryState

## Archivos a modificar

### 1. `src/lib/data-loader.ts`

Agregar función `initializeFromDB()`:

```typescript
export function initializeFromDB(data: {
  executions: Array<{id: number; date: Date; symbol: string; qty: number; price: number; amount: number; broker: string; account: string; side: string; isClosed: boolean; remainingQty: number; currency: string; commissions: number; exchange_rate: number}>;
  tradeUnits: Array<{id: number; symbol: string; qty: number; entryDate: Date; exitDate: Date|null; entryPrice: number; exitPrice: number|null; entryAmount: number; exitAmount: number|null; days: number; pnlNominal: number; pnlPercent: number; tna: number; broker: string; account: string; status: string; side: string; entryExecId: number|null; exitExecId: number|null; instrumentType: string}>;
  cashFlows: Array<{id: number; date: Date; amount: number; type: string; broker: string; cuenta: string|null; description: string|null}>;
}) {
  if (memoryState.isInitialized) return;

  const executions: Execution[] = data.executions.map(e => ({
    id: e.id, date: e.date, symbol: e.symbol, qty: e.qty, price: e.price,
    amount: e.amount, broker: e.broker, account: e.account,
    side: e.side as 'BUY' | 'SELL', isClosed: e.isClosed, remainingQty: e.remainingQty,
    currency: e.currency, commissions: e.commissions, exchange_rate: e.exchange_rate,
  }));

  const tradeUnits: TradeUnit[] = data.tradeUnits.map(t => ({
    id: t.id, symbol: t.symbol, qty: t.qty, entryDate: t.entryDate,
    exitDate: t.exitDate ?? undefined, entryPrice: t.entryPrice,
    exitPrice: t.exitPrice ?? undefined, entryAmount: t.entryAmount,
    exitAmount: t.exitAmount ?? undefined, days: t.days, pnlNominal: t.pnlNominal,
    pnlPercent: t.pnlPercent, tna: t.tna, broker: t.broker, account: t.account,
    status: t.status as 'OPEN' | 'CLOSED', side: t.side as 'BUY' | 'SELL',
    entryExecId: t.entryExecId ?? undefined, exitExecId: t.exitExecId ?? undefined,
  }));

  const cashFlows: CashFlow[] = data.cashFlows.map(c => ({
    id: c.id, date: c.date, amount: c.amount, type: c.type as 'DEPOSIT' | 'WITHDRAWAL',
    broker: c.broker, cuenta: c.cuenta ?? undefined, description: c.description ?? undefined,
  }));

  memoryState = {
    executions,
    tradeUnits,
    cashFlows,
    cuentas: [
      { id: 1, nombre: 'USA', descripcion: 'Cuenta internacional', matchingStrategy: 'FIFO' as const },
      { id: 2, nombre: 'Argentina', descripcion: 'Cuenta local', matchingStrategy: 'FIFO' as const },
      { id: 3, nombre: 'CRYPTO', descripcion: 'Criptomonedas', matchingStrategy: 'FIFO' as const },
    ],
    brokers: [
      { id: 1, nombre: 'Schwab', descripcion: 'Schwab USA' },
      { id: 2, nombre: 'Binance', descripcion: 'Exchange de criptomonedas' },
      { id: 3, nombre: 'Cocos', descripcion: 'Broker argentino' },
      { id: 4, nombre: 'Balanz', descripcion: 'Broker argentino' },
      { id: 5, nombre: 'AMR', descripcion: 'Broker' },
      { id: 6, nombre: 'IOL', descripcion: 'InvertirOnLine' },
      { id: 7, nombre: 'IBKR', descripcion: 'Interactive Brokers' },
      { id: 8, nombre: 'PP', descripcion: 'PPI Broker' },
    ],
    isInitialized: true,
  };
}
```

### 2. `src/server/actions/trades.ts`

Modificar `ensureDataLoaded()` para cargar desde DB:

```typescript
async function ensureDataLoaded() {
    const state = getMemoryState();
    if (!state.isInitialized) {
        const [dbExecutions, dbTradeUnits, dbCashFlows] = await Promise.all([
            db.execution.findMany({ orderBy: { date: 'asc' } }),
            db.tradeUnit.findMany({ orderBy: { entryDate: 'asc' } }),
            db.cashFlow.findMany({ orderBy: { date: 'desc' } }),
        ]);

        if (dbExecutions.length > 0) {
            initializeFromDB({ executions: dbExecutions, tradeUnits: dbTradeUnits, cashFlows: dbCashFlows });
        } else {
            // Fallback a CSV si la BD está vacía
            const csvPath = path.join(process.cwd(), 'public/data/initial_operations.csv');
            const csvText = fs.readFileSync(csvPath, 'utf-8');
            initializeMemoryState(csvText, true);
        }
    }
    return getMemoryState();
}
```

Modificar `createExecution()` para persistir en DB:
```typescript
// Después de state.executions.push(newExec):
await db.execution.create({
  data: {
    id: newExec.id,
    date: newExec.date,
    symbol: newExec.symbol,
    qty: newExec.qty,
    price: newExec.price,
    amount: newExec.amount,
    broker: newExec.broker,
    account: newExec.account,
    side: newExec.side,
    isClosed: newExec.isClosed,
    remainingQty: newExec.remainingQty,
    currency: newExec.currency,
    commissions: newExec.commissions,
    exchange_rate: newExec.exchange_rate,
  }
});
```

Modificar `deleteExecution()` para persistir en DB:
```typescript
// Después de filtrar de memoria:
await db.execution.delete({ where: { id } });
```

Modificar `deleteTradeUnit()` para persistir en DB:
```typescript
// Después de splice de memoria:
await db.tradeUnit.delete({ where: { id } });
```

Modificar `closeTradeUnitManually()` para persistir en DB:
```typescript
// Al final, guardar en DB:
await db.$transaction([
  db.execution.update({ where: { id: openExec.id }, data: { remainingQty: openExec.remainingQty, isClosed: openExec.isClosed } }),
  db.execution.create({ data: { ...newCloseExec } }),
  db.tradeUnit.upsert({
    where: { id: resultTU.id },
    create: { ...resultTU (campos mapeados a Prisma) },
    update: { ...resultTU (campos mapeados a Prisma) },
  }),
]);
```

Modificar `closeTradeUnitWithQuantity()` para persistir en DB — usar `db.$transaction()` con todos los create/update.

### 3. `src/server/actions/transactions.ts`

Modificar `getCashFlows()` para también actualizar el memoryState al cargar:
- La función ya usa Prisma directamente (ok)
- Pero `getMemoryCashFlows()` usa memoria separada → **unificar**: después de `initializeFromDB()`, los cashFlows de memoria y Prisma deben estar sincronizados

**Nota:** CashFlow ya usa Prisma para CRUD. Solo hay que asegurarse de que:
1. `createCashFlow()` (Prisma) → también llame `addCashFlowMem()` para sincronizar memoria
2. `deleteCashFlow()` (Prisma) → también llame `removeCashFlowMem()` para sincronizar memoria
3. Haya una sola función expuesta (no dos versiones Memory/Prisma)

## Reglas críticas
- Nunca cambiar las interfaces TypeScript de `data-loader.ts`
- `ensureDataLoaded()` debe ser `async` (ya es async en dashboard.ts — verificar en todos los archivos)
- En `trades.ts`, `ensureDataLoaded()` era síncrono → cambiar a async y usar `await ensureDataLoaded()` en todas las llamadas
- Importar `db` desde `@/server/db`
- Importar `initializeFromDB` desde `@/lib/data-loader`
- No usar `new Date("YYYY-MM-DD")` — siempre `new Date(str + 'T12:00:00')` o dejar el objeto Date de Prisma
- Correr `npx tsc --noEmit` al finalizar
