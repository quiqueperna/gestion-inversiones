# Lecciones Aprendidas - Proyecto Gestión de Inversiones

---

## 24 de Marzo, 2026 — Sesión v26

### Error encontrado y corregido

**Error — `DROP CONSTRAINT` no elimina un `CREATE UNIQUE INDEX`**
- Causa: En PostgreSQL, `CREATE UNIQUE INDEX` y `ADD CONSTRAINT UNIQUE` crean estructuras distintas. `ALTER TABLE ... DROP CONSTRAINT nombre` solo elimina constraints definidos con `ADD CONSTRAINT`. Si el unique fue creado con `CREATE UNIQUE INDEX`, hay que usar `DROP INDEX`.
- Señal: `P2002 Unique constraint failed on the fields: ('nombre')` al crear Account/Broker para un segundo usuario.
- Corrección: `DROP INDEX IF EXISTS "Account_nombre_key"` en vez de `DROP CONSTRAINT IF EXISTS`.
- Regla: **al eliminar un unique index en PostgreSQL, verificar si fue creado con `CREATE UNIQUE INDEX` (→ `DROP INDEX`) o con `ADD CONSTRAINT UNIQUE` (→ `DROP CONSTRAINT`). Son comandos distintos.**

---

## 24 de Marzo, 2026 — Sesión v25

### Sin errores de lógica

**Punto clave 1 — Singleton global vs Map por usuario:** El patrón `let memoryState = {...}` en un módulo de Node.js persiste para toda la vida del proceso. Si varios usuarios hacen requests, todos tocan el mismo objeto. La solución es `Map<userId, MemState>` donde cada usuario tiene su propio estado. El default `'_test_'` preserva backward compat con tests que no pasan userId.

**Punto clave 2 — Retornar `{ state, userId }` desde ensureDataLoaded():** Al cambiar la firma del helper de carga para retornar también el userId, se evita llamar a `getCurrentUserId()` múltiples veces en la misma función. Esto simplifica el threading y garantiza consistencia entre la carga de estado y las escrituras a DB.

**Punto clave 3 — Migración manual por conflicto de shadow DB:** Las migraciones previas tenían un rename de `Cuenta → Account` que causaba inconsistencia en la shadow database de Prisma. La solución fue aplicar el SQL de migración directamente con `prisma db execute` y registrarlo manualmente en `_prisma_migrations`.

**Punto clave 4 — Account/Broker unique constraint:** Al agregar userId, el constraint `nombre @unique` debe convertirse en `@@unique([userId, nombre])` para que distintos usuarios puedan tener cuentas/brokers con el mismo nombre. Si no se hace, el segundo usuario no puede crear una cuenta "USA" porque ya existe para el primer usuario.

---

## 24 de Marzo, 2026 — Sesión v24

### Error encontrado y corregido

**Error 1 — `result.error` y `result.message` pueden ser `undefined`**
- Causa: Las Server Actions `login`/`signup` retornan `{ error: string }` o `{ message: string }` o `undefined` (en el caso de redirect). TypeScript strict infiere el tipo de retorno como `string | undefined`, no `string | null`.
- Señal: `TS2345 Argument of type 'string | undefined' is not assignable to parameter of type 'SetStateAction<string | null>'`
- Corrección: Usar `result.error ?? null` al hacer setState para coercionar `undefined → null`.
- Regla: **cuando un Server Action retorna objetos opcionales, usar `?? null` al asignar a estado tipado como `T | null`.**

### Sin otros errores

**Punto clave — Rutas públicas en middleware:** Al agregar protección de rutas, es crítico excluir `/auth/callback` además de `/login`. Si se omite, el callback de OAuth queda bloqueado por el middleware antes de poder crear la sesión, generando un loop de redirección.

---

## 23 de Marzo, 2026 — Sesión v23

### Sin errores críticos

**Punto clave — `SortIcon` como componente interno del hook:** En lugar de exponer `col`/`dir` del hook y pasarlos como props a un componente externo `Th`, es más limpio usar el `SortIcon` que el hook retorna directamente como JSX inline en los `<th>`. Esto evita que el `active` quede desincronizado con el estado interno del hook.

---

## 23 de Marzo, 2026 — Sesión v22

### Sin errores críticos

