# Misión 02 — Agente de Lógica y API
**Fecha:** 2026-03-20 | **Versión:** 2 | **Prioridad:** P1 + P2 + P3

## Origen
Pendientes de `bitacora/pendientes.md`:
- **P1.2** — Acciones de tabla: Editar/Eliminar operaciones sin persistencia real
- **P1.3** — Backend de CashFlow ya existe, falta conectar con memoryState
- **P2.5** — `docs/Funcionalidades.md` nunca fue creado (requerido por `core.md`)
- **P3.11** — Lógica de exportación CSV desde DataTable
- **P3.14** — Datos para curva de equity (serie temporal de rendimiento acumulado)

---

## Contexto

- Motor de datos: `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows).
- Server actions existentes: `trades.ts` (getOperations, getTrades, createOperation, closeTradeManually), `dashboard.ts` (getStats, getYieldsData, getDashboardSummary, getTopStats), `transactions.ts` (CashFlow via Prisma DB).
- El `memoryState.cashFlows` tiene datos mock hardcodeados en `initializeMemoryState`. No hay forma de agregar CashFlows desde la UI al estado en memoria.

---

## Tarea 1 — CashFlow en memoryState (P1)

**Problema:** `transactions.ts` usa Prisma para CashFlow, pero el motor es in-memory. La UI no puede agregar depósitos/retiros que impacten el dashboard.

**Solución:** Agregar funciones de CashFlow al `memoryState` en `data-loader.ts` y crear server actions que los manipulen.

### En `src/lib/data-loader.ts` agregar:

```typescript
export function addCashFlow(cf: Omit<CashFlow, 'id'>): CashFlow {
  const state = getMemoryState();
  const newId = state.cashFlows.length > 0
    ? Math.max(...state.cashFlows.map(c => c.id)) + 1
    : 1;
  const newCf: CashFlow = { ...cf, id: newId };
  state.cashFlows.push(newCf);
  return newCf;
}

export function removeCashFlow(id: number): boolean {
  const state = getMemoryState();
  const idx = state.cashFlows.findIndex(c => c.id === id);
  if (idx === -1) return false;
  state.cashFlows.splice(idx, 1);
  return true;
}
```

### En `src/server/actions/transactions.ts` — agregar estas funciones (además de las existentes de Prisma):

```typescript
// CashFlow en memoria (para Modo Demo)
export async function addMemoryCashFlow(data: {
  date: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  broker: string;
  description?: string;
}) {
  ensureDataLoaded(); // importar desde data-loader
  const { addCashFlow } = await import('@/lib/data-loader');
  return addCashFlow({
    date: new Date(data.date),
    amount: data.amount,
    type: data.type,
    broker: data.broker,
    description: data.description,
  });
}

export async function removeMemoryCashFlow(id: number) {
  const { removeCashFlow } = await import('@/lib/data-loader');
  return removeCashFlow(id);
}

export async function getMemoryCashFlows(broker?: string) {
  ensureDataLoaded();
  const { getMemoryState } = await import('@/lib/data-loader');
  const state = getMemoryState();
  return broker
    ? state.cashFlows.filter(c => c.broker === broker)
    : state.cashFlows;
}
```

---

## Tarea 2 — Eliminar operación del memoryState (P1)

**Archivo:** `src/server/actions/trades.ts`

Agregar función `deleteOperation`:

```typescript
export async function deleteOperation(id: number): Promise<boolean> {
  const state = ensureDataLoaded();
  const idx = state.operations.findIndex(op => op.id === id);
  if (idx === -1) return false;

  const op = state.operations[idx];

  // Si la operación tiene trades asociados, eliminarlos también
  // (trades donde openOperationId o closeOperationId = id)
  // En memoryState los trades no tienen operationId trackado, pero podemos
  // identificarlos por símbolo/fecha/precio
  state.operations.splice(idx, 1);
  return true;
}
```

Agregar función `updateOperation` para edición:

```typescript
export async function updateOperation(id: number, data: Partial<{
  date: Date;
  symbol: string;
  quantity: number;
  price: number;
  broker: string;
  isFalopa: boolean;
  isIntra: boolean;
}>): Promise<boolean> {
  const state = ensureDataLoaded();
  const op = state.operations.find(o => o.id === id);
  if (!op) return false;

  Object.assign(op, {
    ...data,
    amount: data.quantity && data.price
      ? Math.abs(data.quantity * data.price)
      : op.amount,
  });
  return true;
}
```

---

## Tarea 3 — Exportar datos como CSV (P3)

**Archivo:** `src/lib/csv-exporter.ts` (nuevo, función pura en lib)

```typescript
// Convierte un array de objetos a CSV string descargable
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const headers = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val instanceof Date) return val.toLocaleDateString('es-AR');
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return String(val ?? '');
    }).join(',')
  );
  return [headers, ...rows].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

---

## Tarea 4 — Datos para curva de equity (P3)

