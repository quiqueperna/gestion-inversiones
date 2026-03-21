# Contexto de Sesión - Gestión de Inversiones

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

# Contexto de Sesión - Gestión de Inversiones
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
