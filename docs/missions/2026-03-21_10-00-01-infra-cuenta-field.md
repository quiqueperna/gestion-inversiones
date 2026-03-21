# Misión 01 — Infraestructura y DB: Campo `cuenta`
**Fecha:** 2026-03-21_10-00 | **Agente:** Infraestructura y DB
**Docs de referencia:** `docs/architecture.md`, `docs/stack.md`, `docs/rules.md`, `docs/domain/requirements.md`

---

## Contexto

La interface `Operation` no tiene el campo `cuenta`. El `requirements.md` define:
- `Cuenta`: Texto que indica una cuenta (por defecto: `USA`)
- Selector de cuenta en el formulario: `USA / CRYPTO / Argentina`

El Dashboard debe agrupar por Cuenta, no por Broker. Para que esto funcione, primero hay que incorporar `cuenta` en la capa de datos.

---

## Tareas obligatorias

### T1 — Agregar `cuenta` a la interface `Operation`
**Archivo:** `src/lib/data-loader.ts`

```typescript
export interface Operation {
    id: number;
    date: Date;
    symbol: string;
    quantity: number;
    price: number;
    amount: number;
    broker: string;
    cuenta: string;          // ← NUEVO (default: 'USA')
    type: 'BUY' | 'SELL';
    remainingQty: number;
    isClosed: boolean;
    isFalopa: boolean;
    isIntra: boolean;
}
```

### T2 — Agregar `cuenta` a la interface `Trade`
**Archivo:** `src/lib/data-loader.ts`

El Trade hereda la cuenta de la operación de apertura:
```typescript
export interface Trade {
    // ... campos existentes ...
    cuenta: string;          // ← NUEVO (hereda de openOperation)
}
```

### T3 — Actualizar el parser de CSV en `initializeMemoryState`
**Archivo:** `src/lib/data-loader.ts`

En el loop de parseo de líneas CSV:
```typescript
// En el mapeo de headers, manejar cuenta:
if (header === 'cuenta') val = val?.trim() || 'USA';
// Si no viene en el CSV (header no existe), defaultear a 'USA':
op.cuenta = op.cuenta || 'USA';
```

Al crear un Trade en el loop FIFO, propagar la cuenta:
```typescript
const newTrade: Trade = {
    // ... campos existentes ...
    cuenta: openOp.cuenta || 'USA',  // ← propagar cuenta de la operación apertura
};
```

### T4 — Actualizar `addOperation` para incluir `cuenta`
**Archivo:** `src/lib/data-loader.ts`

La función que crea operaciones desde el formulario debe incluir el campo `cuenta`:
```typescript
export function addOperation(data: {
    symbol: string;
    quantity: number;
    price: number;
    broker: string;
    cuenta: string;     // ← NUEVO
    type: 'BUY' | 'SELL';
    isFalopa?: boolean;
    isIntra?: boolean;
    date?: Date;
}): Operation {
    const op: Operation = {
        // ...
        cuenta: data.cuenta || 'USA',
        // ...
    };
```

### T5 — Actualizar CSV de datos de demo
**Archivo:** `public/data/initial_operations.csv`

Agregar columna `cuenta` al CSV. Reglas:
- Si `broker` es `IBKR` → `cuenta = USA`
- Si `broker` es `IOL` → `cuenta = Argentina`
- Si `broker` es `AMR` → `cuenta = USA`
- Default → `USA`

El header del CSV debe quedar: `date,symbol,quantity,price,broker,cuenta,type,isFalopa`

> **IMPORTANTE:** No borrar ni cambiar los datos existentes, solo agregar la columna `cuenta` a todas las filas según la regla de broker arriba. Usar un script o procesarlo directamente.

---

## Reglas de arquitectura a respetar

- `src/lib/data-loader.ts` es puro: no importar `@prisma/client` ni `@/server/**`
- `src/lib/prices.ts` es puro: solo lógica de fetching, sin side effects de BD
- No borrar campos existentes, solo agregar `cuenta`
- No tocar `prisma/schema.prisma` ahora (la activación de BD es una tarea separada documentada en `docs/ACTIVAR-BD.md`)

---

## Lecciones de sesiones anteriores a respetar

- Al hacer campos opcionales en una interface compartida, buscar con grep TODOS los usos del campo antes del cambio (lección v4)
- Al agregar campos al Trade, asegurarse de que `createEmptyStats()` y todos los reducers no rompan por `undefined` (lección v1)
- `Promise.all` en `getOpenPositions` es obligatorio para no hacer fetches secuenciales (lección v2)

---

## Criterios de cierre de esta misión

- [ ] `interface Operation` tiene campo `cuenta: string`
- [ ] `interface Trade` tiene campo `cuenta: string`
- [ ] CSV de demo tiene columna `cuenta` en todas las filas
- [ ] `addOperation` acepta y persiste `cuenta`
- [ ] `initializeMemoryState` parsea `cuenta` del CSV con fallback `'USA'`
- [ ] FIFO propagra `cuenta` de la operación de apertura al Trade
- [ ] `npm run typecheck` → verde
- [ ] `npm run test` → verde
