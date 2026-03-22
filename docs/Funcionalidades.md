# Funcionalidades Implementadas — Gestión de Inversiones

> Documento requerido por `docs/domain/core.md`. Última actualización: 2026-03-21 (sesión v8).

---

## Cambios en esta sesión — v9 (21 de Marzo 2026)

### Vista Depósitos y Retiros (nueva pantalla completa)
- Nueva vista `movimientos` accesible desde el menú **"Dep / Ret"**
- Arquitectura de 3 bloques según spec UI: MetricCards + FilterBar + DataTable
- **Bloque 1 — MetricCards**: Depósitos (total $), Retiros (total $), Balance Neto, Nº Movimientos — filtrados por período activo
- **Bloque 2 — FilterBar**: compartido, con filtro de período + búsqueda por broker / cuenta / descripción; botón **"Nuevo Dep/Ret"** en slot `extraFilters`
- **Bloque 3 — DataTable**: misma estética y funcionalidad que Operaciones/Trades (alta densidad, sort, paginación, CSV export)
  - Columnas: Fecha · Tipo (badge verde/rojo) · Monto (+/- en color) · Broker · Cuenta · Descripción · Acciones
  - Acciones: Editar (✏) · Eliminar (🗑)

### Row-level Editing en Depósitos y Retiros
- Clic en el ✏ lápiz transforma la fila en inputs editables (fondo azul sutil para indicar modo)
- Todos los campos editables inline: Fecha, Tipo, Monto, Broker (select dinámico), Cuenta (select dinámico), Descripción
- Prefijo **+$** (verde) o **−$** (rojo) delante del monto según el tipo seleccionado
- Botón ✓ guardar (desactivado si monto inválido) · ✗ cancelar
- Validación: monto siempre positivo; el tipo determina el signo; si es ≤ 0 → borde rojo + mensaje + guardar desactivado

### Terminología actualizada
- "Ingreso" → **"Depósito"**, "Egreso" → **"Retiro"** en toda la UI (formulario, tabla, badges, metric cards, menú, botones)

### Backend
- Campo `cuenta?: string` agregado a la interface `CashFlow` en `data-loader.ts`
- `updateCashFlow(id, data)` agregado a `data-loader.ts`
- `updateMemoryCashFlow(id, data)` server action en `transactions.ts`
- Fix fecha: `addMemoryCashFlow` ahora usa `T12:00:00` al parsear la fecha (consistente con el resto del sistema)
- `getMemoryCashFlows` y `removeMemoryCashFlow` integrados en el `fetchData` del `Promise.all`

### DataTable extendido
- Nuevas props opcionales: `editingRowId`, `renderEditRow`, `onCancelEdit`
- Cuando `row.id === editingRowId` y `renderEditRow` está definido, renderiza la fila como `<td>` editables en lugar del display normal
- Compatible con todos los usos existentes (sin cambios de comportamiento en Operaciones/Trades)

### Navegación
- Al guardar un depósito/retiro: navega automáticamente a la vista `movimientos`
- Al cancelar el formulario: vuelve a `movimientos`
- Menú "I/E" renombrado a **"Dep / Ret"** → navega directo a `movimientos`
- La vista de formulario (`ie`) se activa desde el botón "Nuevo Dep/Ret" dentro de `movimientos`

---

## Cambios en esta sesión — v8 (21 de Marzo 2026)

### Bug fixes críticos
- **Fecha de cierre desplazada -1 día**: `new Date("2026-03-21")` se interpretaba como UTC midnight → en UTC-3 daba el día anterior. Fix: todas las fechas se parsean con `T12:00:00` (mediodía local) en `closeTradeWithQuantity`, `closeTradeManually`, `createOperation`, `updateOperation` y en el parseo del CSV en `data-loader.ts`.
- **Invalid Date en confirmación de cierre**: `String(pos.date)` aplicado a un objeto `Date` de Next.js generaba un string no-ISO (ej: "Fri Mar 01 2024..."), que sliceado a 10 chars no era fecha válida. Fix: `rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10)`. El campo `openDate` de `pendingClose` ahora siempre es `YYYY-MM-DD`.
- **CalendarGrid sin datos en celdas**: raíz en el timezone bug de fechas + `String(dateObj)` no ISO. Fix: helper `toDateStr(d)` que maneja ambos casos (Date object e ISO string).

