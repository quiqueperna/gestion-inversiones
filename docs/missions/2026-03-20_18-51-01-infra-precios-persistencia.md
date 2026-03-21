# Misión 01 — Agente de Infraestructura y DB
**Fecha:** 2026-03-20 | **Versión:** 2 | **Prioridad:** P1 + P2

## Origen
Pendientes extraídos de `bitacora/pendientes.md` y documentación en `docs/`:
- **P1.4** — Precio en tiempo real para posiciones abiertas (Yahoo Finance)
- **P2.6** — Persistencia real con Prisma (opcional, para cuando el usuario tenga DB disponible)

---

## Contexto del sistema actual

El proyecto opera en **Modo Demo (in-memory)**:
- `src/lib/data-loader.ts` es el motor de estado. Lee el CSV, aplica FIFO y produce `memoryState`.
- `src/lib/prices.ts` devuelve precios simulados con varianza aleatoria `+/- 1%`.
- Prisma está configurado (`prisma/schema.prisma`) pero **no activo** para operaciones/trades.
- El único uso real de Prisma es `CashFlow` en `src/server/actions/transactions.ts`.

---

## Tarea 1 — Precio en tiempo real (P1 — BLOQUEANTE)

**Archivo:** `src/lib/prices.ts`

### Requerimiento (fuente: `docs/ui/UI-Behavior.md`)
> "El campo de precio de salida es el valor que toma el precio cuando cerramos la operación. Si la operación no está cerrada debe tomar el precio actual con el símbolo de la operación con googleFinance (preferentemente) o con Yahoo Finance."

### Implementación

Reemplazar la implementación mock actual por una real con las siguientes reglas:

```typescript
// src/lib/prices.ts

// Caché en memoria: evita más de 1 request por símbolo por cada 5 minutos
const priceCache = new Map<string, { price: number; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getCurrentPrice(symbol: string): Promise<number | null> {
  const now = Date.now();
  const cached = priceCache.get(symbol);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    // Yahoo Finance v8 — endpoint público sin autenticación
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 } // Next.js cache 5 min
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice as number | undefined;
    if (!price || isNaN(price)) throw new Error('precio no disponible');
    priceCache.set(symbol, { price, fetchedAt: now });
    return price;
  } catch {
    // Fallback silencioso: devuelve null, la UI muestra "--"
    return null;
  }
}

// Para símbolos argentinos (CEDEARs) que no están en Yahoo con el mismo ticker,
// intentar con sufijo ".BA" si el primario falla
export async function getCurrentPriceWithFallback(symbol: string): Promise<number | null> {
  const primary = await getCurrentPrice(symbol);
  if (primary !== null) return primary;
  // Intento con sufijo de mercado argentino
  const fallback = await getCurrentPrice(`${symbol}.BA`);
  return fallback;
}
```

### Integración en server actions

En `src/server/actions/trades.ts`, la función `getOpenPositions()` actualmente calcula un precio simulado:
```typescript
const randomFactor = 1 + (Math.sin(op.id) * 0.15);
const currentPrice = op.price * randomFactor;
```

Reemplazar por llamada a `getCurrentPriceWithFallback(op.symbol)` y manejar el caso `null`:
```typescript
import { getCurrentPriceWithFallback } from "@/lib/prices";

// Dentro del map de openOps:
const currentPrice = await getCurrentPriceWithFallback(op.symbol) ?? op.price;
// Si es null, usar el precio de entrada como fallback
```

Como `getOpenPositions` es async, esto ya funciona. Usar `Promise.all` para hacer todas las requests en paralelo:
```typescript
const pricesWithFallback = await Promise.all(
  openOps.map(op => getCurrentPriceWithFallback(op.symbol))
);
```

### Tests a agregar

En `src/lib/__tests__/prices.test.ts`:
```typescript
// Mock fetch para no hacer requests reales en tests
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('getCurrentPrice', () => {
  it('retorna null si fetch falla (red error)')
  it('retorna null si la respuesta no tiene precio')
  it('usa caché: segunda llamada no hace fetch')
  it('invalida caché después de 5 minutos')
})
```

---

## Tarea 2 — Persistencia Prisma (P2 — Opcional, documentar modo de activación)

**Precondición:** El usuario tiene SQLite o PostgreSQL disponible.

**Archivo:** `docs/ACTIVAR-BD.md` (crear documentación de activación, no código)

Documentar los pasos exactos para pasar de Modo Demo a Modo BD:

```markdown
# Cómo activar la Base de Datos

## 1. Configurar .env
DATABASE_URL="file:./dev.db"   # SQLite local
# o
DATABASE_URL="postgresql://user:pass@localhost:5432/inversiones"  # PostgreSQL

## 2. Aplicar migraciones
npx prisma migrate dev --name "init"

## 3. Ejecutar seed
npm run db:seed

## 4. Cambiar el flag en data-loader.ts
// Cambiar USE_DB de false a true
export const USE_DB = true;

## 5. Las server actions detectan el flag y usan Prisma en vez de memoryState
```

**Implementar el flag `USE_DB`** en `src/lib/data-loader.ts`:
```typescript
// Al inicio del archivo
export const USE_DB = process.env.USE_DB === 'true';
```

Y en cada server action que corresponda, envolver la lógica con:
```typescript
if (USE_DB) {
  return await db.operation.findMany({ ... }); // lógica Prisma
} else {
  return ensureDataLoaded().operations; // lógica memoryState
}
```

---

## Reglas que debes cumplir

- `src/lib/prices.ts` es una utilidad pura → **no puede importar `@/server/**` ni `@prisma/client`**.
- El caché debe vivir en el módulo (variable de módulo), no en sessionStorage ni localStorage.
- Si Yahoo Finance falla, la app **no debe crashear**: devolver `null` y manejar en la UI.
- Toda llamada a `fetch` externa debe tener timeout implícito via `AbortController` o confiar en Next.js `next: { revalidate }`.
- Cambios en `getOpenPositions` deben mantener el mismo tipo de retorno.

---

## Entregables esperados

1. `src/lib/prices.ts` — implementación real con caché de 5 min y fallback silencioso.
2. `src/server/actions/trades.ts` — `getOpenPositions()` usando precio real en paralelo.
3. `src/lib/__tests__/prices.test.ts` — tests con fetch mockeado.
4. `docs/ACTIVAR-BD.md` — guía de activación de Prisma.
5. Flag `USE_DB` en `data-loader.ts`.
6. `npm run test` → verde. `npm run build` → verde.
