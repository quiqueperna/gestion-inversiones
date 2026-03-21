# Pendientes del Proyecto

## 20 de Marzo, 2026 — Estado post sesión v4 (estado actual)

### Completado en sesión v4
- ✅ Trade interface: `isClosed`, `openOperationId`, campos opcionales de cierre
- ✅ Trades abiertos creados en FIFO y visibles en tabla Trades
- ✅ Trades abiertos enriquecidos con Yahoo Finance: P.Salida, F.Salida, Rdto $, Rdto %, TNA
- ✅ `closeTradeManually` actualiza trade open in-place (no duplica registros)
- ✅ `deleteTrade` server action conectado a tabla Trades
- ✅ Columnas Operations: exactas según requirements.md (sin P.Salida/F.Salida/Estado)
- ✅ Columnas Trades: orden correcto según requirements.md + Estado
- ✅ Filtro Estado en Trades (Todos/Abiertos/Cerrados)
- ✅ Eliminado filtro Estado de Operaciones (no aplica)
- ✅ Acciones Lupa/Lápiz/Papelera siempre visibles (quitado opacity-0 hover)
- ✅ Paginación: resetea a página 1 al cambiar dataset
- ✅ Dashboard: solo trades cerrados en métricas

### Pendientes reales restantes

| # | Descripción | Prioridad |
|---|---|---|
| 1 | **onEdit funcional en Operaciones** — actualmente abre un `alert` placeholder. Falta modal de edición real que llame a `updateOperation`. | P2 |
| 2 | **onView funcional** — el detalle de operación y trade muestra un `alert` básico. Falta modal de lectura con todos los campos formateados. | P3 |
| 3 | **Yahoo Finance en CI** — `getOpenPositions` y `getTrades` (trades abiertos) hacen requests externos. En GitHub Actions podría fallar. Agregar `DISABLE_REAL_PRICES=true`. | P2 |
| 4 | **Sidebar lateral fijo** — reemplazar nav horizontal por sidebar cuando escale la navegación. | P3 |
| 5 | **Activar Prisma para operaciones** — actualmente todo en memoria. Conectar Operations + Trades a DB cuando esté disponible. Ver `docs/ACTIVAR-BD.md`. | P3 |
| 6 | **E2E trades.spec.ts** — spec incompleto, faltan casos: filtrar por estado, filtrar por instrumento, exportar CSV. | P3 |

---

## 20 de Marzo, 2026 — Estado post sesión v3 (estado actual)

### Completado en sesión v3
- ✅ Fix unused `broker` en CloseTradeModal (lint)
- ✅ Fix FilterBar `htmlFor`/`id` en labels del popover
- ✅ Fix carga: separado `loading` (inicial) de `refreshing` (re-fetch) — evita desmontar la UI
- ✅ 10/10 E2E tests pasando
- ✅ Diagnosticado y explicado error 500 en browser (servidor viejo en puerto 3000)

### Pendientes reales restantes

| # | Descripción | Prioridad |
|---|---|---|
| 1 | **Sidebar lateral fijo** — reemplazar nav horizontal por sidebar. Necesario cuando escale la navegación. | P3 |
| 2 | **`e2e/trades.spec.ts` incompleto** — solo tiene 3 tests básicos. Faltan: crear trade, filtrar por instrumento, exportar CSV. | P3 |
| 3 | **Activar Prisma para operaciones** — actualmente Prisma solo cubre `CashFlow`. Conectar Operations + Trades cuando el usuario tenga DB disponible. Ver `docs/ACTIVAR-BD.md`. | P3 |
| 4 | **Yahoo Finance en CI** — `getOpenPositions` hace requests externos. En GitHub Actions podría fallar por red. Agregar mock o variable de entorno `DISABLE_REAL_PRICES=true`. | P2 |
| 5 | **onEdit en DataTable** — la acción "editar" en la tabla de Operaciones abre un modal placeholder. No llama a `updateOperation` todavía. | P2 |
| 6 | **onView en DataTable** — la acción "ver detalle" no tiene modal de solo lectura implementado. | P3 |

---

## 20 de Marzo, 2026 — Estado post sesión v2

