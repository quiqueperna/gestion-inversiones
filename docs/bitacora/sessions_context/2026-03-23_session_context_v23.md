# Contexto de Sesión - Gestión de Inversiones

## 23 de Marzo, 2026 — Estado actual tras sesión v23 (referencia para próxima sesión)

---

### Stack
- **Next.js 15** App Router, TypeScript strict, Tailwind CSS dark glassmorphism
- **Backend:** Supabase PostgreSQL + Prisma ORM
- **Testing:** Vitest (42 tests, 4 archivos)
- **Deploy:** Vercel (serverless)

---

### Navegación (View type)
```ts
type View =
  | 'dashboard'
  | 'trades'
  | 'analytics'
  | 'cashflow'
  | 'online'
  | 'configuracion'
  | 'importar-csv'
```

---

### Terminología actual
| Término | Entidad DB |
|---|---|
| Execution | `Execution` — ejecución individual (BUY/SELL) |
| TradeUnit | `TradeUnit` — trade completo (entry+exit match) |
| CashFlow | `CashFlow` — movimiento de efectivo (depósito/retiro) |
| Account | `Account` — cuenta (USA, Argentina, CRYPTO…) con estrategia |
| Broker | `Broker` — broker (Schwab, Binance…) |

---

### Qué funciona hoy

| Feature | Estado |
|---|---|
| Dashboard (grilla rendimientos, métricas, calendario) | ✅ |
| Listado de Trades con filtros, agrupación, paginación | ✅ |
| Formulario nueva ejecución (TradeForm) — FIFO/LIFO/MAX/MIN/MANUAL | ✅ |
| Cierre manual de TradeUnit | ✅ |
| Analytics con estadísticas | ✅ |
| CashFlow CRUD + filtros | ✅ |
| Pantalla Online (estado sistema) | ✅ |
| Configuraciones (Cuentas + Brokers CRUD) | ✅ |
| **Importar CSV** — upload drag-drop → preview → MANUAL → confirm | ✅ |
| CSV parser (TSV/CSV autodetect, validación broker/cuenta) | ✅ |
| Simulador de trades (`trade-simulator.ts`) — FIFO/LIFO/MAX/MIN/MANUAL | ✅ |
| `previewBulkImport` / `confirmBulkImportWithTrades` server actions | ✅ |
| Tablas ordenables por cualquier columna (`useSortable<T>` hook) | ✅ |
| Estrategia como leyenda general en tabla trades | ✅ |
| Combos Broker/Cuenta cargados desde BD (no hardcodeados) | ✅ |

---

### Archivos clave

| Archivo | Rol |
|---|---|
| `src/app/page.tsx` | Entrypoint, routing de views, props a componentes |
| `src/lib/csv-import.ts` | Parser CSV/TSV, ParsedRow, validación broker/cuenta |
| `src/lib/trade-simulator.ts` | Motor puro de matching FIFO/LIFO/MAX/MIN/MANUAL |
| `src/server/actions/trades.ts` | Server actions: CRUD trades, previewBulkImport, confirmBulkImportWithTrades |
| `src/server/actions/transactions.ts` | Server actions: CashFlow, Accounts, Brokers |
| `src/server/actions/dashboard.ts` | Server action: métricas dashboard |
| `src/lib/data-loader.ts` | initializeFromDB, memoryState singleton |
| `src/components/trades/ImportCSVView.tsx` | UI importación CSV (5 pasos) |
| `src/components/trades/TradeForm.tsx` | Formulario nueva ejecución |
| `prisma/schema.prisma` | Modelo de datos |

---

### Estado de tablas ImportCSV (v23)

**Tabla ejecuciones a importar:**
`ID · Fecha Entrada · Símbolo · Lado · Cantidad · Precio · Broker · Cuenta`

**Tabla trades generados:**
`F.Entrada · Símbolo · Lado · Cantidad · P.Entrada · P.Salida · F.Salida · Días · PnL$ · PnL% · TNA · Estado · Broker · Cuenta`

**Tabla candidatos MANUAL:**
`(radio) · Fecha y Hora · Símbolo · Cantidad · Precio · PnL Est.`
- Filtro: solo candidatos con `date <= sellDate`

---

### Para arrancar una nueva sesión
```bash
supabase start
taskkill /IM node.exe /F
npm run dev
npx tsc --noEmit  # debe dar 0 errores
npm run test      # 42 tests deben pasar
```

---

### Pendientes para próxima sesión

| Prioridad | Tarea |
|---|---|
| P3 | Sidebar lateral de navegación |
