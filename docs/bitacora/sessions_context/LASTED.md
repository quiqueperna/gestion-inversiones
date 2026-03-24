# Contexto de Sesión - Gestión de Inversiones
<!-- LEER PRIMERO: el bloque más reciente (v22, arriba del todo) es el estado actual. Los bloques anteriores son histórico. -->

---

## 23 de Marzo, 2026 — Estado actual tras sesión v23 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Cambio principal v23
Reordenamiento de columnas en `ImportCSVView.tsx`:
- **Tabla ejecuciones**: ID, Fecha Entrada, Símbolo, Lado, Cantidad, Precio, Broker, Cuenta
- **Tabla trades**: F.Entrada, Símbolo, Lado (Compra), Cantidad, P.Entrada, P.Salida, F.Salida, Días, PnL $, PnL %, TNA, Estado, Broker, Cuenta
  - Columnas nuevas: Lado, F.Salida, TNA (ya existían en ProjectedTrade)
  - `TradeRow` extiende con `_exitDate: Date | null`
  - `SortIcon` del hook usado inline (sin `Th` helper)

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v22 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Cambio principal v22
Polish UI de `ImportCSVView.tsx`:
- `useSortable<T>` hook: todas las tablas ordenables por cualquier columna con ▲▼ en headers
- Tabla ejecuciones: orden default fecha desc
- Tabla trades: orden default entryDate desc; estrategia como leyenda general (no columna); `buildStrategyLegend()` muestra "cuenta1: FIFO · cuenta2: LIFO"
- Tabla candidatos MANUAL: sin columna Origen; con columna Símbolo; "Cantidad" (antes "ATY disp."); fecha+hora en columna fecha; filtra candidatos con `date <= sellDate`; orden desc
- Todo el UI en español

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v21 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Cambio principal v21
Motor de simulación de trades para importación masiva:
- `src/lib/trade-simulator.ts`: motor puro; soporta FIFO, LIFO, MAX_PROFIT, MIN_PROFIT, MANUAL; cross-import matching
- `previewBulkImport()` / `confirmBulkImportWithTrades()` en trades.ts
- `ImportCSVView` rediseñado: 5 pasos (upload → preview → manual → final-review → done)
- Secciones colapsables para ejecuciones y trades
- Flow interactivo para estrategia MANUAL (candidatos BUY con PnL estimado)

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v20 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** Supabase local → todas las entidades persisten en BD
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Cambio principal v20
Importación CSV completa con validación de broker/cuenta contra BD:
- Parser valida broker y account contra listas de la BD (error específico si no existen)
- UI muestra dos tablas separadas: filas válidas + filas inválidas con columna "Razón"
- `ImportCSVView` recibe `brokers[]` y `accounts[]` props desde page.tsx

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v19 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** Supabase local → todas las entidades persisten en BD
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Modelo de persistencia (completo)
| Entidad | Tabla DB | Persiste |
|---|---|---|
| Execution | `Execution` | ✅ create/delete/update/bulk-import |
| TradeUnit | `TradeUnit` | ✅ delete/close |
| CashFlow | `CashFlow` | ✅ create/delete/update |
| Account | `Account` | ✅ create/delete/update/strategy |
| Broker | `Broker` | ✅ create/delete/update |

### Cambio principal v19
Importación masiva de ejecuciones desde CSV:
- `src/lib/csv-import.ts` — parser cliente: formato `mm/dd/yy hh:mm:ss`, TSV/CSV autodetect
- `bulkImportExecutions()` en `trades.ts` — server action que crea todas las ejecuciones en DB
- `src/components/trades/ImportCSVView.tsx` — UI con drag&drop, preview table, confirmación
- Botón "Importar CSV" en toolbar de la app
- Combos de Broker/Account en TradeForm y CashFlowForm ahora cargan desde BD (sin hardcode)

### Para arrancar una nueva sesión
```bash
supabase start   # si Supabase local no está activo
taskkill /IM node.exe /F  # Windows
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v18 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** Supabase local → todas las entidades persisten en BD
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Account, Broker

### Modelo de persistencia (completo)
| Entidad | Tabla DB | Persiste |
|---|---|---|
| Execution | `Execution` | ✅ create/delete/update |
| TradeUnit | `TradeUnit` | ✅ delete/close |
| CashFlow | `CashFlow` | ✅ create/delete/update |
| Account | `Account` | ✅ create/delete/update/strategy |
| Broker | `Broker` | ✅ create/delete/update |

### Cambio principal v18
Rename completo `Cuenta` → `Account` en toda la codebase:
- Tabla DB: `Cuenta` → `Account`; columna `CashFlow.cuenta` → `CashFlow.account`
- Interface TypeScript: `Cuenta` → `Account`
- Funciones: `getCuentas`→`getAccounts`, `addCuenta`→`addAccount`, etc.
- State en page.tsx: `cuentas`→`accounts`, `selectedCuentas`→`selectedAccounts`
- Componente: `AccountsSection.tsx` (reemplaza `CuentasSection.tsx`)
- Props en YieldsGrid, CashFlowForm, TradeForm actualizadas

### Para arrancar una nueva sesión
```bash
supabase start   # si Supabase local no está activo
taskkill /IM node.exe /F  # Windows
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Brokers en CashFlowForm** — selects hardcodeados — P2
2. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v17 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** Supabase local → todas las entidades persisten en BD
- **Prisma:** activo para Execution, TradeUnit, CashFlow, Cuenta, Broker

