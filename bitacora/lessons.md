# Lecciones Aprendidas - Proyecto Gestión de Inversiones

## 20 de Marzo, 2026 — Sesión v4: Alineación requirements + trades abiertos

### Errores encontrados y corregidos

**Error 1 — `closeTradeManually` creaba un trade nuevo en vez de actualizar el open trade**
- Causa: al tener trades abiertos en `state.trades`, `closeTradeManually` empujaba un nuevo trade cerrado sin eliminar el abierto. Resultado: duplicación — `trades.length` crecía en lugar de mantenerse estable.
- Corrección: buscar el trade existente con `openOperationId === data.openOperationId && !isClosed`. Si existe, actualizar in-place con `Object.assign`. Si no existe (caso de legacy), push del trade nuevo.
- Regla: **cuando se cierra un trade que existe como registro abierto, actualizarlo in-place. No crear duplicados.**

**Error 2 — Tests de integración fallaban porque `trades.length` cambió de 1 a 3**
- Causa: los tests usaban `initializeMemoryState(CSV_TWO_OPEN)` con 2 BUYs sin contraparte → 2 open trades. `closeTradeManually` (antes del fix anterior) creaba un 3ro. El test esperaba 1.
- Corrección: tras el fix de in-place update, `trades.length` sigue siendo 2 (1 cerrado + 1 abierto). Tests actualizados a `trades.filter(t => t.isClosed).length === 1`.
- Regla: **al cambiar la arquitectura de datos (e.g. agregar open trades), revisar TODOS los tests de integración que hacen assertions sobre `.length` de arrays.**

**Error 3 — Trades abiertos no visibles: filtro de fecha los excluía**
- Causa: `filteredList` usaba `item.closeDate` para el filtro de fecha. Para trades abiertos con `closeDate = today`, un filtro como "mes anterior" los excluía.
- Corrección: los trades con `isClosed: false` siempre pasan el filtro de fecha (son posiciones vigentes). Solo se les aplica filtro de búsqueda/instrumento/estado.
- Regla: **las posiciones abiertas deben ser siempre visibles en la tabla, independientemente del filtro de período activo.**

**Error 4 — handleDeleteTrade intentaba importar `getMemoryState` desde un client component**
- Causa: se intentó `import("@/lib/data-loader").then(m => m.getMemoryState())` dentro de un handler de page.tsx (`"use client"`). En Next.js App Router, los client components no pueden importar módulos de servidor.
- Corrección: creada server action `deleteTrade(id)` en `trades.ts` y usada desde el client component.
- Regla: **nunca importar módulos del servidor (`data-loader`, Prisma, `fs`) desde un client component. Siempre crear una server action como intermediario.**

**Error 5 — Campos opcionales en Trade interface rompían TypeScript en dashboard.ts**
- Causa: `closeDate` pasó de `Date` a `Date | undefined`. Los filtros y comparaciones existentes `t.closeDate >= startDate` fallaban con TS2345 (`undefined` no asignable a `Date`).
- Corrección: agregados guards `t.closeDate && ...` en todos los usos de campos opcionales. No-assertion operator `!` donde el contexto garantiza el valor (ya filtrado por `isClosed`).
- Regla: **al hacer campos opcionales en una interface compartida, buscar con grep TODOS los usos del campo en el codebase antes de hacer el cambio.**

### Aprendizajes de la sesión

1. **"Actualizar in-place vs push" es una decisión de arquitectura con impacto en tests**: agregar open trades al array de trades es correcto semánticamente, pero cambió las expectativas de todos los tests que contaban trades. El patrón in-place update para `closeTradeManually` mantiene la coherencia del modelo.

2. **Los trades abiertos deben ignorar el filtro de fecha en las listas**: un trade abierto NO tiene fecha de cierre real. Darle `closeDate = today` es una convención para el cálculo de P&L, no para el filtro de visualización. Filtrarlos por fecha esconde posiciones vigentes.

3. **Yahoo Finance se llama desde dos server actions en paralelo** (`getTrades` y `getOpenPositions`): el `priceCache` a nivel de módulo evita el doble fetch para el mismo símbolo en la misma sesión del servidor. En CI sin red, esto puede romper. Pendiente: `DISABLE_REAL_PRICES`.

---

## 20 de Marzo, 2026 — Sesión v3: Estabilización y E2E

### Errores encontrados y corregidos

**Error 1 — "500 internal server error" en browser: servidor fantasma**
- Causa: proceso node (PID 15488/360) con código antiguo seguía escuchando en puerto 3000. El nuevo `npm run dev` arrancaba en otro puerto.
- El browser del usuario abría :3000 y veía código de sesiones anteriores.
- Diagnóstico: curl directo a los server action IDs reveló que los de la instancia correcta retornaban 200. Playwright confirmó 0 errores con el código actual.
- Regla: **antes de reportar un bug, matar todos los procesos node y reiniciar fresh.** En Windows: `taskkill /IM node.exe /F`.

