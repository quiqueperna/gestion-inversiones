# Contexto de Sesión - Gestión de Inversiones

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