### Modelo de persistencia (completo)
| Entidad | Tabla DB | Persiste |
|---|---|---|
| Execution | `Execution` | ✅ create/delete/update |
| TradeUnit | `TradeUnit` | ✅ delete/close |
| CashFlow | `CashFlow` | ✅ create/delete/update |
| Cuenta | `Cuenta` | ✅ create/delete/update/strategy |
| Broker | `Broker` | ✅ create/delete/update |

### Fix crítico v17
Todas las funciones `ensureDataLoaded`/`ensureLoaded` usan la misma estrategia: DB first, CSV fallback. Garantiza `isDBBacked=true` en todas las server actions.

### Para arrancar una nueva sesión
```bash
supabase start   # si Supabase local no está activo
taskkill /IM node.exe /F  # Windows
npm run dev
npx tsc --noEmit  # 0 errores
npm run test      # 42 tests
```

### Pendientes
1. **Brokers en CashFlowForm** — selects hardcodeados — P2
2. **Sidebar lateral** — P3

---

## 23 de Marzo, 2026 — Estado actual tras sesión v16 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** Supabase local (PostgreSQL, puerto 54322) → `initializeFromDB()` → `memoryState`
- **Prisma:** activo para todas las entidades (Execution, TradeUnit, CashFlow)
- **Tests:** Vitest (42 unitarios + integración)

### Modelo de persistencia actual
```
Supabase/Prisma (fuente de verdad en disco)
    ↓ al iniciar (primer request)
initializeFromDB() → memoryState { executions, tradeUnits, cashFlows }
    ↓ en cada mutación (isDBBacked=true)
db.execution.create/update/delete + db.tradeUnit.* + db.cashFlow.*
```

**Flag `isDBBacked`:**
- `true` cuando `initializeFromDB()` fue llamado → mutaciones persisten a DB
- `false` cuando `initializeMemoryState()` (CSV) fue llamado → sin escritura a DB (tests)

### BD local — datos actuales
| Tabla | Registros |
|---|---|
| `Execution` | 341 (338 CSV + 3 mock posiciones abiertas) |
| `TradeUnit` | 201 (198 cerrados FIFO + 3 abiertos mock) |
| `CashFlow` | 9 (3 brokers × 3 movimientos) |

### Qué funciona hoy
Todo lo de v15 + persistencia real en Supabase.

| Feature | Estado |
|---|---|
| Carga desde DB al iniciar (con fallback a CSV) | ✅ |
| createExecution → persiste en DB | ✅ |
| deleteExecution → persiste en DB | ✅ |
| updateExecution → persiste en DB | ✅ |
| closeTradeUnitManually → persiste en DB | ✅ |
| closeTradeUnitWithQuantity → persiste en DB | ✅ |
| deleteTradeUnit → persiste en DB | ✅ |
| addMemoryCashFlow → persiste en DB | ✅ |
| removeMemoryCashFlow → persiste en DB | ✅ |
| updateMemoryCashFlow → persiste en DB | ✅ |
| TypeScript 0 errores | ✅ |
| 42/42 tests | ✅ |
| Build limpio | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | `initializeFromDB()`, `isDBBacked` flag, memoryState |
| `src/server/actions/trades.ts` | ensureDataLoaded async (DB first), mutations con DB persist |
| `src/server/actions/dashboard.ts` | ensureDataLoaded async (DB first) |
| `src/server/actions/transactions.ts` | CashFlow CRUD con Prisma + sync memoria |
| `prisma/schema.prisma` | exchange_rate en Execution, cuenta en CashFlow, exitExecId en TradeUnit |
| `prisma/seed-v16.ts` | Seed completo: CSV FIFO → DB |