### YieldsGrid (grilla de rendimientos mensuales)
- Columnas `Balance`, `PL $`, `PL %`, `I/E` ahora tienen ancho igual (`table-fixed` + `<colgroup>`)
- Números con separador de miles en formato es-AR (puntos): `toLocaleString('es-AR')`
- Tamaño de fuente uniforme en todas las columnas numéricas (`text-[12px]`)
- Sin datos muestra `0` en gris oscuro en lugar de `-`
- Columna `%` renombrada a `PL %`, columna `PL$` renombrada a `PL $`

### CalendarGrid (grilla de rendimiento diario)
- Activada automáticamente cuando el período activo es ≤ 1 mes (Hoy, Semana, 7d, Mes, Mes anterior, Custom ≤31d)
- Cuadrícula semanal Lun–Dom; solo incluye trades intradía (apertura = cierre mismo día)
- Celdas siempre visibles aunque no haya trades: muestra `$0` en gris y `0 trades`
- Colores semánticos: verde (PL > 0), rojo (PL < 0), gris (PL = 0)
- Semanas numeradas `Sem. 1`, `Sem. 2`... en orden ascendente; solo filas con días del mes reciben número
- Total mensual `PL Mensual:` alineado a la derecha
- Selector de mes (DropdownMultiCheck): permite ver uno o varios meses a la vez; cada mes genera su propio bloque apilado
- Números con formato es-AR (punto como separador de miles)

### Datos de demo
- Agregados 14 registros de trades intradía en marzo 2026 (COIN, PLTR, SNAP) — 7 pares BUY+SELL misma fecha, varios por día, para testear la grilla por día

### Sesión anterior incorporada (v7b — contexto comprimido)
- **FilterBar Personalizado**: dropdown toggle que aparece debajo del botón, inputs de fecha nativos con `bg-zinc-800`
- **Filtros DropdownMultiCheck**: Cuenta (dashboard), Año (dashboard), Mes en modo calendario, Estado/Instrumento (trades), Broker/Cuenta (operaciones)
- **Año multi-seleccionable**: seleccionar varios años filtra la grilla por esos años solamente
- **Modo calendario ≤ 1 mes**: incluye los filtros `mes` y `mes_anterior` además de custom ≤ 31 días
- **Tarjeta Balance Total**: suma de valor de mercado de posiciones abiertas, al lado de Resultado Neto
- **Confirmación de cierre de trade**: tabla con 9 campos (ID, F.Entrada, Símbolo, Cant., P.Entrada, P.Salida, M.Salida, F.Salida, Rdto $) — sin broker/cuenta
- **Botón "Cerrar"**: texto en lugar de ícono
- **Pie charts en Analytics**: por instrumento, por cuenta, por broker
- **YieldsGrid**: meses en orden descendente, nombres en español completo (Enero, Febrero...), totales dinámicos según cuentas seleccionadas

---

## 1. Dashboard Principal

