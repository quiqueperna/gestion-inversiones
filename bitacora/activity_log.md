# Bitácora de Acciones

---

## 21 de Marzo, 2026 — Sesión v7: Brokers CRUD, cierre parcial FIFO, Analytics en español, fix filtros

### Contexto
Sesión retomada desde contexto comprimido. Se implementaron todas las funcionalidades pendientes de la sesión anterior (v6) que no habían sido escritas, más la corrección de un bug de filtros de período.

### Lo hecho

**Pantalla de Brokers (CRUD completo)**
- Agregada interface `Broker` a `data-loader.ts` + `brokers: Broker[]` al `memoryState`.
- Pre-cargados 8 brokers: Schwab, Binance, Cocos, Balanz, AMR, IOL, IBKR, PP.
- Funciones `getBrokers / addBroker / updateBroker / removeBroker` en `data-loader.ts`.
- Server actions equivalentes en `transactions.ts`.
- Creado `src/components/brokers/BrokersSection.tsx` (copia exacta de CuentasSection).
- Añadido "Brokers" al nav y vista `brokers` en `page.tsx`.
- Estado `brokers` cargado en `fetchData` junto al resto de datos.

**Cierre parcial FIFO (`closeTradeWithQuantity`)**
- Nueva server action en `trades.ts` que reemplaza a `closeTradeManually` en el flujo de cierre desde TradeForm.
- Lógica cascade:
  - `qty == remainingQty del op` → cierre total normal.
  - `qty < remainingQty` → cierra con esa cantidad, crea nueva operación abierta con el remanente, redirige el open trade record al nuevo op.
  - `qty > remainingQty` → consume ese op, continúa en FIFO con el siguiente open op del mismo símbolo.
  - Si queda exceso tras agotar todos los open ops → crea una operación SELL abierta con el excedente.
- `TradeForm.onClosePosition` actualizado a `(id, quantity, price, date)` — pasa los valores del formulario en el momento del clic.
- `handleClosePosition` en `page.tsx` usa los parámetros del formulario en vez del precio de mercado.

**Open Positions — campo `cuenta` y `date`**
- `getOpenPositions()` ahora devuelve `cuenta: op.cuenta || 'USA'` y `date: op.date` por cada posición.
- Columnas broker/cuenta movidas al extremo derecho de la tabla de posiciones abiertas.
- `openPage` se resetea a 1 cuando cambia `searchQuery`.
- Acceso seguro con `?.` en campos del table row.

**Analytics — nombres en español + tooltips**
- MetricCards renombradas: "Tasa de Victorias", "Tamaño Promedio".
- Tarjetas grandes: "Tasa de Victorias", "Factor de Beneficio", "Drawdown Máximo".
- 15 métricas pequeñas en español: Ratio de Sharpe, Ratio de Sortino, Expectativa, Factor de Recuperación, SQN, Criterio de Kelly, Ganancia Promedio, Pérdida Promedio, Ratio G/P, Mayor Ganancia, Mayor Pérdida, Racha Ganadora, Racha Perdedora, Tiempo Promedio, Comisiones.
- Clic en cualquier métrica → toggle descripción debajo del valor (`activeTooltip` state).

**Fix filtro de período (Trades y Posiciones)**
- Bug: `if (view !== "open" && !inRange) return false` hacía que el filtro de fecha nunca se aplicara a posiciones abiertas.
- Corrección: reescrito el bloque de filtro a `const isOpenTrade = view === 'trades' && !item.isClosed; if (!isOpenTrade) { ... if (!isWithinInterval(...)) return false; }`.
- El filtro ahora aplica a posiciones (por `openDate`), a trades cerrados (por `closeDate`) y a operaciones (por `date`). Solo los trades abiertos en la vista Trades siguen siendo inmunes al filtro de fecha.

### TypeScript
- `npx tsc --noEmit` → ✅ sin errores

## 20 de Marzo, 2026 — Sesión v4: Alineación con requirements.md y trades abiertos

### Contexto
Sesión de corrección profunda del modelo de datos y la UI para alinear estrictamente con `requirements.md`, `core.md` y `UI-Behavior.md`. Se retomó desde un contexto comprimido (resumen de sesión anterior).

### Lo hecho