### Para arrancar una nueva sesión
```bash
# Asegurarse de que Supabase local está corriendo
supabase start   # si no está activo

# Matar servidores viejos (Windows)
taskkill /IM node.exe /F

npm run dev      # dev en :3000
npx tsc --noEmit # 0 errores
npm run test     # 42 tests
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Top:
1. **Brokers en CashFlowForm** — selects hardcodeados, debería usar `getMemoryBrokers()` — P2
2. **Sidebar lateral** — reemplazar nav horizontal — P3

---

## 22 de Marzo, 2026 — Estado actual tras sesión v11 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (executions, tradeUnits, cashFlows, cuentas, brokers)
- **Prisma (SQLite):** configurado pero inactivo.
- **Tests:** Vitest (42 unitarios + integración)

### Navegación (View type)
```typescript
type View = "dashboard" | "analytics" | "executions" | "trade-units" | "cuentas" | "brokers" | "nueva-exec" | "ie" | "movimientos";
```
- `cuentas`, `brokers`, `nueva-exec`, `ie` → no muestran FilterBar
- `movimientos` → muestra FilterBar
- Nav "Dep / Ret" → `movimientos` · "Nueva Exec." → `nueva-exec` · "Nuevo Dep/Ret" → `ie`

### Terminología actual (post-refactor v10)
- `Execution` (ex `Operation`): campos `qty`, `side`, `account`, `currency`, `commissions`
- `TradeUnit` (ex `Trade`): campos `qty`, `side`, `account`, `entryDate/exitDate`, `entryPrice/exitPrice`, `pnlNominal/pnlPercent`, `status: 'OPEN'|'CLOSED'`, `entryExecId`
- Clave de matching FIFO: `symbol::account::broker`
- Server actions: `getExecutions`, `getTradeUnits`, `createExecution`, `closeTradeUnitWithQuantity`, `closeTradeUnitManually`, `deleteTradeUnit`, `deleteExecution`, etc.

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×cuentas, CalendarGrid diario | ✅ |
| Dashboard: selector multi-año, multi-cuenta, Balance Total, Resultado Neto | ✅ |
| Analytics: 15+ métricas en español + tooltips + pie charts | ✅ |
| Ejecuciones con filtros DropdownMultiCheck | ✅ |
| TradeUnits: filtros Estado (default Abiertos) + Instrumento | ✅ |
| **TradeUnits: Agrupar por** (Símbolo/Cuenta/Broker con `allSelectsAll`) | ✅ |
| **Vista agrupada**: contenedor DataTable style, paginación, sub-filas con fechas | ✅ |
| **Vista desagrupada**: todas las columnas `text-zinc-400` | ✅ |
| **TradeForm**: `openTradeUnits` prop, matching por símbolo/broker/cuenta | ✅ |
| **TradeForm MANUAL**: tabla TUs + Cerrar + panel confirmación | ✅ |
| **TradeForm no-MANUAL**: tabla candidatos + panel preview "cerrarán estos Trades" | ✅ |
| **Fechas en formato `dd/MM/yyyy`** en todos los paneles de cierre | ✅ |
| **Timestamp real al cerrar** (HH:MM:SS del momento, no T12:00:00) | ✅ |
| Vista Movimientos: MetricCards + FilterBar + DataTable + Row-level Editing | ✅ |
| Cuentas CRUD, Brokers CRUD | ✅ |
| TypeScript sin errores (`npx tsc --noEmit`) | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: FIFO, memoryState, CRUD (executions, tradeUnits, cashFlows, cuentas, brokers) |
| `src/app/page.tsx` | UI principal — todas las vistas, navegación, handlers, tradeUnitColumns (text-zinc-400), vista agrupada |
| `src/server/actions/trades.ts` | getExecutions, getTradeUnits, createExecution, closeTradeUnitWithQuantity (timestamp real), closeTradeUnitManually (timestamp real) |
| `src/server/actions/dashboard.ts` | getStats, getYieldsData, getDashboardSummary, getTopStats, getEquityCurve |
| `src/server/actions/transactions.ts` | CashFlow CRUD + Cuentas + Brokers |
| `src/components/trades/TradeForm.tsx` | Form inline; `openTradeUnits` prop; matchingTUs; strategySortedTUs; MANUAL + non-MANUAL tables; preview panel |
| `src/components/ui/DropdownMultiCheck.tsx` | Filtro multi-check con props `allSelectsAll` y `noneLabel` |
| `src/components/ui/DataTable.tsx` | Tabla genérica + row-level editing |

### Convención de fechas (crítico)
**Nunca usar `new Date("YYYY-MM-DD")`** — parsea como UTC midnight → desplaza -1 día.
**Para parsear input de usuario/CSV:** `new Date(dateStr + 'T12:00:00')`.
**Para hora de cierre de trades:** `new Date(y, m-1, d, now.getH(), now.getM(), now.getS())` — usa el horario real.
**Para mostrar fechas:** `format(new Date(dateStr), 'dd/MM/yyyy')` (date-fns).

### Para arrancar una nueva sesión
```bash
taskkill /IM node.exe /F   # Windows: matar servidores viejos
npm run dev                 # dev en :3000
npx tsc --noEmit            # debe dar 0 errores
npm run test                # 42 tests
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Top:
1. **Brokers en CashFlowForm** — selects hardcodeados, debería usar `getMemoryBrokers()` — P2
2. **Sidebar lateral** — reemplazar nav horizontal — P3

---