- Grilla de rendimientos: filas = meses (descendente), columnas = cuentas + TOTAL
- Columnas por cuenta: Balance, PL $, PL %, I/E (Ingresos/Extracciones)
- Nombres de mes en español completo (Enero, Febrero, ... Diciembre)
- Todas las columnas de la grilla tienen el mismo ancho (`table-fixed` + colgroup)
- Números con separador de miles es-AR (punto): `toLocaleString('es-AR')`
- Tamaño de fuente uniforme en todas las columnas numéricas
- Sin datos en celda: muestra `0` en gris (no guión)
- Agrupación por cuenta (USA / Argentina / CRYPTO)
- Footer con suma de totales por columna — recalculado dinámicamente según cuentas visibles
- Selector multi-cuenta (DropdownMultiCheck): elige qué cuentas mostrar; persiste en `localStorage`
- Selector multi-año (DropdownMultiCheck): elige uno, varios o todos los años; sincroniza el filtro de período
- Modo "Todos los años": agrupa la grilla por año en bloques descendentes, cada uno con encabezados y footer propios
- Filtro de período sincronizado: el combo de año y el filtro de período aplican simultáneamente al Resultado Neto y a la grilla
- Botón Personalizado: toggle dropdown debajo del botón, inputs nativos de fecha (desde / hasta)
- **Resultado Neto**: tarjeta con Net Profit, Gross Profit, Gross Loss del período
- **Balance Total**: tarjeta con suma de valor de mercado de posiciones abiertas
- Números en la grilla: sin símbolo de moneda en las celdas internas

### 1b. Grilla de Rendimiento Diario (Modo Calendario)

La grilla mensual se reemplaza automáticamente por una cuadrícula de días cuando el período activo es corto (≤ 1 mes).

**Cuándo se activa:**
- Filtros de período: Hoy, Esta semana, Últ. 7 días, Este mes, Mes anterior
- Personalizado con rango ≤ 31 días

**Estructura de la grilla:**
- Tabla Lun–Dom con una columna extra de total semanal a la derecha
- Cada celda muestra el día del mes, el PL $ del día (verde si positivo, rojo si negativo, gris si cero) y la cantidad de trades cerrados ese día
- Las celdas de días fuera del mes (relleno de la primera/última semana) se muestran atenuadas y vacías
- Las celdas dentro del mes siempre muestran valores, aunque sean `$0` y `0 trades`

**Totales semanales:**
- Columna derecha con label `Sem. 1`, `Sem. 2`, etc., numeradas en orden ascendente dentro del mes
- Solo se numeran las filas que contienen al menos un día del mes (las filas de relleno no llevan número ni valores)
- Muestra el PL $ acumulado de la semana y la cantidad de trades de esa semana

**Total mensual:**
- Label `PL Mensual:` alineado a la derecha, en color semántico (verde/rojo/gris)
- Muestra el PL $ acumulado de todos los días del mes dentro del período

**Selector de mes:**
- Visible solo cuando el modo calendario está activo
- Dropdown multicheck (DropdownMultiCheck) que permite mostrar uno o varios meses simultáneamente
- Cada mes seleccionado genera su propio bloque de grilla apilado verticalmente con título `Mes Año`
- Por defecto muestra el mes del período activo

**Trades incluidos:**
- Solo trades intradía: operaciones cuya fecha de apertura y fecha de cierre son el mismo día
- Los trades multi-día (posiciones mantenidas de un día para otro) no aparecen en la grilla diaria; se ven en la grilla mensual

**Formato de números:** separador de miles con punto (es-AR), sin decimales en los totales

## 2. Analytics — 15+ Métricas configurables por período

- Todos los nombres de métricas en español
- Hacer clic sobre cualquier tarjeta muestra una descripción explicativa (tooltip toggle)
- Todas las métricas respetan el filtro de período activo

### Tarjetas de resumen
- Operaciones Abiertas, Trades Cerrados, Tasa de Victorias, Tamaño Promedio

### Tarjetas grandes
| Métrica | Descripción |
|---|---|
| Tasa de Victorias | Porcentaje de victorias sobre el total de operaciones realizadas |
| Factor de Beneficio | Relación entre ganancias brutas y pérdidas brutas |
| Drawdown Máximo | Máxima reducción del capital desde un pico hasta un valle |

### Métricas detalladas (grilla 6 columnas)
Ratio de Sharpe, Ratio de Sortino, Expectativa, Factor de Recuperación, SQN, Criterio de Kelly, Ganancia Promedio, Pérdida Promedio, Ratio G/P, Mayor Ganancia, Mayor Pérdida, Racha Ganadora, Racha Perdedora, Tiempo Promedio, Comisiones