**Archivo:** `src/server/actions/dashboard.ts` — agregar función:

```typescript
export async function getEquityCurve(): Promise<{ date: string; equity: number; trade: string }[]> {
  const state = ensureDataLoaded();

  // Ordenar trades por fecha de cierre
  const sorted = [...state.trades].sort(
    (a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
  );

  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.returnAmount;
    return {
      date: new Date(t.closeDate).toISOString().split('T')[0],
      equity: Math.round(cumulative * 100) / 100,
      trade: t.symbol,
    };
  });
}
```

---

## Tarea 5 — Crear `docs/Funcionalidades.md` (P2 — requerido por core.md)

Fuente: `docs/domain/core.md` dice explícitamente:
> "Cuando las tengas las ideas de dashboard y estadísticas definidas escríbelas en un archivo Funcionalidades.md"

Crear `docs/Funcionalidades.md` con el listado completo de todo lo implementado:

```markdown
# Funcionalidades Implementadas

## Dashboard Principal
- Grilla de rendimientos: filas=meses, columnas=brokers + TOTAL
- Columnas por broker: PL USD, PL %, I/E (Ingresos/Extracciones)
- Footer con suma de totales por columna
- Selector de año (2023, 2024, 2025, 2026)
- 4 tarjetas de resumen: Operaciones Abiertas, Trades Cerrados, Win Rate, Avg Trade Size
- Top 5 Trades por P&L $

## Analytics (15+ métricas configurables por período)
- Resultado Neto (Net Profit)
- Gross Profit / Gross Loss
- Win Rate %
- Profit Factor
- Max Drawdown $
- Sharpe Ratio (anualizado)
- Sortino Ratio (anualizado)
- Expectancy $ por trade
- Recovery Factor
- SQN (System Quality Number)
- Kelly Criterion %
- Avg Win / Avg Loss
- Payoff Ratio
- Max Win / Max Loss (trade individual)
- Max Win Streak / Max Loss Streak
- Avg Holding Time (días)
- Rendimiento por instrumento (STOCK / CEDEAR / CRYPTO)

## Listado de Operaciones
- Todos los campos: ID, Fecha, Símbolo, Tipo, Cantidad, Precio, Monto, Broker, Estado, Falopa, Intra
- Precio de salida: real (Yahoo Finance) si está abierta, precio de cierre si está cerrada
- Fecha de salida: hoy si está abierta, fecha de cierre si está cerrada
- Ordenamiento por cualquier columna ↕
- Paginación: 25 / 50 / 100 / Todos
- Filtro por período (7 opciones + rango personalizado)
- Búsqueda por símbolo/broker

## Listado de Trades
- Todos los campos: ID, F.Entrada, F.Salida, Símbolo, Cantidad, P.Entrada, P.Salida, M.Entrada, M.Salida, Días, Rdto $, Rdto %, TNA, Broker
- Colores semánticos: verde=positivo, rojo=negativo
- Ordenamiento, paginación y filtros igual que Operaciones

## Posiciones Abiertas
- BUY sin contraparte SELL
- Precio actual (Yahoo Finance con caché 5 min)
- P&L latente en $ y %
- Días transcurridos desde apertura

## Alta de Operación
- Formulario tradicional con todos los campos
- Toggle BUY/SELL visual
- Selector de broker (AMR/IOL/IBKR/PP)
- Modo pegado rápido: parsea texto libre o formato clave=valor
- Cierre manual: selección de operación de apertura cuando hay múltiples abiertas del mismo símbolo

## Ingresos / Egresos (CashFlow)
- Carga manual de depósitos y retiros por broker
- Impacta la columna I/E del Dashboard
- Listado de movimientos con fecha, monto, tipo y descripción
```

---

## Reglas que debes cumplir (fuente: `docs/rules.md`, `docs/architecture.md`)

- `src/lib/csv-exporter.ts` es utilidad pura: no importa `@/server/**` ni `@prisma/client`.
- `downloadCSV` usa `window` → solo ejecutar en cliente, verificar `typeof window !== 'undefined'`.
- Toda entrada de datos a server action debe validarse con Zod antes de operar sobre el estado.
- Las funciones que modifican `memoryState` deben ser sincrónicas en `src/lib/data-loader.ts` (sin async).

---

## Entregables esperados

1. `src/lib/data-loader.ts` — `addCashFlow()`, `removeCashFlow()` añadidos.
2. `src/server/actions/transactions.ts` — `addMemoryCashFlow()`, `removeMemoryCashFlow()`, `getMemoryCashFlows()`.
3. `src/server/actions/trades.ts` — `deleteOperation()`, `updateOperation()`.
4. `src/server/actions/dashboard.ts` — `getEquityCurve()`.
5. `src/lib/csv-exporter.ts` — exportToCSV + downloadCSV.
6. `docs/Funcionalidades.md` — listado completo.
7. `npm run typecheck` → verde. `npm run test` → verde.