**Punto clave 1 — Hook genérico `useSortable<T>`:** Al tipar el hook con genérico y usar `keyof T` para la columna, el compilador garantiza que solo se usan campos válidos del tipo. Evitar cualquier `as any` en el comparador: usar `a[col] < b[col]` directamente con string/number/Date funciona bien en TypeScript estricto.

**Punto clave 2 — Filtro de candidatos por fecha:** El requisito "una ejecución no puede cerrar un trade con fecha posterior" se implementa como un simple `.filter(c => c.date <= sellDate)` antes de renderizar la tabla. El filtro es en la capa UI, no en el simulador, para mantener el motor puro.

**Punto clave 3 — Leyenda de estrategia multi-cuenta:** Agrupar por account y construir la leyenda requiere deduplicar (un trade OPEN y uno CLOSED de la misma cuenta no deben aparecer dos veces). Usar `Map<account, strategy>` y luego `Array.from(map)` garantiza unicidad.

---

## 23 de Marzo, 2026 — Sesión v21

### Sin errores críticos

**Punto clave 1 — Motor de simulación como función pura:** El simulador no toca DB ni memoria global. Recibe todo lo necesario como parámetros y retorna la proyección. Esto permite llamarlo tanto para preview como para confirm sin efectos secundarios, y facilita tests.

**Punto clave 2 — Cross-import matching:** Para que un BUY y SELL del mismo lote se puedan matchear entre sí, hay que procesar las filas en orden cronológico y mantener el inventario durante el loop. Un BUY importado entra al inventario inmediatamente y puede ser consumido por un SELL posterior en el mismo lote.

**Punto clave 3 — Estado de OPEN trades en el preview:** Cuando un BUY se matchea parcialmente, el ProjectedTrade OPEN se actualiza (no se elimina y crea uno nuevo). Esto mantiene la cantidad correcta en la vista previa.

**Punto clave 4 — Confirm action re-ejecuta simulación:** En lugar de serializar el resultado de preview y pasarlo al confirm, se re-ejecuta la simulación con las mismas decisiones. Esto evita problemas de serialización de tipos complejos y garantiza consistencia con el estado actual de la BD.

---

## 23 de Marzo, 2026 — Sesión v20

### Sin errores

La validación de broker/cuenta requiere que las listas lleguen al parser como parámetros opcionales. El truco es pasarlos como `undefined` cuando están vacíos para no rechazar filas en entornos sin BD configurada.

**Punto clave:** Los errores de una fila se acumulan en array antes de decidir si es inválida. Esto permite mostrar múltiples razones en la columna Razón en vez de cortar al primer error.

---

## 23 de Marzo, 2026 — Sesión v19

### Sin errores

Sesión limpia. El parser de fechas `mm/dd/yy hh:mm:ss` requiere cuidado con el año de 2 dígitos (asumido como 20XX). Se usó regex para garantizar el parseo correcto en lugar de `new Date(string)` que es frágil con ese formato.

**Punto clave:** El parsing del CSV se hace en el cliente (componente React) antes de llamar al server action. Esto permite mostrar el preview sin roundtrip al servidor, y el server action solo recibe rows ya validadas.

**Observación:** `bulkImportExecutions` llama `resetMemoryState()` al final para forzar recarga completa en la próxima request, lo cual es necesario para que el motor de TradeUnits recalcule los matchings con las nuevas ejecuciones.

---

## 23 de Marzo, 2026 — Sesión v18

### Sin errores de lógica

La sesión fue limpia. El rename `Cuenta`→`Account` requirió cambios en 10+ archivos pero siguió un patrón sistemático sin ambigüedades.

**Punto clave:** En un rename de entidad de esta escala, hay que cubrir **4 capas en orden**: (1) interfaz/tipo TypeScript, (2) estado en memoria, (3) server actions (imports + db calls + función names), (4) UI (state + props + componentes). Saltarse el orden genera errores en cascada difíciles de rastrear.

**Observación:** La columna `cuenta` en `CashFlow` también fue parte del rename (ahora `account`). Sin el context de LASTED.md hubiera sido fácil omitirlo.

---

## 23 de Marzo, 2026 — Sesión v17

### Errores encontrados y corregidos