## 21 de Marzo, 2026 — Estado actual tras sesión v9 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows, cuentas, brokers)
- **Prisma (SQLite):** configurado pero inactivo. Solo `transactions.ts` tiene funciones Prisma legacy sin usar.
- **Tests:** Vitest (unitarios + integración) + Playwright E2E

### Navegación (View type)
```typescript
type View = "dashboard" | "analytics" | "operations" | "trades" | "open" | "cuentas" | "brokers" | "nueva-op" | "ie" | "movimientos";
```
- `cuentas`, `brokers`, `nueva-op`, `ie` → no muestran FilterBar
- `movimientos` → muestra FilterBar (filtra cashFlows por período y búsqueda)
- Nav "Dep / Ret" → `movimientos` · Botón "Nuevo Dep/Ret" dentro de movimientos → `ie`
- `nueva-op` e `ie` renderizan el formulario inline (`inline={true}`)

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×cuentas, CalendarGrid diario | ✅ |
| Dashboard: selector multi-año, multi-cuenta, Balance Total, Resultado Neto | ✅ |
| Analytics: 15+ métricas en español + tooltips + pie charts | ✅ |
| Posiciones / Trades / Operaciones con filtros DropdownMultiCheck | ✅ |
| Nueva Op inline: cierre parcial FIFO cascade | ✅ |
| **Vista Movimientos**: MetricCards + FilterBar + DataTable (Depósitos/Retiros) | ✅ |
| **Row-level Editing en Movimientos**: todos los campos editables inline con validación | ✅ |
| **Terminología Depósitos/Retiros** en toda la UI | ✅ |
| CashFlow: campo `cuenta`, `updateCashFlow`, fix fecha T12:00:00 | ✅ |
| DataTable extendido: `editingRowId` / `renderEditRow` / `onCancelEdit` | ✅ |
| Cuentas CRUD, Brokers CRUD | ✅ |
| TypeScript sin errores (`npx tsc --noEmit`) | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: FIFO, memoryState, CRUD cashflows (add/remove/update), cuentas, brokers |
| `src/app/page.tsx` | UI principal — todas las vistas, navegación, handlers, filteredCashFlows, renderCashFlowEditRow |
| `src/server/actions/trades.ts` | getOpenPositions, closeTradeWithQuantity, CRUD operaciones |
| `src/server/actions/dashboard.ts` | getStats, getYieldsData, getDashboardSummary, getTopStats, getEquityCurve |
| `src/server/actions/transactions.ts` | CashFlow CRUD (add/remove/update) + Cuentas + Brokers server actions |
| `src/components/ui/DataTable.tsx` | Tabla genérica + row-level editing (editingRowId/renderEditRow/onCancelEdit) |
| `src/components/cashflow/CashFlowForm.tsx` | Formulario Depósito/Retiro inline |
| `src/components/dashboard/YieldsGrid.tsx` | Grilla mensual |
| `src/components/dashboard/CalendarGrid.tsx` | Grilla diaria |
| `src/components/trades/TradeForm.tsx` | Form inline, panel posiciones, pendingClose |

### Convención de fechas (crítico)
**Nunca usar `new Date("YYYY-MM-DD")`** — parsea como UTC midnight → desplaza -1 día en UTC negativo.
**Siempre:** `new Date(dateStr + 'T12:00:00')` → mediodía local, seguro en cualquier zona horaria.
**Serializar fechas de server actions:** `instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)`.