**Re-lectura de documentación y análisis de brechas**
- Releídos `docs/domain/requirements.md`, `docs/domain/core.md`, `docs/ui/UI-Behavior.md`, `docs/ui/UI-List.md`.
- Identificadas brechas: Trade interface sin `isClosed`, Operations sin `isFalopa`/`isIntra`, Trades sin orden correcto de columnas, ausencia de trades abiertos en la tabla de Trades.

**Back-end: Trade interface y FIFO abiertos**
- Agregados `isClosed: boolean` y `openOperationId?: number` a la interface `Trade`.
- `closeDate`, `closePrice`, `closeAmount` marcados como opcionales para soportar trades abiertos.
- `initializeMemoryState`: después del loop FIFO, itera `openInventory` y crea registros `Trade` con `isClosed: false` para cada BUY sin contraparte.
- `closeTradeManually`: actualiza el trade abierto existente en-place (en vez de crear uno nuevo) para mantener el conteo correcto.
- `deleteTrade(id)`: nueva server action para eliminar un trade del estado en memoria.

**Back-end: getTrades() con Yahoo Finance para trades abiertos**
- `getTrades()` detecta trades con `isClosed: false`, llama `getCurrentPriceWithFallback()` en paralelo, y enriquece con: `closePrice` (precio actual), `closeAmount`, `closeDate` (hoy), `days`, `returnAmount`, `returnPercent`, `tna`.

**Back-end: dashboard.ts — solo trades cerrados en estadísticas**
- `getYieldsData`, `getStats`, `getDashboardSummary`, `getEquityCurve`: filtran `isClosed: true` antes de calcular métricas. Los trades abiertos no distorsionan P&L ni equity curve.

**Front-end: columnas corregidas (requirements.md)**
- Operations: ID, Fecha, Símbolo, Tipo, Cantidad, Precio, Monto, Broker, Falopa, Intra — exactamente los campos del requirements, sin P.Salida/F.Salida/Estado.
- Trades: ID, F.Entrada, Símbolo, Cantidad, P.Entrada, M.Entrada, P.Salida, M.Salida, F.Salida, Días, Rdto $, Rdto %, TNA, Broker, Estado.
- Todos los campos opcionales de trades abiertos muestran "—" cuando son null.

**Front-end: acciones siempre visibles**
- Quitado `opacity-0 group-hover:opacity-100` en DataTable — las acciones (Lupa/Lápiz/Papelera) siempre visibles.
- Operaciones: onView (alert detalle), onEdit (placeholder), onDelete (funcional).
- Trades: onView (alert detalle), onEdit (placeholder), onDelete (vía `deleteTrade`).

**Front-end: filtros**
- Eliminado filtro Estado de Operaciones (no aplica según requirements).
- Agregado filtro Estado (Todos/Abiertos/Cerrados) en Trades, junto al filtro de Instrumento.
- Trades abiertos excluidos del filtro de fecha (siempre se muestran, son posiciones vigentes).

**DataTable: paginación**
- Agregado `useEffect(() => setPage(1), [data])` — resetea a página 1 cuando cambia el dataset.

### Resultado final
- `npm run typecheck` → ✅
- `npm run lint` → ✅
- `npm run test` → ✅ 34/34

---

## 20 de Marzo, 2026 — Sesión v3: Estabilización, E2E y fix de loading

### Contexto
Sesión de corrección y verificación posterior al despliegue de los 4 agentes v2. Se encontraron y corrigieron bugs en runtime y en los tests E2E. La app pasó de 0/10 a 10/10 E2E tests en verde.

### Lo hecho

**Bug 1 — Unused prop `broker` en CloseTradeModal**
- `broker: string` estaba en la interface y en el destructuring pero nunca se usaba en el JSX.
- Eliminado del destructuring para que pase ESLint `no-unused-vars`.

**Bug 2 — Servidor viejo en puerto 3000 causando "500 / r00 internal server error"**
- PID 15488 (luego PID 360) tenía un servidor Next.js con código de sesiones anteriores corriendo en puerto 3000.
- El nuevo `npm run dev` arrancaba en 3001/3002/etc. pero el usuario abría :3000 en el browser.
- Diagnosticado testeando los server action IDs directamente vía `curl`. Todos los read-only actions retornan 200.
- Solución: `taskkill /IM node.exe /F` + reiniciar `npm run dev`.