**Error 1 — `ensureLoaded()` CSV poisonaba el flag `isDBBacked`**
- Causa: `transactions.ts` tenía su propio `ensureLoaded()` síncrono que llamaba a `initializeMemoryState()` (CSV) → setea `isDBBacked=false`. Si cualquier función de transactions.ts (`getMemoryCuentas`, `getMemoryBrokers`, etc.) era invocada antes que trades.ts o dashboard.ts, el memoryState quedaba marcado como no-DB y NINGUNA mutación posterior escribía a la base de datos.
- Señal: datos desaparecían al recargar la página a pesar de que el código de persistencia parecía correcto.
- Corrección: reemplazar `ensureLoaded()` por versión `async` que carga desde DB (idéntica a las otras acciones). Ahora todas las `ensureDataLoaded`/`ensureLoaded` son consistentes.
- Regla: **en proyectos con múltiples archivos de server actions que comparten el mismo módulo de estado (memoryState), TODAS las funciones de inicialización deben usar la misma estrategia de carga. Un solo punto de inicialización inconsistente puede envenenar el estado global.**

**Error 2 — Brokers y Cuentas sin modelo en Prisma**
- Causa: en la sesión v16 se agregó persistencia pero se olvidó crear tablas para `Broker` y `Cuenta`. Solo existían en el hardcoded de `initializeFromDB()`.
- Señal: usuario reporta que brokers y cuentas no se persisten.
- Corrección: agregar modelos `Broker` y `Cuenta` al schema, migrar, seedear defaults, y extender `initializeFromDB()` para aceptarlos como parámetros opcionales.
- Regla: **cuando se activa persistencia, verificar que TODAS las entidades editables desde la UI tengan su tabla en la BD. No basta con persistir las entidades "principales" si hay entidades de configuración (brokers, cuentas) también editables.**

---

## 23 de Marzo, 2026 — Sesión v16

### Errores encontrados y corregidos

**Error 1 — Tests fallaban al agregar persistencia DB en mutaciones**
- Causa: Los tests de `trades.test.ts` usan `initializeMemoryState` (desde CSV) con IDs sintéticos (1, 2...). Al agregar `db.execution.create(id: 1)` en `createExecution`, el DB ya tenía ese ID del seed → violación de `UNIQUE constraint`.
- Señal: 7/42 tests fallaron con `PrismaClientKnownRequestError: Unique constraint failed on id`.
- Corrección: agregar flag `isDBBacked: boolean` al memoryState. Solo se persiste a DB cuando `isDBBacked = true` (carga desde Prisma). Los tests usan `initializeMemoryState` que setea `isDBBacked = false`, aislando completamente la BD.
- Regla: **cualquier mutation que escribe a DB debe verificar `state.isDBBacked` antes de ejecutar el query. Esto permite que tests unitarios trabajen con estado en memoria sin tocar la BD real.**

**Error 2 — `replace_all` con indentación incorrecta no reemplazó todas las ocurrencias**
- Causa: Usé 4 espacios en el patrón pero el código tenía 2 espacios en algunas funciones de dashboard.ts.
- Señal: TypeScript errores `Property 'tradeUnits' does not exist on type 'Promise<...>'` — el `await` no había sido insertado.
- Corrección: hacer replace_all con el patrón de 2 espacios por separado.
- Regla: **cuando se hace replace_all para agregar `await`, verificar con Grep primero qué indentaciones existen en el archivo para no perder ocurrencias.**

**Error 3 — Tipo incorrecto para array de Prisma transactions**
- Causa: Usé `Parameters<typeof db.$transaction>[0]` como tipo para el array de operaciones DB acumuladas, pero eso resuelve al tipo función (primer overload interactivo), no al array de PrismaPromises.
- Señal: TypeScript error `Type 'never[]' is not assignable to type '(prisma: ...) => Promise'`.
- Corrección: cambiar a `Promise<unknown>[]` y usar `Promise.all()` en lugar de `db.$transaction()`.
- Regla: **en Prisma, para batch de operaciones en memoria acumuladas, usar `Promise<unknown>[]` + `Promise.all()`. Reservar `db.$transaction()` con array solo cuando el tipo puede inferirse estáticamente.**

---

## 23 de Marzo, 2026 — Sesión v15

### Errores encontrados y corregidos