### Otras secciones de Analytics
- Top 5 Trades por P&L $
- Mejor Mes con mayor retorno acumulado
- Mejor Trade por rendimiento %
- Curva de Equity acumulada (sparkline de barras)
- **Gráfico de torta: tenencia por instrumento** (STOCK / CEDEAR / CRYPTO)
- **Gráfico de torta: tenencia por cuenta** (USA / Argentina / CRYPTO)
- **Gráfico de torta: tenencia por broker** (Schwab, IOL, AMR, etc.)

## 3. Listado de Operaciones

- Campos: ID, Fecha, Símbolo, Tipo (BUY/SELL), Cantidad, Precio, Monto, Falopa, Intra, Broker, Cuenta
- Ordenamiento ↕ por cualquier columna
- Paginación: 25 / 50 / 100 / Todos
- Filtro de período por fecha (`date`)
- **Filtro Broker** (DropdownMultiCheck): multi-selección, opciones dinámicas desde datos reales
- **Filtro Cuenta** (DropdownMultiCheck): multi-selección, opciones dinámicas desde cuentas guardadas
- Búsqueda libre por símbolo o broker
- Exportar como CSV
- Acciones: Ver detalle / Editar / Eliminar

## 4. Listado de Trades

- Campos: ID, F.Entrada, Símbolo, Cantidad, P.Entrada, M.Entrada, P.Salida, M.Salida, F.Salida, Días, Rdto $, Rdto %, TNA, Estado, Broker, Cuenta
- Colores semánticos: verde = positivo, rojo = negativo
- **Filtro Estado** (DropdownMultiCheck): Abiertos / Cerrados
- **Filtro Instrumento** (DropdownMultiCheck): STOCK / CEDEAR / CRYPTO
- Filtro de período por fecha de cierre (`closeDate`)
- Trades abiertos son inmunes al filtro de período (siempre visibles)
- Búsqueda libre por símbolo o broker
- Exportar como CSV
- Acciones: Ver detalle / Eliminar

## 5. Posiciones Abiertas

- Operaciones BUY sin contraparte SELL
- Precio actual vía Yahoo Finance (caché 5 min, fallback silencioso)
- P&L latente en $ y % calculado sobre precio actual
- Días transcurridos desde apertura
- Campos: Fecha, Símbolo, Cantidad, P.Entrada, P.Actual, P&L Latente, Broker, Cuenta
- Filtro de período por fecha de apertura (`openDate`)
- Búsqueda libre por símbolo o broker
- Paginación: 25 / 50 / 100 / Todos

## 6. Alta de Operación

- Se abre como vista inline (no modal)
- Toggle visual BUY / SELL (verde / rojo)
- Campos: Símbolo, Fecha, Cantidad, Precio, Broker, Cuenta, Falopa, Intra
- Selectores de Broker (Schwab / Binance / Cocos / Balanz / AMR / IOL / IBKR / PP) y Cuenta (USA / Argentina / CRYPTO)
- Modo pegado rápido: parsea texto libre (`NVDA 2026-03-10 10 800 AMR`)
- **Panel de posiciones abiertas para cierre**: al escribir símbolo con tipo SELL, muestra las posiciones que coincidan en símbolo + broker + cuenta + tipo opuesto
- Botón **"Cerrar"** (texto): usa cantidad, precio y fecha del formulario; valida que estén completos antes de activar
- **Tarjeta de confirmación pendiente**: al hacer clic en "Cerrar", muestra el trade completo con los valores resultantes:
  - ID, F.Entrada, Símbolo, Cant., P.Entrada, P.Salida, M.Salida, F.Salida, Rdto $
  - No muestra broker ni cuenta
  - Se ejecuta al presionar "Guardar Operación"
- **Cierre parcial FIFO** (ejecutado al guardar):
  - qty = trade qty → cierre total
  - qty < trade qty → cierra con esa cantidad; crea nuevo trade abierto con el remanente
  - qty > trade qty → cascade automático a los siguientes trades abiertos del mismo símbolo (FIFO); si sobra, crea SELL abierta con el excedente