**Error 2 — `setLoading(true)` en re-fetch desmontaba componentes hijos**
- Causa: `fetchData()` siempre hacía `setLoading(true)`. En page.tsx, `if (loading) return <Spinner />` devuelve SOLO el spinner, unmount de todo el árbol de componentes.
- Consecuencia visible: abrir el popover "Personalizado" en FilterBar y cambiar el filtro cerraba el popover inmediatamente (el componente se desmontaba y su estado local `showCustom` se perdía).
- Consecuencia en test: `getByLabel(/Desde/i)` no encontraba el input porque el popover estaba cerrado cuando el assertion corría.
- Corrección: separar carga inicial (`loading` → spinner full-screen) de re-fetch (`refreshing` → spinner pequeño en navbar). El árbol de componentes queda montado durante re-fetches.
- Regla: **nunca usar un spinner full-screen para re-fetches en apps con estado local en componentes hijos.** El unmount destruye el estado local (dropdowns, popovers, formularios a medio completar).

**Error 3 — `getByLabel` de Playwright requiere asociación explícita `for`/`id`**
- Causa: los `<label>` en el popover no tenían `htmlFor` y los `<input>` no tenían `id`. Playwright's `getByLabel` usa accesibilidad estándar y no hace coincidencia por proximidad DOM.
- Corrección: `htmlFor="custom-range-start"` + `id="custom-range-start"` en el input de fecha.
- Regla: en tests Playwright, `getByLabel` solo funciona con `<label htmlFor>` + `<input id>` o `aria-label`. Si hay dudas usar `page.locator('#id')` que es más explícito.

### Aprendizajes de la sesión

1. **El diagnóstico de "500" necesita metodología**: los primeros intentos de debug fueron desordenados (curl a la página, grep de logs, etc.). Lo que funcionó fue: (a) identificar los server action IDs del manifiesto, (b) testearlos directamente con curl uno por uno, (c) confirmar con Playwright en browser real.

2. **React strict mode complica el `isFirstLoad` ref**: en dev, los efectos corren dos veces. Un `useRef(true)` se convierte en `false` en el segundo render de strict mode. Hay que tener esto en cuenta al usar refs para trackear "primera vez".

3. **Playwright es el árbitro final**: cuando hay dudas sobre si la app funciona, correr un test de Playwright que navega por todas las vistas y loguea errores de consola + respuestas >= 400 es más confiable que cualquier análisis de código o curl.

---

## 20 de Marzo, 2026 — Sesión v2: Completar Pendientes

### Errores encontrados y corregidos

**Error 1 — `broker` prop destructurado pero no usado en CloseTradeModal**
- Causa: la prop `broker: string` estaba en la interface y en el destructuring, pero nunca se renderizaba en el JSX. ESLint `no-unused-vars` bloqueaba el lint.
- Corrección: eliminado del destructuring (se mantiene en la interface para que el padre pueda pasarlo si lo necesita a futuro sin cambiar la firma).
- Regla: al crear un componente con interface amplia, solo destructurar las props que realmente se usan en ese componente.

### Aprendizajes de la sesión

1. **`resetMemoryState()` es clave para tests de integración**: sin esta función, los tests de server actions contaminan el estado de los siguientes. Exportar desde `data-loader.ts` y llamarlo en `beforeEach` es el patrón correcto.

2. **Yahoo Finance v8 es simple y sin auth**: el endpoint `query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d` devuelve `meta.regularMarketPrice` directamente. No requiere API key. Pero sí es sensible al User-Agent; pasar `'Mozilla/5.0'` evita 403.

3. **`Promise.all` en `getOpenPositions` es obligatorio**: fetches secuenciales para 18 posiciones abiertas serían ~18s. Con `Promise.all` son ~1-2s (tiempo del fetch más lento). En funciones de server action con múltiples fetches externos, siempre paralelizar.

4. **La curva de equity no necesita una librería de gráficos**: un div con `flex items-end gap-px` y barras de altura proporcional es suficiente para una sparkline funcional y ligera, sin añadir dependencias.

5. **Los archivos de misión con layouts exactos (ASCII art) aceleran la UI**: cuando el archivo de misión incluye el layout `┌─────┐` y los props exactos del componente, el agente de UI puede implementar sin explorar el resto del codebase.

---

## 20 de Marzo, 2026 — Sesión de Orquestación Multi-Agente

### Errores encontrados y corregidos

**Error 1 — `payoffRatio` inexistente en retorno de `getStats()`**
- Causa: `page.tsx` (Analytics view) referenciaba `stats.payoffRatio.toFixed(2)` pero `getStats()` y `createEmptyStats()` no incluían ese campo.
- Señal temprana: la vista Analytics crasheaba en runtime al intentar llamar `.toFixed()` sobre `undefined`.
- Corrección: se agregó `payoffRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin` a ambas funciones.
- Regla: antes de referenciar una propiedad de un objeto de datos en la UI, verificar que el servidor la devuelve en todos los casos (incluyendo el estado vacío/fallback).