**Bug 3 — FilterBar popover: label sin `htmlFor` rompía test E2E**
- El test `getByLabel(/Desde/i)` buscaba un input asociado via `for`/`id`.
- Los labels en el popover custom no tenían `htmlFor` ni los inputs tenían `id`.
- Arreglado agregando `htmlFor="custom-range-start"` / `id="custom-range-start"` y equivalente para "Hasta".
- El test se actualizó a `page.locator('#custom-range-start')`.

**Bug 4 — Spinner de carga unmontaba FilterBar y cerraba el popover**
- Al cambiar el filtro de período a "Personalizado", `dateFilter` cambiaba → `activeInterval` cambiaba → `useEffect` disparaba `fetchData()` → `setLoading(true)` → la página retornaba solo el spinner (unmount total) → el popover desaparecía.
- Separado el concepto de carga inicial (`loading`) vs re-fetch (`refreshing`).
- `isFirstLoad` ref trackea si es el primer montaje.
- Re-fetches muestran un `RefreshCw` spinner pequeño en la navbar sin desmontar la UI.

**Verificación E2E completa con Playwright**
- Corrido test de diagnóstico navegando por las 5 vistas: Dashboard, Analytics, Posiciones, Trades, Operaciones.
- 0 errores en consola, 0 respuestas HTTP >= 400.
- 10/10 E2E tests verdes: 4 dashboard + 3 operations + 3 trades.

### Resultado final
- `npm run lint` → ✅
- `npm run typecheck` → ✅
- `npm run test` → ✅ 34/34 unitarios + integración
- `npm run build` → ✅
- `npx playwright test` → ✅ **10/10 E2E**

---

## 20 de Marzo, 2026 — Sesión v2: Completar Pendientes

### Contexto
Segunda ronda de orquestación multi-agente (v2). Se leyó `pendientes.md` y se ejecutaron los 4 agentes del orquestador v2 en el orden definido. Todos los pendientes P1/P2/P3 fueron implementados.

### Lo implementado

**Lógica/API (Agente 02)**
- `src/lib/data-loader.ts`: agregados `resetMemoryState()`, `addCashFlow()`, `removeCashFlow()`, flag `USE_DB`.
- `src/server/actions/transactions.ts`: agregadas `addMemoryCashFlow()`, `removeMemoryCashFlow()`, `getMemoryCashFlows()` — CashFlow sobre memoryState (sin Prisma).
- `src/server/actions/trades.ts`: agregada `updateOperation(id, data)` — Object.assign con recálculo de amount.
- `src/server/actions/dashboard.ts`: agregada `getEquityCurve()` — serie temporal de equity acumulada.
- `src/lib/csv-exporter.ts`: creado — `exportToCSV<T>()` y `downloadCSV()` para exportación lado-cliente.
- `docs/Funcionalidades.md`: creado — listado completo de todas las funcionalidades implementadas.
- `docs/ACTIVAR-BD.md`: creado — guía paso a paso para habilitar Prisma.

**Infraestructura (Agente 01)**
- `src/lib/prices.ts`: reemplazado mock aleatorio por Yahoo Finance real (`query1.finance.yahoo.com/v8/finance/chart/{symbol}`). Cache en memoria de 5 min, AbortController timeout 5s, fallback silencioso a `null`.
- `getCurrentPriceWithFallback()`: intenta símbolo directo, luego `{symbol}.BA` para CEDEARs.
- `src/server/actions/trades.ts` — `getOpenPositions()`: refactorizado con `Promise.all` para fetches paralelos. Fallback a precio de entrada si Yahoo devuelve `null`.