**Error 1 — Seeds legacy con modelos obsoletos (`operation`, `trade`) rompían el typecheck**
- Causa: `prisma/seed-complete.ts` y `prisma/seed-csv.ts` referenciaban los modelos `Operation` y `Trade` del schema viejo. En el refactor v10 esos modelos pasaron a `Execution` y `TradeUnit`, pero los seeds nunca se actualizaron.
- Señal: `npx tsc --noEmit` reportó 10 errores en esos dos archivos.
- Corrección: excluir los seeds del tsconfig (`"exclude": [..., "prisma/seed-complete.ts", "prisma/seed-csv.ts"]`). Los seeds son scripts de carga one-time, no forman parte del código de producción.
- Regla: **los scripts de seed/migration son infraestructura, no producción. Excluirlos del tsconfig estricto si referencian modelos legacy que ya no existen en el schema.**

**Error 2 — `prisma generate` fallaba por DLL bloqueada en Windows**
- Causa: Windows bloquea la DLL del query engine de Prisma cuando hay un proceso Node.js activo usando ese cliente.
- Señal: `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp`
- Solución: el `npm install` ejecutado durante el paso anterior ya regeneró el cliente vía `postinstall`. La regeneración manual no era necesaria.
- Regla: **en Windows, si `prisma generate` falla con EPERM, verificar si npm install (que corre postinstall) ya generó el cliente correctamente antes de intentar otra regeneración.**

### Aprendizajes de la sesión

1. **El patrón de Supabase SSR requiere exactamente dos archivos de utils**: `server.ts` (cookies de Next.js) y `client.ts` (browser). El middleware actúa como tercer pilar que refresca la sesión. Los tres son independientes pero complementarios.

2. **El connection pooler de Supabase resuelve el problema de Serverless con Prisma**: en Vercel cada Lambda puede instanciar un PrismaClient nuevo. Sin pooler, cada Lambda abriría una conexión directa a PostgreSQL, agotando el límite rápidamente. Con el pooler en puerto 6543 modo Transaction, las conexiones se comparten.

3. **`directUrl` en schema.prisma es obligatorio para migraciones**: `prisma migrate deploy` no puede usar el pooler (que no soporta DDL). Necesita la URL directa al puerto 5432. Sin `directUrl` las migraciones fallarían en producción.

---

## 23 de Marzo, 2026 — Sesión v14

### Errores encontrados y corregidos

Sin errores. TSC y lint pasaron en el primer intento.

### Aprendizajes de la sesión

1. **Mover un elemento del FilterBar al navbar requiere editar dos lugares**: el slot del FilterBar donde vivía el elemento, y el div de la derecha del `<nav>`. No alcanza con agregar en uno solo.

2. **La lógica existente dentro de una vista debe migrarse al nuevo panel sin duplicarse**: al pasar la configuración de matching a la sección "Dashboard" del sidebar, se copió el JSX existente dentro del nuevo bloque condicional y se eliminó del anterior. El estado (`configSaved`, `cuentas`) no cambia porque sigue en el mismo componente.

3. **El sidebar de configuraciones es extensible sin refactors**: agregar una nueva sección es agregar un objeto al array del map + un bloque `{configSection === "nueva-seccion" && (...)}` en el panel. Bajo costo de cambio.

---

## 23 de Marzo, 2026 — Sesión v13

### Errores encontrados y corregidos

**Error 1 — CashFlowForm tenía cuentas hardcodeadas**
- Causa: `const CUENTAS = ["USA", "Argentina", "CRYPTO"]` definido como constante de módulo. Las cuentas creadas vía CRUD de Cuentas se guardaban en `memoryState.cuentas` pero `CashFlowForm` nunca las leía.
- Señal: usuario reportó que cuentas nuevas no aparecían en el combo al abrir la pantalla Nuevo Depósito.
- Corrección: agregar prop `cuentas?: string[]` con fallback a `DEFAULT_CUENTAS`. Pasarla desde `page.tsx` con `cuentas={cuentas.map(c => c.nombre)}`.
- Regla: **ningún select de entidades del dominio (cuentas, brokers, instrumentos) debe tener opciones hardcodeadas. Siempre recibir los datos como prop desde el componente padre que tiene el estado global.**

### Sin otros errores

Ambos cambios fueron simples y TypeScript + lint pasaron en el primer intento.

### Aprendizajes de la sesión

