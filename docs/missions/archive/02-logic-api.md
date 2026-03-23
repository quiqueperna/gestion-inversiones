# Misión 02 — Agente de Lógica y API

## Rol
Eres el responsable de toda la lógica de negocio, server actions, validaciones y cómputos del proyecto **Gestión de Inversiones**.

---

## Contexto del proyecto

- Stack: Next.js App Router, Server Actions (no REST API clásica), TypeScript estricto, Zod para validación.
- Capas: `src/server/actions/` para casos de uso. `src/lib/` para utilidades puras (sin side effects).
- Guardrail: **`src/lib/**` no puede importar `@prisma/client` ni `@/server/**`**.

---

## Estado actual (lo que YA existe)

| Artefacto | Estado |
|---|---|
| `src/server/actions/trades.ts` | Parcial. Lógica básica de trades. |
| `src/server/actions/dashboard.ts` | Parcial. Lógica básica del dashboard. |
| `src/server/actions/transactions.ts` | Parcial. CRUD básico de operaciones. |
| `src/lib/data-loader.ts` | Existe. Loader CSV para modo demo. |

---

## Dominio (fuente: `docs/domain/requirements.md` y `docs/domain/core.md`)

### Concepto clave: Operación vs Trade

- **Operación**: entrada individual al mercado (BUY o SELL). Puede quedar abierta.
- **Trade**: par de operaciones (apertura + cierre). Se cierra cuando entra la contraparte con **mismo símbolo y misma cantidad**.

### Regla de cierre
- Si existe 1 operación abierta del símbolo → se cierra automáticamente.
- Si existen N operaciones abiertas del mismo símbolo → el usuario elige manualmente **cuál** cerrar (selección manual).
- El sistema NO implementa FIFO/LIFO automático: la elección es **siempre manual**.

### Cálculos de Trade
```
returnAmount   = closeAmount - openAmount
returnPercent  = (returnAmount / openAmount) * 100
days           = diferencia en días entre openDate y closeDate
tna            = (returnPercent / days) * 365
```

---

## Tareas pendientes (lo que FALTA hacer)

### 1. CRUD completo de Operaciones (`src/server/actions/transactions.ts`)

```typescript
// Acciones requeridas:
createOperation(data: CreateOperationInput): Promise<Operation>
updateOperation(id: number, data: UpdateOperationInput): Promise<Operation>
deleteOperation(id: number): Promise<void>
getOperations(filters: OperationFilters): Promise<Operation[]>
getOpenOperationsBySymbol(symbol: string): Promise<Operation[]>
```

Validación Zod para `CreateOperationInput`:
```typescript
{
  date: z.coerce.date(),
  symbol: z.string().min(1).max(10).toUpperCase(),
  quantity: z.number().positive(),  // siempre positivo en formulario
  price: z.number().positive(),
  amount: z.number().positive(),    // calculado: quantity * price
  broker: z.string().default("AMR"),
  type: z.enum(["BUY", "SELL"]),
  isFalopa: z.boolean().default(false),
  isIntra: z.boolean().default(false),
}
```

### 2. Lógica de cierre manual de Trade (`src/server/actions/trades.ts`)

```typescript
// Obtener operaciones abiertas para un símbolo (para que el usuario elija)
getOpenOperationsForSymbol(symbol: string, type: "BUY" | "SELL"): Promise<Operation[]>

// Cerrar trade eligiendo manualmente la operación de apertura
closeTradeManually(
  closeOperationId: number,  // operación de cierre (SELL si era BUY)
  openOperationId: number    // operación de apertura elegida manualmente
): Promise<Trade>
```

Flujo interno de `closeTradeManually`:
1. Cargar ambas operaciones.
2. Validar que sean contrapartes (mismo símbolo, misma cantidad, tipos opuestos).
3. Calcular `returnAmount`, `returnPercent`, `days`, `tna`.
4. Crear el `Trade` con todos los campos.
5. Marcar ambas `Operation` como `isClosed = true`.
6. Todo en una transacción Prisma (`prisma.$transaction`).