### Para arrancar una nueva sesión
```bash
taskkill /IM node.exe /F   # Windows: matar servidores viejos
npm run dev                 # dev en :3000
npx tsc --noEmit            # debe dar 0 errores
npm run test                # tests vitest
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Top:
1. **Brokers en CashFlowForm** — selects hardcodeados, debería usar `getMemoryBrokers()` — P2
2. **Tests para `closeTradeWithQuantity`** — casos parcial, exacto, cascade, exceso — P2
3. **Sidebar lateral** — reemplazar nav horizontal — P3

---

## 21 de Marzo, 2026 — Estado actual tras sesión v8 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows, cuentas, brokers)
- **Prisma (SQLite):** configurado pero inactivo. Solo `transactions.ts` tiene funciones Prisma legacy sin usar.
- **Tests:** Vitest (unitarios + integración) + Playwright E2E

### Navegación (View type)
```typescript
type View = "dashboard" | "analytics" | "operations" | "trades" | "open" | "cuentas" | "brokers" | "nueva-op" | "ie";
```
- `cuentas`, `brokers`, `nueva-op`, `ie` → no muestran FilterBar
- `nueva-op` e `ie` renderizan el formulario inline (`inline={true}`)

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×cuentas — columnas igual ancho, números es-AR, `PL $`/`PL %` | ✅ |
| Dashboard: CalendarGrid diario — semanas `Sem. N` ascendentes, `PL Mensual:` alineado derecha | ✅ |
| Dashboard: selector multi-año, modo "Todos" agrupa por año | ✅ |
| Dashboard: Resultado Neto + Balance Total, filtro de período sincronizado | ✅ |
| Analytics: 15+ métricas en español + tooltip al clic, pie charts | ✅ |
| Posiciones: filtro de período por openDate, cuenta real, broker/cuenta al final | ✅ |
| Trades: filtro de período por closeDate, trades abiertos inmunes | ✅ |
| Operaciones: broker/cuenta al final, filtros broker+cuenta DropdownMultiCheck | ✅ |
| Nueva Op (inline): panel posiciones abiertas, confirmación de cierre, cierre parcial FIFO cascade | ✅ |
| I/E (inline): Fecha, Monto, Tipo, Broker, Cuenta, Descripción | ✅ |
| Cuentas: CRUD completo inline | ✅ |
| Brokers: CRUD completo inline | ✅ |
| Fix fechas UTC: `T12:00:00` en todos los puntos de parseo | ✅ |
| TypeScript sin errores (`npx tsc --noEmit`) | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: FIFO, memoryState, CRUD cuentas/brokers/cashflows |
| `src/app/page.tsx` | UI principal — todas las vistas, navegación, handlers, `toDateStr` helper |
| `src/server/actions/trades.ts` | getOpenPositions, closeTradeWithQuantity, closeTradeManually, CRUD |
| `src/server/actions/dashboard.ts` | getStats, getYieldsData, getDashboardSummary, getTopStats, getEquityCurve |
| `src/server/actions/transactions.ts` | CashFlow + Cuentas + Brokers server actions |
| `src/components/dashboard/YieldsGrid.tsx` | Grilla mensual — table-fixed, colgroup, fmt es-AR |
| `src/components/dashboard/CalendarGrid.tsx` | Grilla diaria — weekNums precomputados, weekOffset |
| `src/components/trades/TradeForm.tsx` | Form inline, panel posiciones, pendingClose con openDate normalizado |

### Convención de fechas (crítico)
**Nunca usar `new Date("YYYY-MM-DD")`** — parsea como UTC midnight → desplaza -1 día en UTC negativo.
**Siempre:** `new Date(dateStr + 'T12:00:00')` → mediodía local, seguro en cualquier zona horaria.
**Serializar fechas de server actions:** objetos `Date` no son ISO strings. Usar `instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10)`.

### Para arrancar una nueva sesión
```bash
taskkill /IM node.exe /F   # Windows: matar servidores viejos
npm run dev                 # dev en :3000
npx tsc --noEmit            # debe dar 0 errores
npm run test                # tests vitest
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Top:
1. **Brokers en selects de TradeForm/CashFlowForm** desde `getMemoryBrokers()` — P2
2. **Tests para `closeTradeWithQuantity`** — casos parcial, exacto, cascade, exceso — P2
3. **Sidebar lateral** — reemplazar nav horizontal — P3

---

## 21 de Marzo, 2026 — Estado actual tras sesión v7 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows, cuentas, brokers)
- **Prisma (SQLite):** configurado pero inactivo. Solo `transactions.ts` tiene funciones Prisma legacy sin usar.
- **Tests:** Vitest (34 unitarios + integración) — pendiente actualizar tests de cierre manual

### Navegación (View type)
```typescript
type View = "dashboard" | "analytics" | "operations" | "trades" | "open" | "cuentas" | "brokers" | "nueva-op" | "ie";
```
- `cuentas`, `brokers`, `nueva-op`, `ie` → no muestran FilterBar
- `nueva-op` e `ie` renderizan el formulario inline (`inline={true}`)

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×cuentas, selector año, modo "Todos" agrupa por año | ✅ |
| Dashboard: Resultado Neto, filtro de período sincronizado con matriz | ✅ |
| Analytics: 15+ métricas en español + tooltip al hacer clic | ✅ |
| Analytics: Top 5, Mejor Mes, Mejor Trade filtrados por período | ✅ |
| Posiciones: filtro de período por openDate, cuenta real, broker/cuenta al final | ✅ |
| Trades: filtro de período por closeDate, trades abiertos inmunes | ✅ |
| Operaciones: broker/cuenta al final, filtro por broker | ✅ |
| Nueva Op (inline): cierre parcial FIFO con cascade y split | ✅ |
| I/E (inline): Fecha, Monto, Tipo, Broker, Cuenta, Descripción | ✅ |
| Cuentas: CRUD completo inline | ✅ |
| Brokers: CRUD completo inline | ✅ |
| TypeScript sin errores (`npx tsc --noEmit`) | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: FIFO, memoryState, CRUD cuentas/brokers/cashflows |
| `src/app/page.tsx` | UI principal — todas las vistas, navegación, handlers |
| `src/server/actions/trades.ts` | getOpenPositions (cuenta+date), closeTradeWithQuantity, resto CRUD |
| `src/server/actions/dashboard.ts` | getStats, getYieldsData, getDashboardSummary, getTopStats, getEquityCurve |
| `src/server/actions/transactions.ts` | CashFlow + Cuentas + Brokers server actions |
| `src/components/trades/TradeForm.tsx` | Form inline, panel posiciones abiertas, onClosePosition(id,qty,price,date) |
| `src/components/brokers/BrokersSection.tsx` | CRUD brokers (igual a CuentasSection) |