1. **Los selects dinámicos requieren propagación explícita de estado**: `page.tsx` ya tenía `cuentas` en estado (cargadas vía `getMemoryCuentas`), pero ese estado no llegaba a `CashFlowForm`. El patrón correcto es siempre pasarlo como prop, no hardcodear opciones en el componente hijo.

2. **Revisar todos los formularios periódicamente**: el mismo problema de hardcoding podría existir en otros formularios (TradeForm, editDraft en movimientos). Conviene auditarlos para garantizar que usen datos del estado global.

---

## 22 de Marzo, 2026 — Sesión v11

### Errores encontrados y corregidos

**Error 1 — Texto blanco en vista Desagrupar (3 veces reportado)**
- Causa: `DataTable` renderiza `<td>` sin clase de color explícita. El tema oscuro hereda `text-white` en los `td`. Las columnas de `tradeUnitColumns` retornaban el valor como string sin `<span>`, con lo que el texto heredaba blanco.
- Señal: el usuario lo reportó 3 veces en sesiones consecutivas. En las dos primeras veces se agregó la clase solo en algunos renders o se creía que estaba resuelta.
- Corrección definitiva: agregar función `render: (v) => <span className="text-zinc-400">...</span>` a **TODAS** las columnas de `tradeUnitColumns`, sin excepción. Las columnas PNL mantienen sus colores semánticos.
- Regla: **cuando un bug persiste después de dos correcciones, el problema no es donde se cree. Hacer grep de todas las instancias del patrón en el archivo antes de editar.**

**Error 2 — `sed` dejó una línea sin reemplazar por diferencia de comillas**
- Causa: el comando `sed` usó comillas simples en el patrón para buscar `toLocaleDateString('es-AR')`, pero había una instancia con comillas dobles `toLocaleDateString("es-AR")` que no matcheó.
- Señal: después de correr sed, un `grep` encontró todavía la forma con comillas dobles en el archivo.
- Corrección: usar la herramienta `Edit` directamente en lugar de `sed` para reemplazos de cadenas específicas. `sed` es sensible a comillas simples/dobles dentro del patrón.
- Regla: **para reemplazos de strings en código, usar la herramienta Edit (con old_string/new_string) en lugar de sed. Edit es exacto, sed tiene problemas con quoting.**

**Error 3 — ID incorrecto en panel de confirmación MANUAL**
- Causa: al clicar "Cerrar" se guardaba `pendingClose.opId = tu.entryExecId`. En el panel de confirmación se mostraba `#{pendingClose.opId}`, que era el ID de la ejecución de entrada, no el ID del TradeUnit. El listado principal mostraba `#{tu.id}` — dos números distintos.
- Corrección: agregar `tuId: number` al tipo de `pendingClose`; asignar `tuId: tu.id` al hacer clic; mostrar `pendingClose.tuId` en el panel.
- Regla: **cuando hay dos IDs relacionados (TradeUnit.id vs Execution.id), nombrarlos explícitamente. No usar `opId` genérico que puede referirse a cualquiera de los dos.**

**Error 4 — Columnas F.ENTRADA/F.SALIDA en sub-filas aparecían al final**
- Causa: se agregaron al final de la definición del array de columnas y del JSX de sub-filas en lugar de insertarlas después del ID.
- Señal: usuario reportó "deben verse luego de la columna de ID".
- Corrección: reordenar simultáneamente la cabecera del thead, las celdas de las filas de grupo (con "—") y las celdas de las sub-filas. Los tres sitios deben estar en el mismo orden.
- Regla: **cuando una tabla tiene cabecera + filas de grupo + sub-filas como 3 secciones separadas del JSX, un reorder de columnas requiere actualizar las 3 secciones. Buscar con grep antes de editar.**

### Aprendizajes de la sesión

1. **`strategySortedTUs` siempre visible vs. solo con closeQty**: la tabla de candidatos (todos los TUs) y el panel preview (solo los que se cerrarán) son dos cosas distintas. La tabla siempre se muestra para contexto; el panel solo cuando qty+price están ingresados. Esta separación evita confusión sobre qué pasará al guardar.

2. **La hora de cierre importa para el usuario**: guardar `T12:00:00` como hora de cierre mostraba "12:00" en todos los cierres, independientemente de cuándo se hicieran. El fix `new Date(y, m-1, d, now.getH(), now.getM(), now.getS())` usa el timestamp real de la operación.

