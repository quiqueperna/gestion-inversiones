# Misión 02 — Lógica y API: Dashboard por Cuenta + Balance + Cuentas CRUD + onEdit
**Fecha:** 2026-03-21_10-00 | **Agente:** Lógica y API
**Docs de referencia:** `docs/domain/requirements.md`, `docs/domain/core.md`, `docs/architecture.md`

---

## Contexto

Precondición: **Agente 01 debe haber corrido primero** (interface `Operation` ya tiene campo `cuenta`).

El `requirements.md` define que el Dashboard debe agrupar por **cuenta**, no por broker:
```
Dashboard:
- Grilla de rendimientos: filas = meses, columnas = cuentas + TOTAL
- Columnas por cuenta: Balance, PL USD, PL %, I/E (Ingresos/Extracciones)
- Footer con suma de totales por columna
- Selector de año (2023–2026 y todos)
```

Además, `requirements.md` sección 8 define una nueva entidad **Cuentas**:
```
## 8. Cuentas
- Carga manual de cuentas desde la UI
- Impacta en la matriz de rendimiento del dashboard
```

También hay pendiente P2 desde `pendientes.md`: `onEdit funcional` — debe llamar a `updateOperation` real.

---

## Tareas obligatorias

### T1 — Refactorizar `getYieldsData` para agrupar por cuenta
**Archivo:** `src/server/actions/dashboard.ts`

**Cambio crítico:** en lugar de agrupar por `broker`, agrupar por `operation.cuenta`.

Estructura de retorno esperada (sin cambiar la firma, solo el agrupamiento):
```typescript
// Tipo de retorno (actualizar si existe):
type YieldRow = {
    month: string;       // "2026-01", "2026-02", etc.
    [cuenta: string]: {  // clave dinámica por cuenta
        balance: number;     // ← NUEVO: capital total invertido en ese mes en esa cuenta
        plUsd: number;
        plPercent: number;
        ie: number;          // ingresos/extracciones de cashflow
        tradeCount: number;
    };
    total: {
        balance: number;
        plUsd: number;
        plPercent: number;
        ie: number;
        tradeCount: number;
    };
};
```

**Lógica de `balance`**:
- `balance` = suma de `openAmount` de todos los trades cerrados en ese mes para esa cuenta
- O alternativamente: suma de capital en posiciones (entryAmount de trades que estaban abiertos al final del mes)
- La interpretación más simple: `balance = openAmount` (capital invertido en el trade de apertura)

**Lógica de cuentas disponibles**:
- Las cuentas disponibles se obtienen dinámicamente de `state.trades` → `Array.from(new Set(trades.map(t => t.cuenta)))`
- También incluir las cuentas del estado `Cuentas` (ver T3) para mostrar columnas aunque no haya trades

### T2 — Actualizar server action `getYieldsData` para retornar lista de cuentas
**Archivo:** `src/server/actions/dashboard.ts`

La acción debe retornar también las cuentas disponibles para que el componente `YieldsGrid` pueda renderizar las columnas correctas:
```typescript
export async function getYieldsData(year?: number): Promise<{
    rows: YieldRow[];
    cuentas: string[];   // ← NUEVO
    totals: { ... };
}>
```

### T3 — Crear entidad `Cuenta` en el memory state
**Archivo:** `src/lib/data-loader.ts`

Agregar al `memoryState`:
```typescript
let memoryState = {
    operations: [] as Operation[],
    trades: [] as Trade[],
    cashFlows: [] as CashFlow[],
    cuentas: [] as Cuenta[],     // ← NUEVO
    isInitialized: false
};

export interface Cuenta {
    id: number;
    nombre: string;   // "USA", "CRYPTO", "Argentina"
    descripcion?: string;
}
```

Inicializar con cuentas por defecto en `initializeMemoryState`:
```typescript
memoryState.cuentas = [
    { id: 1, nombre: 'USA', descripcion: 'Cuenta internacional' },
    { id: 2, nombre: 'Argentina', descripcion: 'Cuenta local' },
    { id: 3, nombre: 'CRYPTO', descripcion: 'Criptomonedas' },
];
```

Agregar funciones CRUD en `data-loader.ts`:
```typescript
export function getCuentas(): Cuenta[] { ... }
export function addCuenta(nombre: string, descripcion?: string): Cuenta { ... }
export function removeCuenta(id: number): void { ... }
```

### T4 — Crear server actions para Cuentas
**Archivo:** `src/server/actions/transactions.ts` (o nuevo `src/server/actions/cuentas.ts`)

```typescript
"use server";
export async function getCuentas(): Promise<Cuenta[]>
export async function addMemoryCuenta(nombre: string, descripcion?: string): Promise<Cuenta>
export async function removeMemoryCuenta(id: number): Promise<void>
```

### T5 — Conectar `onEdit` real en `updateOperation`
**Archivo:** `src/server/actions/trades.ts`

Verificar que `updateOperation(id, data)` existe y recibe el campo `cuenta`:
```typescript
export async function updateOperation(id: number, data: Partial<{
    symbol: string;
    quantity: number;
    price: number;
    broker: string;
    cuenta: string;      // ← NUEVO
    type: 'BUY' | 'SELL';
    isFalopa: boolean;
    isIntra: boolean;
    date: Date;
}>) {
    "use server";
    // Object.assign sobre memoryState.operations[i]
    // Recalcular amount = Math.abs(quantity) * price
}
```

### T6 — Actualizar `getDashboardSummary` para incluir cuentas
**Archivo:** `src/server/actions/dashboard.ts`

Agregar al objeto retornado:
```typescript
cuentas: getCuentas(),  // lista de cuentas disponibles
```

---

## Reglas de arquitectura a respetar

- No acceder a `memoryState` directamente desde `src/server/actions/` — usar las funciones exportadas de `src/lib/data-loader.ts`
- Validar inputs con Zod en el borde de API (server actions)
- Un caso de uso por función server action
- No romper la firma de `getYieldsData` si `YieldsGrid.tsx` ya la consume (hacer el cambio coordinado con Agente 03)

---

## Lecciones de sesiones anteriores a respetar

- El schema Zod para un formulario debe modelar los campos de la UI, no el modelo de DB (lección v1)
- `resetMemoryState()` es clave para que tests de integración no se contaminen (lección v2)
- Antes de referenciar una propiedad en la UI verificar que el servidor la devuelve en todos los casos incluyendo estado vacío (lección v1 — bug `payoffRatio`)
- Al cambiar estructura de datos, revisar TODOS los tests que hacen assertions sobre `.length` de arrays (lección v4)

---

## Criterios de cierre de esta misión

- [ ] `getYieldsData` agrupa por `cuenta` (no broker)
- [ ] Columna `balance` calculada por cuenta por mes
- [ ] `getYieldsData` retorna lista de `cuentas` disponibles
- [ ] `interface Cuenta` definida en data-loader
- [ ] `memoryState.cuentas` inicializado con USA / Argentina / CRYPTO
- [ ] `getCuentas`, `addCuenta`, `removeCuenta` exportados de data-loader
- [ ] Server actions de Cuentas funcionando
- [ ] `updateOperation` acepta campo `cuenta`
- [ ] `getDashboardSummary` incluye cuentas
- [ ] `npm run typecheck` → verde
- [ ] `npm run test` → verde (tests de integración de dashboard actualizados)