### Para arrancar una nueva sesión
```bash
taskkill /IM node.exe /F   # Windows: matar servidores viejos
npm run dev                 # dev en :3000
npx tsc --noEmit            # debe dar 0 errores
npm run test                # 34 tests
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Top:
1. Brokers en selects de TradeForm/CashFlowForm desde `getMemoryBrokers()` — P2
2. Tests para `closeTradeWithQuantity` — P2
3. Sidebar lateral — P3

---

## 20 de Marzo, 2026 — Estado actual tras sesión v4 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows)
- **Prisma (SQLite):** configurado en `prisma/schema.prisma`. Solo activo para `CashFlow` en `transactions.ts`. Operaciones y trades usan memoria.
- **Tests:** Vitest (34 unitarios + integración), Playwright (10 E2E)
- **CI:** `.github/workflows/ci.yml` — lint → typecheck → test → build → e2e

### Qué funciona hoy (estado verde)

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×brokers, selector año | ✅ |
| Dashboard: 4 MetricCards resumen, Top 5 Trades, Mejor Mes, Mejor Trade | ✅ |
| Analytics: 15+ métricas (Sharpe, Sortino, Kelly, SQN, etc.) | ✅ |
| Analytics: Curva de equity acumulada (sparkline SVG) | ✅ |
| Analytics: Rendimiento por instrumento (STOCK/CEDEAR/CRYPTO) | ✅ |
| Vista Operaciones: campos exactos requirements.md (ID, Fecha, Símbolo, Tipo, Cant, Precio, Monto, Broker, Falopa, Intra) | ✅ |
| Vista Operaciones: acciones Lupa/Lápiz/Papelera visibles (no solo hover) | ✅ |
| Vista Operaciones: filtro por Broker | ✅ |
| Vista Trades: campos exactos requirements.md (ID, F.Entrada, Símbolo, Cant, P.Entrada, M.Entrada, P.Salida, M.Salida, F.Salida, Días, Rdto$, Rdto%, TNA, Broker, Estado) | ✅ |
| Vista Trades: trades ABIERTOS con P.Salida=Yahoo Finance, F.Salida=hoy, Rdto/TNA calculados | ✅ |
| Vista Trades: filtros Estado (Abiertos/Cerrados/Todos) + Instrumento | ✅ |
| Vista Trades: acciones Lupa/Lápiz/Papelera (Delete vía deleteTrade server action) | ✅ |
| Vista Posiciones Abiertas: precios reales Yahoo Finance (cache 5 min) | ✅ |
| FilterBar: chips de período + rango personalizado (sin desmontar UI al cambiar) | ✅ |
| Alta de operación: form + pegado rápido + toggle BUY/SELL | ✅ |
| CloseTradeModal: selección operación apertura cuando hay 2+ BUY abiertas | ✅ |
| CashFlowForm: depósitos/retiros → memoryState → impacta I/E dashboard | ✅ |
| Exportar CSV desde DataTable (Operaciones y Trades) | ✅ |
| DataTable: paginación 25/50/100/Todos — resetea página al cambiar dataset | ✅ |
| ESLint guardrails (src/app y src/lib no importan @prisma/client ni @/server/**) | ✅ |
| 10/10 E2E Playwright | ✅ |
| Build limpio | ✅ |

### Modelo de datos clave

**Trade interface** (`src/lib/data-loader.ts`):
```typescript
interface Trade {
  id, symbol, quantity, openDate, openPrice, openAmount  // siempre presentes
  closeDate?, closePrice?, closeAmount?  // undefined si isClosed=false
  days, returnAmount, returnPercent, tna  // calculados (0 si abierto, real si cerrado)
  broker, instrumentType, isClosed: boolean, openOperationId?: number
}
```

**Flujo de trades abiertos:**
1. `initializeMemoryState` → FIFO loop → al final, itera `openInventory` y crea Trade con `isClosed: false`
2. `getTrades()` → detecta open trades → Yahoo Finance en paralelo → enriquece `closePrice/Amount/Date` + calcula `returnAmount/Percent/tna/days`
3. `closeTradeManually` → actualiza el Trade abierto **in-place** (no crea uno nuevo) → `isClosed: true`
4. Dashboard/Stats → siempre filtran `isClosed: true` antes de calcular métricas

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: parse CSV, FIFO + open trades, memoryState, getTopStats |
| `src/app/page.tsx` | UI principal "use client" — todas las vistas y server actions |
| `src/server/actions/trades.ts` | getOperations, getTrades (enriquecido), getOpenPositions, createOperation, deleteOperation, deleteTrade, closeTradeManually |
| `src/server/actions/dashboard.ts` | getStats, getYields, getDashboardSummary, getTopStats, getEquityCurve — solo trades cerrados |
| `src/server/actions/transactions.ts` | addMemoryCashFlow, removeMemoryCashFlow, getMemoryCashFlows |
| `src/lib/prices.ts` | getCurrentPrice, getCurrentPriceWithFallback — Yahoo Finance con cache 5 min |
| `src/components/ui/DataTable.tsx` | Tabla genérica: sort, paginación, acciones siempre visibles |
| `public/data/initial_operations.csv` | 325 filas, 2024-2026, múltiples símbolos y brokers |

### Para arrancar una nueva sesión
```bash
# Matar servidores viejos (IMPORTANTE en Windows)
taskkill /IM node.exe /F