**UI/UX (Agente 03)**
- `src/components/trades/CloseTradeModal.tsx`: creado — modal de selección de operación de apertura cuando hay 2+ BUY abiertas del mismo símbolo. Muestra rendimiento proyectado por fila, fila seleccionada resaltada, botón Confirmar activo solo con selección.
- `src/components/cashflow/CashFlowForm.tsx`: creado — formulario de depósitos/retiros. Toggle DEPOSIT/WITHDRAWAL, campos fecha/monto/broker/descripción.
- `src/components/ui/DataTable.tsx`: agregada prop `onExport?: () => void` y botón Download CSV.
- `src/lib/validations.ts`: agregado `instrumentType: z.enum(["STOCK","CEDEAR","CRYPTO"]).default("STOCK")`.
- `src/components/trades/TradeForm.tsx`: agregado selector de `instrumentType`.
- `src/app/page.tsx`: refactorizado completo — nuevos estados (`showCashFlowForm`, `closeModalData`, `equityCurve`, `estadoFilter`, `brokerFilter`, `instrumentFilter`), handlers funcionales para delete/edit/export, filtros por estado/broker/instrumento, tarjetas Mejor Mes/Mejor Trade, curva de equity en Analytics, botón I/E en navbar.

**QA (Agente 04)**
- `src/server/actions/__tests__/dashboard.test.ts`: tests de integración para `getStats`, `getDashboardSummary`, `getTopStats`.
- `src/server/actions/__tests__/trades.test.ts`: tests de integración para `closeTradeManually`, `deleteOperation`.
- `src/lib/__tests__/operation-parser.test.ts`: 5 casos de regresión adicionales.
- `playwright.config.ts`: configurado para E2E con Chromium, baseURL localhost:3000, webServer auto-start.
- `e2e/dashboard.spec.ts`, `e2e/operations.spec.ts`: specs E2E de flujos principales.
- `.github/workflows/ci.yml`: job `e2e` agregado al pipeline.

### Resultado final
- `npm run lint` → ✅ ok (no errors) — corregido unused `broker` en CloseTradeModal
- `npm run typecheck` → ✅ sin errores
- `npm run test` → ✅ 34/34 passed
- `npm run build` → ✅ ok (no errors)

---

## 20 de Marzo, 2026 — Sesión de Orquestación Multi-Agente

### Contexto
Se implementó un sistema de desarrollo orquestado con 4 agentes especializados (Infra/DB, Lógica/API, UI/UX, QA) generando archivos de misión en `/docs/missions/`. El orquestador analizó el estado real del proyecto y delegó en paralelo.

### Lo implementado

**Infraestructura y datos (Agente 01/02)**
- CSV `public/data/initial_operations.csv` reemplazado: 238 filas, rango 2024-03-01 a 2026-03-15, ~110 trades cerrados + 18 posiciones abiertas, mix de símbolos USA/CEDEAR, brokers IBKR/AMR/IOL.
- `src/lib/operation-parser.ts` creado: parser de texto para pegado rápido, 2 formatos (libre y clave=valor), detecta símbolo, tipo, precio, cantidad, fecha, broker.
- `src/lib/data-loader.ts`: agregada función `getTopStats()` — top 5 trades, mejor mes, mejor % de retorno, rendimiento por instrumento, resumen de posiciones abiertas.
- `src/server/actions/dashboard.ts`: agregadas `getTopStats()` y `getDashboardSummary()` — conteos de operaciones, capital invertido, positividad de trades.
- `src/server/actions/trades.ts`: agregadas `getOpenOperationsForClosing()` y `closeTradeManually()` — lógica de cierre manual eligiendo la operación de apertura.
- Bug crítico corregido: `payoffRatio` faltaba en el retorno de `getStats()` y `createEmptyStats()`, causando crash en la vista Analytics.
- `src/lib/validations.ts`: `tradeSchema` reescrito para coincidir con los campos del formulario (`entryDate`, `entryPrice`, `exitPrice`, `type`, etc.).

**UI/UX (Agente 03)**
- `src/components/ui/MetricCard.tsx` creado: tarjeta reutilizable con 6 colores de acento, gradiente, ícono fantasma, border-top de color.
- `src/components/ui/DataTable.tsx` creado: tabla genérica con sort ↕ por cualquier columna, paginación (25/50/100/Todos), acciones por fila (Lupa/Lápiz/Papelera) visibles en hover.
- `src/components/ui/FilterBar.tsx` creado: chips de período, rango personalizado con popover, búsqueda full-width con ícono lupa, slot `extraFilters`.
- `TradeForm.tsx` mejorado: toggle BUY/SELL (verde/rojo), broker cambiado de input libre a select (AMR/IOL/IBKR/PP).
- `page.tsx` refactorizado: usa `FilterBar`, `DataTable` con columnas tipadas y renders semánticos (verde/rojo para P&L), 4 `MetricCard` de resumen en el dashboard, tabla Top 5 Trades.