**Error 2 — `tradeSchema` incompatible con los campos del formulario**
- Causa: `validations.ts` definía `tradeSchema` con campos del modelo de DB (`openDate`, `closeDate`, `openPrice`, `openAmount`, etc.) pero `TradeForm.tsx` usaba `zodResolver(tradeSchema)` con campos de UI (`entryDate`, `entryPrice`, `exitPrice`). Esto hacía que la validación siempre fallara silenciosamente.
- Señal temprana: el formulario no validaba ningún campo aunque `react-hook-form` lo aplicaba.
- Corrección: reescrito `tradeSchema` como `newOperationFormSchema` alineado a los campos del formulario.
- Regla: el schema Zod para un formulario debe modelar los campos de la UI, no el modelo de base de datos. Son contratos distintos.

**Error 3 — Imports no usados en `data-loader.ts` causaban advertencias de lint**
- Causa: al agregar `getTopStats()` se importaron funciones de `date-fns` (`isWithinInterval`, `isSameMonth`, etc.) que no eran necesarias.
- Corrección: el agente de QA los eliminó durante la fase de build.
- Regla: al agregar nuevas funciones a un módulo, verificar que todos los imports existentes siguen siendo necesarios.

**Error 4 — `any` implícito en interfaces de YieldsGrid**
- Causa: `YieldsGrid.tsx` usaba `any` para los tipos de las celdas.
- Corrección: el agente de QA creó interfaces `YieldCell` y `YieldTotals` para tipar correctamente.
- Regla: los componentes que reciben datos dinámicos de servidor deben tener interfaces explícitas, no `any`.

### Aprendizajes de la sesión

1. **El approach de agentes especializados funciona bien con dependencias claras**: Agente 01 (datos) → Agente 02 (lógica) → Agente 03 (UI) es el orden correcto. Ejecutar UI antes de que existan los server actions genera trabajo doble.

2. **El bug más peligroso es el que no falla en build sino en runtime**: `payoffRatio` pasó typecheck porque `getStats()` devuelve `any` implícito (por los `reduce`). Con tipos estrictos en el retorno de las server actions, este bug hubiera sido detectado en compile time.

3. **Los archivos de misión aceleran la ejecución de agentes**: tener el contexto exacto (qué existe, qué falta, qué campos, qué reglas) en un `.md` estructurado evita que el agente tenga que explorar el codebase completo antes de actuar.

---

## 19 de Marzo, 2026

### Errores Cometidos
1.  **Falta de lectura profunda de requerimientos:** En la primera iteración de la sesión, no cumplí con el formato específico de la grilla (invertida) ni con la cantidad de estadísticas solicitadas, a pesar de que figuraba en `core.md`.
2.  **Suposición de infraestructura:** Intenté forzar el uso de una base de datos real (SQLite/Prisma) cuando el documento de requerimientos indicaba explícitamente el uso de un CSV y carga en memoria para la fase actual. Esto causó fricción técnica innecesaria.
3.  **Inconsistencia en listados:** No incluí todos los campos técnicos (TNA, Cantidad de días, etc.) en las tablas, fallando en la precisión del dato financiero solicitado.
4.  **Omisión de Ingresos/Egresos:** Ignoré la parte de la documentación que mencionaba el flujo de caja (I/E), resultando en dashboards con información incompleta.

### Aprendizajes
1.  **Prioridad de la Documentación Local:** Los archivos en `/docs` (especialmente `core.md` y `UI-List.md`) deben ser la única fuente de verdad, por encima de las suposiciones generales de diseño.
2.  **Modo Demo vs Producción:** Es vital preguntar o confirmar el entorno antes de implementar capas de persistencia pesadas si la documentación sugiere un prototipo rápido basado en archivos.
3.  **Detalle en Métricas Financieras:** Para un trader, los datos como la TNA, el Sharpe Ratio y las rachas de pérdidas son tan importantes como el beneficio neto. No deben omitirse en una herramienta de gestión profesional.
4.  **Estructura de Datos en Memoria:** Mantener un `memoryState` robusto permite iterar más rápido en la UI sin las complicaciones de las migraciones de base de datos en fases tempranas.

---

## 18 de Marzo, 2026
- **Acción concreta aplicada:** Se reconstruyeron los archivos `src/app/page.tsx`, `src/components/trades/TradeForm.tsx` y `src/lib/calculations.ts` usando el contenido completo.
- **Aprendizaje:** No usar marcadores de posición (`// ...`) en archivos críticos, ya que rompen la funcionalidad del componente. Siempre proporcionar el código completo para asegurar la integridad.
- **Aprendizaje UI:** El uso de `glassmorphism` requiere un manejo cuidadoso de los contrastes en modo oscuro para mantener la legibilidad de los datos numéricos.