- **Modo edición**: botón lápiz en tabla abre el formulario con datos pre-cargados y llama a `updateOperation`
- **Corrección de zona horaria**: todas las fechas se parsean como mediodía local (`T12:00:00`) para evitar el desplazamiento UTC-midnight en zonas UTC-3 o similares

## 7. Modal de Solo Lectura (ViewDetailModal)

- Ver detalle completo de una operación o trade en un modal overlay
- Campos formateados: fechas, montos, porcentajes, colores semánticos
- Accesible desde el botón lupa en las tablas de Operaciones y Trades

## 8. Sección Cuentas

- CRUD completo desde la UI (pestaña "Cuentas"), vista inline
- Cuentas por defecto: USA, Argentina, CRYPTO
- Agregar / editar inline / eliminar
- Campo `cuenta` en operaciones y trades: derivado del broker si no está en CSV

## 8b. Sección Brokers

- CRUD completo desde la UI (pestaña "Brokers"), vista inline
- Brokers precargados: Schwab, Binance, Cocos, Balanz, AMR, IOL, IBKR, PP
- Agregar / editar inline / eliminar

## 9. Depósitos y Retiros (CashFlow)

### 9a. Formulario de alta
- Vista inline (no modal), accesible desde botón "Nuevo Dep/Ret" dentro de la vista movimientos
- Toggle visual **Depósito** (verde) / **Retiro** (rojo)
- Campos: Tipo, Fecha, Monto, Broker, Cuenta, Descripción (opcional)
- Al guardar: navega a la pantalla de movimientos
- Impacta la columna I/E del Dashboard

### 9b. Vista Movimientos (pantalla completa)
- Arquitectura 3 bloques: MetricCards + FilterBar + DataTable
- **MetricCards**: Depósitos totales, Retiros totales, Balance Neto, Nº movimientos — filtrados por período
- **FilterBar**: período + búsqueda por broker / cuenta / descripción; botón "Nuevo Dep/Ret" en extraFilters
- **DataTable** de alta densidad:
  - Columnas: Fecha · Tipo (badge) · Monto (+/- en color semántico) · Broker · Cuenta · Descripción
  - Sort por cualquier columna, paginación 25/50/100/Todos, exportar CSV
  - **Acción Editar**: Row-level editing inline — todos los campos editables en la misma fila
    - Validación: monto siempre positivo; tipo determina signo; guardar deshabilitado si monto ≤ 0
    - Brokers y Cuentas desde listas dinámicas del memoryState
  - **Acción Eliminar**: con confirmación

## 10. Navegación

- Barra superior con pestañas: Dashboard, Analytics, Posiciones, Trades, Operaciones, Cuentas, Brokers
- Botones de acción: **Dep / Ret** (abre vista movimientos) y **Nueva Op.**
- Cuentas, Brokers y Nueva Op. se renderizan como vistas inline de pantalla completa
- FilterBar visible en: Dashboard, Analytics, Posiciones, Trades, Operaciones, **Movimientos**
- FilterBar oculto en vistas de gestión puro: Cuentas, Brokers, formulario Nueva Op, formulario Dep/Ret

## 11. Datos de Demo

- CSV con operaciones en rango 2024–2026
- Mix de trades cerrados + posiciones abiertas
- Mix de símbolos USA, CEDEARs y cripto
- Brokers: IBKR, AMR, IOL, Schwab, y otros
- **Trades intradía (misma fecha apertura/cierre)**: 14 registros en marzo 2026 (COIN, PLTR, SNAP) — varios por día para testear la grilla semanal
- Matching FIFO en memoria al inicio de la aplicación

## 12. Calidad y Estándares

- ESLint guardrails: UI y lib no pueden importar server actions directamente
- TypeScript strict mode sin errores
- Tests unitarios: calculations, operation-parser, prices
- Tests de integración: dashboard stats, closeTradeManually
- Tests E2E Playwright: dashboard, operaciones, trades
- CI GitHub Actions: lint → typecheck → test → build → e2e