3. **`allSelectsAll` en DropdownMultiCheck resuelve dos semánticas opuestas**: el componente originalmente tenía una sola semántica ("Todos" = nada seleccionado = mostrar todo). Para "Agrupar por" se necesita la inversa ("Todos" = todo seleccionado = todas las agrupaciones activas). El prop booleano evita duplicar el componente.

4. **El contexto de sesión comprimido puede llevar a re-implementar cosas que ya estaban**: la conversación anterior fue comprimida. Al retomar, varios fixes ya estaban en el código pero el resumen no los describía con suficiente detalle. Leer el código actual antes de implementar cualquier fix ahorra trabajo duplicado.

---

## 21 de Marzo, 2026 — Sesión v9

### Errores encontrados y corregidos

**Error 1 — Primera implementación ignoró el spec de 3 bloques de UI**
- Causa: se construyó un listado con tabla HTML manual debajo del formulario, sin leer los archivos `UI.md`, `UI-List.md`, `UI-Behavior.md` primero.
- Señal: el usuario indicó "no estás respetando la funcionalidad y estética de las listas definidas en los 3 archivos de UI".
- Corrección: releer los 3 archivos de UI, luego reconstruir la vista con la arquitectura correcta: MetricCards + FilterBar compartido + DataTable existente.
- Regla: **antes de implementar cualquier vista de listado, leer UI.md + UI-List.md + UI-Behavior.md. La estructura siempre es: tarjetas de resumen arriba, FilterBar en medio, DataTable abajo.**

**Error 2 — `v || <span>` no es ReactNode válido en TypeScript strict**
- Causa: en la definición de `cashFlowColumns`, la columna `cuenta` usaba `render: (v) => v || <span className="text-zinc-600">—</span>`. TypeScript reportó que el tipo de retorno es `{}` (el tipo de `v` cuando truthy), no `ReactNode`.
- Señal: `error TS2322: Type '{}' is not assignable to type 'ReactNode'`.
- Corrección: `render: (v) => v ? String(v) : <span className="text-zinc-600">—</span>`.
- Regla: **en render props de ColumnDef, si el valor puede ser truthy pero no es ReactNode (es `unknown`), hacer cast explícito: `String(v)` o `Number(v)`. No usar `||` directamente con JSX.**

**Error 3 — FilterBar excluido de `movimientos` → faltaban filtros y bloque de búsqueda**
- Causa: al crear la vista `movimientos` se agregó a la lista de exclusión del FilterBar junto con las vistas de formulario (cuentas, brokers, nueva-op, ie). No corresponde porque movimientos es una vista de listado, no de gestión.
- Señal: la pantalla no tenía FilterBar y la búsqueda/período no funcionaban para cashflows.
- Corrección: quitar `movimientos` de la exclusión; agregar `filteredCashFlows` useMemo que filtra por `activeInterval` + `searchQuery`.
- Regla: **las vistas de listado (DataTable) siempre incluyen el FilterBar. Solo se excluye en vistas de formulario puro (cuentas, brokers, nueva-op, ie).**

### Aprendizajes de la sesión

1. **El patrón `renderEditRow` como render prop en DataTable es extensible sin romper compatibilidad**: al hacer las props opcionales (`editingRowId = null`, `renderEditRow` opcional), todos los usos existentes de DataTable siguen funcionando sin cambios. El componente detecta si hay edición activa solo cuando ambas props están presentes.

2. **El signo de los montos debe resolverse en la capa de presentación, no en el dato**: `amount` en `CashFlow` es siempre positivo. El tipo (`DEPOSIT`/`WITHDRAWAL`) determina si se muestra `+$X` o `-$X`. Esta separación simplifica comparaciones, sumas y validaciones (no hay que manejar negativos en ningún cálculo).

3. **Los selects dinámicos en row-level editing mejoran la consistencia UX**: usar `brokers` y `cuentas` del estado ya cargado (en vez de listas hardcodeadas) garantiza que las opciones del editor reflejen siempre los datos actuales del sistema. El fallback a las listas hardcodeadas aplica solo si el estado está vacío.

4. **Leer la documentación de UI primero ahorra retrabajos**: en esta sesión hubo que rehacer la vista movimientos completamente porque se implementó sin leer el spec. El costo fue de 2 prompts + tiempo. Leer UI.md, UI-List.md y UI-Behavior.md al inicio de cualquier tarea de UI es obligatorio.