# Iniciar
npm run dev          # dev server en :3000
npm run test         # 34 tests unitarios
npx playwright test  # 10 E2E tests
npm run build        # build de producción
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Resumen:
1. onEdit funcional con modal real (P2)
2. Mock Yahoo Finance para CI sin red (P2)
3. Sidebar lateral (P3)
4. Activar Prisma cuando haya DB (P3)

---

## 20 de Marzo, 2026 — Estado actual tras sesión v3 (referencia para próxima sesión)

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Motor de datos:** in-memory CSV → `src/lib/data-loader.ts` → `memoryState` (operations, trades, cashFlows)
- **Prisma (SQLite):** configurado en `prisma/schema.prisma`, `dev.db` existe. Solo activo para `CashFlow` en `transactions.ts`. Las operaciones y trades usan memoria.
- **Tests:** Vitest (34 unitarios + integración), Playwright (10 E2E)
- **CI:** `.github/workflows/ci.yml` — lint → typecheck → test → build → e2e

### Qué funciona hoy (estado verde)

| Feature | Estado |
|---|---|
| Dashboard: YieldsGrid meses×brokers, selector año | ✅ |
| Dashboard: 4 MetricCards resumen, Top 5 Trades | ✅ |
| Dashboard: Mejor Mes y Mejor Trade | ✅ |
| Analytics: 15+ métricas (Sharpe, Sortino, Kelly, SQN, etc.) | ✅ |
| Analytics: Curva de equity acumulada (sparkline SVG) | ✅ |
| Analytics: Rendimiento por instrumento (STOCK/CEDEAR/CRYPTO) | ✅ |
| Vista Operaciones: DataTable sortable + paginación + filtros Estado/Broker | ✅ |
| Vista Trades: DataTable sortable + paginación + filtro Instrumento | ✅ |
| Vista Posiciones Abiertas: precios reales Yahoo Finance (cache 5 min) | ✅ |
| FilterBar: chips de período + rango personalizado (sin desmontar UI al cambiar) | ✅ |
| Alta de operación: form + pegado rápido + toggle BUY/SELL | ✅ |
| CloseTradeModal: selección de operación apertura cuando hay 2+ BUY abiertas | ✅ |
| CashFlowForm: depósitos/retiros → memoryState → impacta I/E dashboard | ✅ |
| Exportar CSV desde DataTable (Operaciones y Trades) | ✅ |
| Selector instrumentType en TradeForm (STOCK/CEDEAR/CRYPTO) | ✅ |
| deleteOperation conectado en DataTable | ✅ |
| ESLint guardrails (src/app y src/lib no importan @prisma/client ni @/server/**) | ✅ |
| 10/10 E2E Playwright | ✅ |
| Build limpio | ✅ |

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/lib/data-loader.ts` | Motor central: parse CSV, FIFO, memoryState, addCashFlow, resetMemoryState, USE_DB flag |
| `src/app/page.tsx` | UI principal "use client" — orquesta todas las vistas y server actions |
| `src/server/actions/trades.ts` | getOperations, getTrades, getOpenPositions (Yahoo Finance), createOperation, deleteOperation, updateOperation, closeTradeManually |
| `src/server/actions/dashboard.ts` | getStats, getYields, getDashboardSummary, getTopStats, getEquityCurve |
| `src/server/actions/transactions.ts` | addMemoryCashFlow, removeMemoryCashFlow, getMemoryCashFlows (+ funciones Prisma legacy) |
| `src/lib/prices.ts` | getCurrentPrice, getCurrentPriceWithFallback — Yahoo Finance real con cache 5 min |
| `src/lib/csv-exporter.ts` | exportToCSV, downloadCSV — utilidad cliente pura |
| `src/lib/validations.ts` | Zod schemas para formularios |
| `src/components/trades/CloseTradeModal.tsx` | Modal selección operación apertura |
| `src/components/cashflow/CashFlowForm.tsx` | Form depósitos/retiros |
| `src/components/ui/DataTable.tsx` | Tabla genérica con sort, paginación, acciones, onExport |
| `src/components/ui/FilterBar.tsx` | Chips período, rango personalizado, búsqueda |
| `public/data/initial_operations.csv` | 238 filas, 2024-2026, 11 símbolos, 3 brokers |
| `docs/Funcionalidades.md` | Listado completo de features implementadas |
| `docs/ACTIVAR-BD.md` | Guía para activar Prisma (cambiar USE_DB=true) |
| `prisma/schema.prisma` | Schema Prisma con Operation, Trade, CashFlow |

### Para arrancar una nueva sesión
```bash
# Matar servidores viejos (IMPORTANTE en Windows)
taskkill /IM node.exe /F

# Iniciar
npm run dev          # dev server en :3000
npm run test         # 34 tests unitarios
npx playwright test  # 10 E2E tests
npm run build        # build de producción
```

### Pendientes para próxima sesión
Ver `bitacora/pendientes.md`. Resumen:
1. Sidebar lateral fijo (P3)
2. onEdit y onView funcionales en DataTable (P2)
3. Mock de Yahoo Finance para CI sin red (P2)
4. Activar Prisma para operaciones cuando haya DB (P3)

---

## 20 de Marzo, 2026 — Estado actual tras orquestación multi-agente

**Estado del Proyecto:** Prototipo funcional completo con QA básico implementado.

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard con YieldsGrid (filas=meses, cols=brokers) | ✅ |
| Analytics con 15+ métricas (Sharpe, Sortino, Drawdown, etc.) | ✅ |
| Vista Trades con DataTable sortable + paginación | ✅ |
| Vista Operaciones con DataTable sortable + paginación | ✅ |
| Vista Posiciones Abiertas con P&L latente | ✅ |
| Top 5 Trades en dashboard | ✅ |
| 4 MetricCards de resumen en dashboard | ✅ |
| FilterBar con chips de período + rango personalizado | ✅ |
| Alta de operación — formulario + pegado rápido | ✅ |
| Toggle BUY/SELL en formulario | ✅ |
| Parser de texto (operation-parser) | ✅ |
| Cierre manual de trade (closeTradeManually) | ✅ (backend) |
| CSV 238 filas / 2 años de datos | ✅ |
| ESLint guardrails (UI no toca DB) | ✅ |
| Tests unitarios (13 tests, 2 archivos) | ✅ |
| CI GitHub Actions | ✅ |
| Build limpio | ✅ |

### Pendientes para próxima sesión

Ver `pendientes.md` para el detalle completo.

### Arquitectura
- **Motor de datos:** in-memory (CSV → `data-loader.ts` → `memoryState`). Sin Prisma activo para operaciones.
- **Prisma:** solo usado para `CashFlow` via `transactions.ts`. Schema OK pero sin conexión activa.
- **Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS, Vitest, Playwright (pendiente configurar).

---

# Contexto de Sesión - Gestión de Inversiones (19 de Marzo, 2026 — histórico)
**Fecha:** 19 de Marzo, 2026
**Estado del Proyecto:** Prototipo Funcional de Alta Fidelidad (Modo Memoria/CSV)

## Arquitectura Actual
- **Motor de Datos:** El sistema opera en "Modo Demo" (sin base de datos física) utilizando `src/lib/data-loader.ts` como estado en memoria. 
- **Carga Inicial:** Se lee el CSV `public/data/initial_operations.csv` en el servidor (`Server Actions`) y se procesa mediante lógica FIFO para reconstruir trades.
- **Vistas Implementadas:** 
    - **Dashboard:** Grilla invertida (Filas=Meses, Columnas=Brokers + Totales).
    - **Analytics:** 15+ métricas avanzadas (Sharpe, Sortino, Drawdown, etc.) configurables por período.
    - **Posiciones:** Listado de operaciones abiertas (BUY sin contraparte SELL).
    - **Trades:** Historial de operaciones cerradas con métricas de rendimiento (TNA, P&L %, Días).
    - **Operaciones:** Registro crudo de todas las transacciones BUY/SELL.

## Pendientes / Siguiente Hito
- **Persistencia Real:** El esquema de Prisma está listo (`schema.prisma` actualizado con `CashFlow` y `remainingQty`), pero la conexión está pausada por solicitud del usuario.
- **Funcionalidad de Edición/Eliminado:** Implementar las acciones de la columna "ACCIONES" en los listados.
- **Ingresos/Egresos Manuales:** Añadir formulario para cargar depósitos y retiros manualmente al `memoryState`.

## Configuración de Entorno
- **Framework:** Next.js 15 (App Router).
- **Estilo:** Tailwind CSS (Glassmorphism / Dark Mode).
- **Lógica de Fechas:** `date-fns`.
