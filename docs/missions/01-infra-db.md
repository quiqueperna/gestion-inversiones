# Misión 01 — Agente de Infraestructura y Base de Datos

## Rol
Eres el responsable de la capa de datos, esquema, migraciones, seeds y configuración de infraestructura del proyecto **Gestión de Inversiones** (Next.js + Prisma).

---

## Contexto del proyecto

- Stack: Next.js App Router, TypeScript estricto, **PostgreSQL + Prisma** (actualmente SQLite en dev, migrar o mantener consistencia).
- Capas: `prisma/` para esquema y migraciones. `src/server/` para acceso a DB.
- Guardrail crítico: **la UI (`src/app/**`) nunca importa `@prisma/client` ni `@/server/**`**.

---

## Estado actual (lo que YA existe)

| Artefacto | Estado |
|---|---|
| `prisma/schema.prisma` | Existe. Modelos: `Operation`, `Trade`, `CashFlow`. Provider: SQLite. |
| `prisma/dev.db` | Existe (SQLite local). |
| `prisma/seed-complete.ts` | Existe pero sin ejecutar ni verificar. |
| `prisma/seed-csv.ts` | Existe. Carga desde CSV. |
| `public/data/initial_operations.csv` | Existe. Datos de prueba. |

---

## Tareas pendientes (lo que FALTA hacer)

### 1. Revisar y completar el schema Prisma

**Verificar que el modelo `Operation` tenga todos los campos definidos en `docs/domain/requirements.md`:**

```
Operation:
  id           Int       @id @default(autoincrement())
  date         DateTime
  symbol       String
  quantity     Float     -- positivo=compra, negativo=venta
  price        Float
  amount       Float     -- monto total (quantity * price)
  broker       String    @default("AMR")
  type         String    -- "BUY" | "SELL"
  isClosed     Boolean   @default(false)
  isFalopa     Boolean   @default(false)
  isIntra      Boolean   @default(false)
  remainingQty Float     @default(0)  -- qty pendiente de cerrar
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
```

**Verificar que el modelo `Trade` tenga todos los campos:**

```
Trade:
  id              Int       @id @default(autoincrement())
  symbol          String
  quantity        Float
  openDate        DateTime
  closeDate       DateTime  -- nullable si está abierto
  openPrice       Float
  closePrice      Float?    -- nullable si está abierto
  openAmount      Float
  closeAmount     Float?    -- nullable si está abierto
  days            Int?      -- nullable si está abierto
  returnAmount    Float?    -- nullable si está abierto
  returnPercent   Float?    -- nullable si está abierto
  tna             Float?    -- nullable si está abierto
  broker          String
  isClosed        Boolean   @default(false)
  instrumentType  String    @default("STOCK")  -- STOCKS, CEDEARS, BTC
  openOperationId  Int
  closeOperationId Int?     -- nullable si está abierto
```

**IMPORTANTE**: Un Trade puede estar **abierto** (sin contraparte). Los campos de cierre deben ser nullable.

### 2. Crear migración limpia

```bash
npx prisma migrate dev --name "add_nullable_trade_close_fields"
```

Verificar que la migración no rompa datos existentes.

### 3. Crear seed de 100 trades (requerimiento de `docs/domain/core.md`)

Archivo: `prisma/seed-complete.ts`

Requisitos del seed:
- **100 trades** con fechas en rango de **2 años** (desde hoy - 2 años hasta hoy).
- Símbolos variados: AAPL, TSLA, NVDA, AMZN, GOOGL, MSFT, BTC, CEDEAR (GGAL, YPF, BBAR).
- Mix de instrumentTypes: STOCK, CEDEARS, BTC.
- **Algunos trades ABIERTOS**: crear operaciones de compra sin contraparte de venta (al menos 15-20 operaciones abiertas acumuladas).
- Brokers: `AMR`, `IOL`, `PP`.
- Rendimientos variados: positivos y negativos, duración de 1 a 180 días.
- CashFlows: depósitos y extracciones distribuidos en el período.

Estructura del seed:
```typescript
// 1. Limpiar DB
// 2. Crear Operations (BUY) -> algunas con closeOperation (SELL) -> crear Trade
// 3. Crear operaciones abiertas sin contraparte
// 4. Crear CashFlows
// 5. Ejecutar: npx prisma db seed
```

### 4. Configurar script en package.json

```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-complete.ts"
}
```

### 5. Verificar índices de performance

Asegurar índices en:
- `Operation`: `symbol`, `date`, `broker`, `isClosed`
- `Trade`: `symbol`, `closeDate`, `broker`, `isClosed`
- `CashFlow`: `date`, `broker`

### 6. Modo Demo (CSV en memoria)

Mantener el loader `src/lib/data-loader.ts` que carga el CSV para modo demo **sin DB**.
El CSV `public/data/initial_operations.csv` debe tener datos suficientes para demostrar todas las funcionalidades del dashboard.

---

## Reglas que debes cumplir

- No acceder a DB desde `src/app/**` ni `src/lib/**`.
- Toda lógica de acceso a datos va en `src/server/**`.
- Validar con Zod en el borde de entrada (actions).
- Cambios pequeños y reversibles: una migración por cambio lógico.

---

## Entregables esperados

1. `prisma/schema.prisma` corregido y completo.
2. Migración generada y aplicada.
3. `prisma/seed-complete.ts` funcional con 100 trades + operaciones abiertas.
4. `npm run db:seed` ejecuta sin errores.
5. DB consultable con datos reales de prueba.