### Completado en esta sesión (todos los ítems de pendientes.md anterior)
- ✅ P1.1 CloseTradeModal implementado y conectado en TradeForm
- ✅ P1.2 deleteOperation + updateOperation funcionales; handlers conectados en page.tsx
- ✅ P1.3 CashFlowForm creado; addMemoryCashFlow conectado al dashboard
- ✅ P1.4 Precios reales Yahoo Finance con cache 5 min
- ✅ P2.5 docs/Funcionalidades.md creado
- ✅ P2.6 FLAG USE_DB documentado en docs/ACTIVAR-BD.md
- ✅ P2.7 Tests integración server actions (34 tests passing)
- ✅ P2.8 Playwright configurado + 2 specs E2E
- ✅ P2.9 Filtros Estado/Broker en Operaciones, Instrumento en Trades
- ✅ P2.10 Mejor Mes y Mejor Trade visibles en Dashboard
- ✅ P3.11 Exportar CSV desde DataTable (prop onExport)
- ✅ P3.13 Selector instrumentType en TradeForm
- ✅ P3.14 Curva de equity en Analytics (sparkline SVG)
- ✅ P3.15 Tests de regresión parser (5 casos adicionales)

### Pendientes restantes

| # | Descripción | Prioridad |
|---|---|---|
| 1 | P3.12 Sidebar lateral fijo (nav horizontal → sidebar) | P3 |
| 2 | E2E spec para trades (e2e/trades.spec.ts) | P3 |
| 3 | Activar tests E2E en CI (requiere entorno con browser) | P3 |
| 4 | Persistencia real Prisma cuando haya DB disponible | P3 |

---

## 20 de Marzo, 2026 — Estado original (antes de sesión v2)

### P1 — Alta prioridad (bloquea UX)

| # | Descripción | Archivo/Área |
|---|---|---|
| 1 | Conectar el modal de cierre manual en la UI: cuando se ingresa una SELL y hay múltiples BUY abiertas del mismo símbolo, mostrar modal de selección. El backend (`closeTradeManually`) ya existe, falta el componente. | `TradeForm.tsx` / nuevo `CloseTradeModal.tsx` |
| 2 | Acciones de tabla funcionales: los íconos Lupa/Lápiz/Papelera de `DataTable` no tienen handlers reales conectados en `page.tsx`. Editar/Eliminar operaciones no persiste. | `page.tsx` + `trades.ts` |
| 3 | Formulario de Ingresos/Egresos (CashFlow): no hay UI para cargar depósitos y retiros manualmente. El backend (`transactions.ts`) existe pero sin formulario. | Nuevo `CashFlowForm.tsx` |
| 4 | Precio en tiempo real para posiciones abiertas: `src/lib/prices.ts` usa precios mock con varianza aleatoria. Integrar Yahoo Finance (`query1.finance.yahoo.com`) con cache de 5 min. | `src/lib/prices.ts` |

### P2 — Prioridad media (mejora funcional)

| # | Descripción | Archivo/Área |
|---|---|---|
| 5 | `Funcionalidades.md`: el archivo con el listado definitivo de dashboards/estadísticas implementadas nunca se creó. Requerido por `core.md`. | `/docs/Funcionalidades.md` |
| 6 | Persistencia real (Prisma): el schema está listo, pero las server actions de operaciones y trades usan memoria. Cuando el usuario tenga Postgres/SQLite disponible, conectar. | `src/server/actions/trades.ts`, `dashboard.ts` |
| 7 | Tests de integración para server actions (`dashboard.ts`, `trades.ts`): solo existen tests unitarios de lib. Falta cubrir `getStats`, `getDashboardSummary`, `closeTradeManually`. | `src/server/actions/__tests__/` |
| 8 | Tests E2E con Playwright: el paquete está instalado pero no hay archivos de test ni configuración (`playwright.config.ts`). | `e2e/` |
| 9 | Filtros adicionales en listados: en Operaciones, filtro por Estado (Abiertas/Cerradas/Todas) y Broker. En Trades, filtro por tipo de instrumento (STOCK/CEDEAR/CRYPTO). | `page.tsx` / `FilterBar.tsx` |
| 10 | Mejor mes y mejor trade: los datos de `getTopStats()` están disponibles en el backend pero no se muestran en el dashboard (solo Top 5 Trades está conectado). | `page.tsx` — sección dashboard |

### P3 — Baja prioridad (nice to have)

| # | Descripción | Archivo/Área |
|---|---|---|
| 11 | Exportar CSV desde los listados de Trades y Operaciones. | `DataTable.tsx` — prop `onExport` |
| 12 | Sidebar lateral fijo (en vez de navbar horizontal) para cuando escale la navegación. | `src/app/layout.tsx` |
| 13 | Modo de instrumentos en el formulario: selector de tipo (STOCK/CEDEAR/CRYPTO) para clasificar correctamente en las estadísticas. | `TradeForm.tsx` |
| 14 | Gráfico de curva de equity (rendimiento acumulado en el tiempo). | Nueva sección en Analytics |
| 15 | Tests de regresión para el parser de texto con más formatos de brokers externos (e.g. export de IBKR, IOL). | `operation-parser.test.ts` |