---

## 21 de Marzo, 2026 — Sesión v8

### Errores encontrados y corregidos

**Error 1 — `new Date("YYYY-MM-DD")` desplaza la fecha en zonas UTC negativas**
- Causa: `new Date("2026-03-21")` sin zona horaria se interpreta como UTC midnight `2026-03-21T00:00:00.000Z`. En UTC-3, eso equivale a `2026-03-20T21:00:00` → la fecha mostrada es el día anterior.
- Señal: usuario ingresó "21/03/2026" como fecha de cierre y se guardó "20/03/2026".
- Corrección: append de `'T12:00:00'` al parsear cualquier string de fecha: `new Date(dateStr + 'T12:00:00')`. Mediodía local nunca cruza la medianoche en ninguna zona horaria UTC-11 a UTC+11.
- Aplicado en: `closeTradeWithQuantity`, `closeTradeManually`, `createOperation`, `updateOperation`, `data-loader.ts` CSV parser.
- Regla: **nunca usar `new Date("YYYY-MM-DD")` directamente. Siempre `new Date(str + 'T12:00:00')` o `parseISO` de date-fns que hace lo mismo.**

**Error 2 — `String(dateObj).slice(0, 10)` no produce un ISO string**
- Causa: Next.js server actions retornan objetos `Date` reales al cliente. Al hacer `String(dateObj)`, JavaScript llama al método `toString()` del objeto Date, que produce algo como `"Fri Mar 01 2024 12:00:00 GMT-0300 (hora estándar de Argentina)"`. Hacer `.slice(0, 10)` sobre eso produce `"Fri Mar 01"` — no es una fecha ISO válida.
- Señal: confirmación de cierre mostraba "Invalid Date" en el campo F.Entrada.
- Corrección: runtime type check: `rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate).slice(0, 10)`.
- Regla: **cuando se recibe una fecha de un server action, no asumir que es string. Verificar con `instanceof Date` antes de usar `.slice(0, 10)`. Alternativamente, serializar con `.toISOString()` en el server action antes de enviar.**

**Error 3 — `docs/func-backup-borrar.md` staged accidentalmente**
- Causa: se creó un archivo temporal durante la sesión y quedó en el staging area.
- Corrección: `git restore --staged docs/func-backup-borrar.md` antes del commit.
- Regla: **antes de `git add` masivo, revisar `git status` y listar los archivos. Preferir `git add` por archivos específicos en lugar de `git add .`.**

**Error 4 — `e2e/trades.spec.ts` no incluido en el stage inicial**
- Causa: el archivo era nuevo (untracked) y no fue capturado por el patrón de add.
- Corrección: second `git add e2e/trades.spec.ts` antes de commitear.
- Regla: **siempre revisar `git status` después del stage para confirmar que todos los archivos esperados están incluidos, especialmente los archivos nuevos (untracked).**

**Error 5 — CalendarGrid sin datos aunque existían trades intradía**
- Causa: el `dayMap` se construía con claves `String(t.openDate).slice(0, 10)`, que aplicaba el mismo bug del Error 2 — Date object no da ISO string. Las claves del mapa eran inválidas y no coincidían con las claves de días.
- Corrección: helper `toDateStr(d: unknown)` que hace el `instanceof Date` check.
- Regla: **cuando se usan fechas como claves de un mapa/diccionario, verificar que la representación es exactamente `YYYY-MM-DD`. Un carácter de diferencia hace que no haya match.**

### Aprendizajes de la sesión

1. **El bug UTC midnight es sistémico, no puntual**: cada vez que se parsea un string de fecha del usuario, del CSV o de un formulario usando `new Date("YYYY-MM-DD")`, hay riesgo de desplazamiento. La solución `T12:00:00` debe aplicarse en TODOS los puntos de parseo. Un solo punto olvidado vuelve a manifestar el bug.

2. **Next.js server actions no serializan automáticamente Date objects a strings**: la interface entre server y client retorna `Date` como objeto real, no como ISO string. Los componentes cliente deben manejar ambos casos con `instanceof Date`. Alternativa más robusta: serializar las fechas como strings en el server action antes de retornarlas.