**QA y Estándares (Agente 04)**
- `eslint.config.mjs` creado: guardrails que bloquean imports de `@prisma/client` desde `src/app/**` y `src/lib/**`.
- `vitest.config.ts` creado: entorno node, globals, alias `@/`.
- `src/lib/__tests__/calculations.test.ts`: 5 tests unitarios para `calculateTradeMetrics`.
- `src/lib/__tests__/operation-parser.test.ts`: 8 tests unitarios para `parseOperationText`.
- `.github/workflows/ci.yml` creado: pipeline lint → typecheck → test → build en Node 22.
- `package.json`: scripts `db:seed` y `test:watch` agregados, `ts-node` agregado a devDependencies.

### Resultado final
- `npm run build` → ✅ ok (no errors)
- `npm run test` → ✅ 13/13 passed
- `npm run typecheck` → ✅ sin errores
- `npm run lint` → ✅ sin warnings ni errores

---

## 19 de Marzo, 2026 (Tercera Sesión)

### Iteración 1
- **Prompt:** "podes retomar lo que estabas haciendo?"
- **Resultado:**
    - Se identificó la necesidad de avanzar hacia la persistencia real.
    - Se configuró SQLite como base de datos local y se actualizó `prisma/schema.prisma`.
    - Se creó un script de seed para importar los datos del CSV a la base de datos.
    - Se refactorizaron las `Server Actions` para usar Prisma y se conectó la UI de `page.tsx` con estas acciones.

### Iteración 2 (Correcciones Críticas)
- **Prompt:** "Lee toda la documentacion que esta en /docs y /bitacora e implementa todo lo que te falte... No siguio bien los campos que debia mostrar en los listados. lee nuevamente core.md, no estás respetando los requerimientos... Te pedí que implementes ideas de estadísticas y no lo hiciste. Implementa por lo menos 15 más buscando lo que puede ser útil para un trader... En el dashboard diseñar las grillas al revés, es decir, los meses por filas columnas de matrices por columnas... No se ven en el dashboard las distinciones por periodos, ni años, ni días... No hay cargados trades que hayan quedado abiertos, ni operaciones acumuladas sin contraparte... Tampoco estan los ingresos egresos contemplados ni para la carga ni para el dashboard ni estadísticas... Tampoco implementaste las ganancias totales por instrumentos... - Las estadisticas de \"Analytics\" son totales y no puedo generarlas en un periodo de tiempo configurable... No muestra los totales en cada columna en el dashboard."
- **Resultado:**
    - **Dashboard Reconstruido:** Filas=Meses, Columnas=Brokers, con totales verticales (footer) y horizontales.
    - **Estadísticas Avanzadas:** 15+ métricas en `Analytics` (Sharpe, Sortino, Drawdown, SQN, Kelly, Streaks, etc.) filtrables por período.
    - **Posiciones Abiertas:** Nueva vista "Posiciones" que detecta y valoriza operaciones `BUY` sin cierre (FIFO parcial).
    - **CashFlow:** Modelo de datos para Ingresos/Egresos y visualización en columna "I/E" del Dashboard.
    - **Refactorización de Listados:** Inclusión de todos los campos de `core.md` (TNA, Cantidad, Días, Precios, etc.) en tablas dedicadas.

### Iteración 3 (Cambio a Modo Demo/Memoria)
- **Prompt:** "pausa la bd x que no la tengo instalada, la quiero usar con los datos de pruebas del csv."
- **Resultado:**
    - Se "pausó" el uso de Prisma y la base de datos física.
    - Se refactorizó `src/lib/data-loader.ts` para actuar como motor de datos en memoria (`memoryState`).
    - Se actualizaron todas las `Server Actions` para leer el CSV desde disco y operar sobre el estado efímero.
    - Se preservaron todas las funcionalidades (métricas avanzadas, grilla invertida, posiciones abiertas) funcionando exclusivamente en memoria.

## 18 de Marzo, 2026 (Segunda Sesión)