### 3. Lógica de parsing por texto (Pegado Rápido)

Archivo: `src/lib/operation-parser.ts`

El usuario puede pegar un string con datos de la operación. Parsear el siguiente formato:
```
AAPL 10 150.50 BUY 2024-01-15
```
o formato extendido:
```
fecha=2024-01-15 simbolo=AAPL cantidad=10 precio=150.50 tipo=BUY broker=AMR
```

Función pura (sin side effects, en `src/lib/`):
```typescript
parseOperationText(text: string): Partial<CreateOperationInput> | null
```

### 4. Integración de precios en tiempo real (operaciones abiertas)

Archivo: `src/lib/price-fetcher.ts`

Para operaciones abiertas, el precio de salida es el **precio actual**.
- Fuente primaria: Yahoo Finance (API pública `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`)
- Fallback: devolver `null` si falla.
- Cache de 5 minutos por símbolo (usar `Map` en memoria o Next.js `cache()`).

```typescript
fetchCurrentPrice(symbol: string): Promise<number | null>
```

### 5. Server Actions del Dashboard (`src/server/actions/dashboard.ts`)

#### 5a. Rendimientos por cuenta por período
```typescript
getYieldsByBrokerAndPeriod(broker: string, period: "day" | "month" | "year" | "all"): Promise<{
  balance: number,
  plUsd: number,
  plPercent: number,
  cashFlow: number  // ingresos/extracciones
}>
```

#### 5b. Estadísticas generales
```typescript
getDashboardStats(): Promise<{
  // Totales
  totalOpenTrades: number,
  totalClosedTrades: number,
  totalPositiveTrades: number,
  totalNegativeTrades: number,
  avgTradeSize: number,

  // Rankings
  top5Trades: Trade[],       // por returnAmount desc
  bestMonth: { month: string, total: number },
  bestReturnPercent: Trade,

  // Por instrumento
  yieldByInstrumentType: { STOCK: number, CEDEARS: number, BTC: number },

  // Volumen
  volumeByPeriod: { period: string, volume: number }[],

  // Operaciones abiertas
  openOperationsCount: number,
  openOperationsBySymbol: { symbol: string, count: number, totalAmount: number }[]
}>
```

#### 5c. Grid de rendimientos (ya parcialmente implementado en `dashboard.ts`)
Completar para que devuelva datos reales de DB con todos los brokers.

### 6. CRUD de CashFlow (Ingresos/Extracciones)

```typescript
createCashFlow(data: { date: Date, amount: number, type: "DEPOSIT" | "WITHDRAWAL", broker: string, description?: string }): Promise<CashFlow>
getCashFlows(filters: { broker?: string, from?: Date, to?: Date }): Promise<CashFlow[]>
deleteCashFlow(id: number): Promise<void>
```

---

## Reglas que debes cumplir

- Zod en toda entrada de Server Action.
- `src/lib/**` solo funciones puras (sin Prisma, sin fetch con side effects en módulo).
- Transacciones Prisma para operaciones que modifican múltiples tablas.
- Un caso de uso = una función. No mezclar lógicas.
- Manejar errores con `try/catch` y devolver `{ success: boolean, data?, error? }`.

---

## Entregables esperados

1. `src/server/actions/transactions.ts` — CRUD completo de operaciones.
2. `src/server/actions/trades.ts` — cierre manual de trades implementado.
3. `src/server/actions/dashboard.ts` — todas las estadísticas implementadas.
4. `src/lib/operation-parser.ts` — parser de texto para pegado rápido.
5. `src/lib/price-fetcher.ts` — fetch de precio actual para operaciones abiertas.
6. `src/lib/trade-calculator.ts` — funciones puras de cálculo (returnAmount, returnPercent, days, tna).