3. **`table-fixed` sin `<colgroup>` no garantiza igualdad de anchos**: `table-fixed` distribuye el espacio sobrante en base a las primeras celdas del thead. Para garantizar que las columnas de datos (Balance, PL $, PL %, I/E) tengan exactamente el mismo ancho, es necesario el `<colgroup>` sin `style` explícito — el browser distribuye el espacio restante equitativamente.

4. **Las filas de relleno del calendario requieren lógica de numeración separada**: al numerar las semanas, no se debe contar las filas que solo tienen días de otro mes. Precomputar el array de números fuera del JSX hace el código más legible y testeable que hacerlo inline en el render.

---

## 21 de Marzo, 2026 — Sesión v7

### Errores encontrados y corregidos

**Error 1 — Filtro de período completamente ignorado en vista Posiciones Abiertas**
- Causa: la condición `if (view !== "open" && !inRange) return false` era la guard del filtro de fecha. Para `view === "open"`, la condición `view !== "open"` es `false`, por lo que nunca se ejecutaba el `return false`. El filtro de fecha era un no-op total para posiciones.
- Señal: usuario reportó "no anda el filtro de periodos en posiciones". En código era obvio una vez encontrado, pero pasó desapercibido en sesiones anteriores porque la intención original era "no filtrar posiciones abiertas por fecha" — luego el requerimiento cambió.
- Corrección: reescribir la lógica usando una variable semántica `isOpenTrade` en vez de anidar lógica negativa con `view !== "open"`. El nuevo código es más legible y explícito.
- Regla: **evitar condiciones negativas compuestas como `if (A !== X && !B)`. Extraer a variable nombrada: `const skipFilter = A !== X`. Código más legible, bugs más visibles.**

**Error 2 — `getOpenPositions()` no devolvía `cuenta` ni `date`**
- Causa: al agregar la tabla de posiciones abiertas en la UI, se referenciaba `item.cuenta` e `item.date`, pero `getOpenPositions()` no incluía esos campos en el objeto de retorno.
- Consecuencia visible: columna Cuenta mostraba siempre "USA" (fallback en JSX), columna Fecha podía dar error o mostrar fecha inválida.
- Corrección: añadir `cuenta: op.cuenta || 'USA'` y `date: op.date` al objeto retornado por `getOpenPositions()`.
- Regla: **cuando se agrega una columna nueva a una tabla, verificar que el server action devuelve el campo. La UI puede tener fallbacks silenciosos (`item.cuenta || 'USA'`) que ocultan que el dato real nunca llega.**

**Error 3 — `onClosePosition` usaba precio de mercado en vez del precio del formulario**
- Causa: `handleClosePosition` en `page.tsx` buscaba el precio en `pos.currentPrice` (precio de mercado del open position). Si el usuario quería cerrar a un precio distinto (precio de venta real), no había forma de hacerlo.
- Corrección: cambiar la firma de `onClosePosition` a `(id, quantity, price, date)` y leer esos valores del formulario en el momento del clic ("Cerrar"). El formulario es el canal correcto para ingresar datos de la operación de cierre.
- Regla: **en un formulario de cierre de posición, los datos de cierre (precio, fecha, cantidad) deben venir del formulario, no de datos calculados del servidor. El usuario controla esos valores.**

### Aprendizajes de la sesión

1. **La lógica FIFO de cierre parcial es compleja pero testeable por casos**: los tres escenarios (equal, less, greater) son independientes y verificables. La clave es manejar correctamente el "split" del open operation (crear nuevo op con el remanente y redirigir el open trade record).

2. **Los tooltips de métricas no necesitan estado por métrica, sino un índice global**: usar un único `activeTooltip: number | null` con un índice único por métrica (100+i para evitar colisión con otras tarjetas) es suficiente. Clic en la misma tarjeta hace toggle.

3. **Al añadir un nuevo tipo de entidad (Broker) al memoryState, siempre recordar**: actualizar `resetMemoryState()` con el array vacío del nuevo tipo. Sin esto, los tests de integración contaminan el estado entre runs.

---

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

3. **Yahoo Finance se llama desde dos server actions en paralelo** (`getTrades` y `getOpenPositions`): el `priceCache` a nivel de módulo evita el doble fetch para el mismo símbolo en la misma sesión del servidor.

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