- **Infraestructura de Datos Real**:
    - Se configuró SQLite como base de datos local para desarrollo mediante Prisma.
    - Se creó un script de migración (`prisma/seed-csv.ts`) que importa automáticamente los datos históricos del CSV a la base de datos, ejecutando la lógica FIFO para reconstruir los trades.
- **Persistencia en Server Actions**:
    - Se refactorizaron `src/server/actions/trades.ts` y `src/server/actions/dashboard.ts` para operar directamente sobre la base de datos usando Prisma.
    - Se implementó la lógica FIFO en el servidor: al crear una operación de venta (`SELL`), el sistema busca y cierra automáticamente las posiciones abiertas correspondientes.
- **Integración Completa de UI**:
    - Se conectó `src/app/page.tsx` con el backend persistente, eliminando la dependencia del archivo CSV.
    - Se habilitó el modal de **Nueva Operación**, permitiendo la entrada de datos reales que se persisten en la base de datos.
    - Se optimizó la carga de datos mediante `Promise.all` y se aseguró la revalidación de caché de Next.js (`revalidatePath`).
- **Calidad y Tipado**:
    - Se resolvieron conflictos de tipos y se eliminaron importaciones redundantes de la arquitectura anterior.

## 18 de Marzo, 2026 (Segunda Sesión)
- **Infraestructura de Datos**: Se actualizó `prisma/schema.prisma` con el modelo `Trade`, incluyendo campos financieros (entryPrice, exitPrice, etc.) e índices para optimización de consultas.
- **Backend (Server Actions)**: 
    - Se implementó un CRUD completo en `src/server/actions/trades.ts` para la gestión de operaciones.
    - Se creó la lógica de agregación en `src/server/actions/dashboard.ts` para generar el reporte de rendimientos mensuales por cuenta.
- **Cálculos Financieros**: Se actualizó `src/lib/calculations.ts` para calcular automáticamente montos, retornos, días de operación y TNA, con soporte para operaciones abiertas usando precios actuales simulados.
- **Formulario Avanzado**: Se desarrolló `src/components/trades/TradeForm.tsx` con soporte para validación Zod (`react-hook-form`), gestión de estados (Abierta/Cerrada) y un **Modo de Pegado Rápido** que parsea strings de operaciones.
- **Dashboard de Rendimientos**: Se implementó `src/components/dashboard/YieldsGrid.tsx`, una grilla de alta densidad que muestra PL USD, PL % y conteo de trades por mes y cuenta, con totales automáticos.
- **Integración y UI**: 
    - Se rediseñó `src/app/page.tsx` para integrar las nuevas Server Actions y componentes.
    - Se añadió un conmutador de vistas (Listado / Dashboard) con animaciones de transición.
    - Se refinó la tabla de alta densidad cumpliendo estrictamente con los tokens de diseño de `UI.md` y `UI-List.md`.
- **Calidad de Código**: Se resolvieron múltiples errores de compilación y linting relacionados con tipos `any`, variables no utilizadas y directivas de Server Components (`use server`).

## 18 de Marzo, 2026 (Primera Sesión)
- **Estética Dark Mode & Glassmorphism**: Se implementó una estética moderna basada en el archivo `UI.md`. Se configuró Tailwind con modo oscuro por clase y se crearon utilidades de cristal (`glass-card`, `glass-input`).
- **Arquitectura de UI (Listados)**: Se estructuró la página principal en tres bloques (Métricas, Filtros, Tabla) siguiendo `UI-List.md`.
- **Funcionalidad de Filtros**:
    - Se implementó la lógica interactiva del botón **Personalizado** mediante un Popover que permite filtrar la tabla por rango de fechas real.
    - Se añadió filtrado por texto (Símbolo) y periodos predefinidos (Hoy, Semana, etc.) usando `useMemo` para alto rendimiento.
- **Gestión de Columnas**:
    - Se creó un Popover funcional que permite ocultar/mostrar columnas dinámicamente, reconstruyendo la tabla en tiempo real.
- **Consistencia Visual**: Se ajustaron opacidades y fondos (`bg-zinc-900`) para asegurar que todos los elementos desplegables sean coherentes y legibles.
- **Corrección de Errores de Consola**: Se eliminó el warning de React sobre el atributo `selected` en elementos `<select>`, reemplazándolo por `defaultValue`.
