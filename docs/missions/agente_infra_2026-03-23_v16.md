# Misión: Agente de Infraestructura y DB — v16
**Fecha:** 2026-03-23
**Versión:** 16
**Dependencias:** Ninguna (ejecutar primero)

## Objetivo
Actualizar el schema de Prisma con campos faltantes, crear una migración y generar datos de prueba en la BD local de Supabase.

## Contexto
- El ambiente local de Supabase está corriendo (puerto 54321/54322)
- El schema actual (`prisma/schema.prisma`) tiene los modelos `Execution`, `TradeUnit`, `CashFlow`
- Los modelos TypeScript en `data-loader.ts` tienen campos que NO están en Prisma:
  - `Execution.exchange_rate` (Float, default 1)
  - `CashFlow.cuenta` (String, opcional)
  - `TradeUnit.exitExecId` (Int, opcional) — referencia a la Execution de salida

## Tareas

### 1. Actualizar `prisma/schema.prisma`

Agregar estos campos:

**En model `Execution`:**
```
exchange_rate Float @default(1)
```

**En model `CashFlow`:**
```
cuenta String?
```

**En model `TradeUnit`:**
```
exitExecId   Int?
exitExec     Execution? @relation("ExitExecution", fields: [exitExecId], references: [id])
```

Y en `Execution`, agregar la relación inversa:
```
exitTradeUnits   TradeUnit[] @relation("ExitExecution")
```

### 2. Crear migración
```bash
npx prisma migrate dev --name add_missing_fields_v16
```

### 3. Crear seed script `prisma/seed-v16.ts`

El seed debe:
1. Leer `public/data/initial_operations.csv`
2. Parsear las operaciones (format: date, symbol, quantity, price, broker, type, category, instrument, isFalopa)
3. Ejecutar FIFO matching (key: `symbol::account::broker`) para generar TradeUnits
4. Limpiar las tablas existentes (deleteMany en orden: TradeUnit, Execution, CashFlow)
5. Insertar todos los registros en la BD
6. Agregar mock data adicional:
   - 3 Executions open (TSLA BUY 10@200 Schwab/USA, NVDA BUY 5@800 IOL/Argentina, AAPL BUY 100@150 Schwab/USA)
   - 9 CashFlows (3 brokers × 3: depósito inicial $10000, aporte $500, retiro $2000)

**Reglas de mapping CSV → Execution:**
- `quantity` → `qty` (abs value)
- `type` → `side` ('BUY'/'SELL')
- Inferir `account` desde broker: IBKR→'USA', AMR→'USA', IOL→'Argentina', Schwab→'USA', Binance→'CRYPTO', Cocos→'Argentina'
- Solo procesar rows donde `category === 'TRADE'`
- Fechas: `new Date(dateStr + 'T12:00:00')` (CRÍTICO: no new Date(dateStr) sin hora)

**Reglas FIFO:**
- `matchKey = symbol::account::broker`
- Al hacer match BUY-SELL: crear TradeUnit con status='CLOSED', calcular pnlNominal, pnlPercent, tna, days
- BUYs sin contraparte: crear TradeUnit con status='OPEN'

### 4. Actualizar `package.json`
Agregar script:
```json
"seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed-v16.ts"
```
O usar el patrón existente si hay uno.

### 5. Ejecutar seed
```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-v16.ts
```

O simplemente:
```bash
npx prisma db seed
```

## Reglas de trabajo
- Nunca `new Date("YYYY-MM-DD")` → siempre `new Date(str + 'T12:00:00')`
- Usar `db` desde `@/server/db` (patrón singleton ya existe)
- No alterar `public/data/initial_operations.csv`
- Correr `npx tsc --noEmit` al finalizar para verificar 0 errores TypeScript
