# Misión 03 — Agente de UI/UX

## Rol
Eres el responsable de toda la interfaz de usuario, componentes, páginas y experiencia visual del proyecto **Gestión de Inversiones**.

---

## Contexto del proyecto

- Stack: Next.js App Router, TypeScript estricto, Tailwind CSS.
- Guardrail crítico: **Los componentes UI nunca importan `@prisma/client` ni `@/server/**`**. Solo consumen datos via Server Actions o props.
- Filosofía de diseño: **Dark Mode Moderno con Glassmorphism sutil + Alta densidad de datos**.

---

## Sistema de Diseño (fuente: `docs/ui/UI.md` y `docs/ui/UI-List.md`)

### Paleta y Tipografía

| Elemento | Especificación Tailwind |
|---|---|
| Títulos de sección | `text-xs font-bold uppercase tracking-wider text-zinc-400` |
| Valores destacados | `text-xl font-semibold` |
| Cuerpo de tabla | `text-sm font-normal` |
| Nombres de ítems | `text-sm font-extrabold` |
| Cabeceras de tabla | `text-[10px] uppercase text-zinc-500` |

### Layout de Listados (3 bloques)

```
┌─────────────────────────────────────┐
│  BLOQUE 1: Tarjetas de métricas     │  Grid N columnas, borde superior de color
├─────────────────────────────────────┤
│  BLOQUE 2: Filtros y controles      │  Pills de período + búsqueda full-width
├─────────────────────────────────────┤
│  BLOQUE 3: Tabla de alta densidad   │  py-1, cabeceras 10px, ordenable
└─────────────────────────────────────┘
```

### Tokens de diseño

- **Densidad**: `py-1` en filas de tabla (máximo `py-2`).
- **Altura de fila**: < 40px.
- **Corners**: `rounded-lg` para contenedores, `rounded-md` para interactivos.
- **Positivos**: `text-emerald-400`.
- **Negativos/alertas**: `text-orange-400` o `text-red-400`.
- **Activo/acento**: `bg-blue-600` o `bg-blue-500`.
- **Fondo de dropdowns**: `bg-zinc-900` (sólido y opaco).
- **Glassmorphism**: `backdrop-blur-sm bg-white/5 border border-white/10`.

---

## Estado actual (lo que YA existe)

| Artefacto | Estado |
|---|---|
| `src/app/page.tsx` | Existe. Dashboard básico (521 líneas). Revisar y completar. |
| `src/components/dashboard/YieldsGrid.tsx` | Existe. Grid de rendimientos parcial. |
| `src/components/dashboard/TradeForm.tsx` | Existe en `src/app/`. Formulario básico. |

---

## Tareas pendientes (lo que FALTA hacer)

### 1. Layout principal y navegación

Archivo: `src/app/layout.tsx`

Implementar sidebar/navbar con navegación a:
- `/` → Dashboard
- `/operations` → Listado de Operaciones
- `/trades` → Listado de Trades
- `/new-operation` → Alta de Operación

Estilo: dark sidebar compacto, íconos + labels.

### 2. Página: Alta de Operación (`/new-operation`)

Archivo: `src/app/new-operation/page.tsx`
Componente: `src/components/operations/OperationForm.tsx`

**Método 1: Formulario tradicional**
Campos (todos los de `docs/domain/requirements.md`):
- Fecha (datepicker, default hoy)
- Símbolo (input text, uppercase automático, placeholder "AAPL")
- Tipo (BUY / SELL, toggle botones)
- Cantidad (número positivo, placeholder "10")
- Precio (número decimal, placeholder "150.00")
- Monto (calculado automáticamente: cantidad × precio, read-only)
- Broker (select: AMR, IOL, PP, default AMR)
- Falopa (checkbox)
- Intra (checkbox)

**Método 2: Pegado rápido**
- `<textarea>` con placeholder: `"AAPL 10 150.50 BUY 2024-01-15"`
- Botón "Parsear" → pre-rellena el formulario tradicional.
- El usuario puede editar los campos antes de guardar.

**Comportamiento de cierre manual:**
- Si se ingresa una operación SELL y existen múltiples BUY abiertas del mismo símbolo → mostrar modal/panel con lista de operaciones abiertas para elegir cuál cerrar.
- Cada opción muestra: fecha de apertura, precio de entrada, cantidad, rendimiento proyectado.

### 3. Componente reutilizable: DataTable (`src/components/ui/DataTable.tsx`)

Implementar una tabla genérica que cumpla con `docs/ui/UI-List.md`:

```tsx
interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  onSort?: (col: string, dir: "asc" | "desc") => void
  onRowAction?: (action: "view" | "edit" | "delete", row: T) => void
}
```

Características obligatorias:
- **Cabeceras ordenables**: flecha `↕` → clic alterna ASC/DESC.
- **Hover state**: `hover:bg-white/5` en filas.
- **Columna ACCIONES** (siempre última): íconos Lupa, Lápiz, Papelera.
- **Alineación**: texto → izquierda, números → derecha, fechas → centro.
- **Densidad**: `py-1 px-3` en celdas.
- **Header de metadatos**: "N REGISTROS" + selector de filas (25/50/100/Todos).
- **Paginación** client-side.

### 4. Componente reutilizable: FilterBar (`src/components/ui/FilterBar.tsx`)

```tsx
// Período chips: Hoy | Esta semana | Últ. 7 días | Este mes | Mes anterior | Este año | Todo | Personalizado
// Si "Personalizado" → mostrar 2 date pickers + botón aplicar
// Búsqueda: input full-width con ícono lupa
// Botón "Columnas" → dropdown para mostrar/ocultar columnas (bg-zinc-900, opaco)
```

### 5. Página: Listado de Operaciones (`/operations`)

Archivo: `src/app/operations/page.tsx`

**Bloque 1 - Métricas:**
- Total de operaciones
- Operaciones abiertas
- Operaciones cerradas
- Capital invertido (suma de amounts abiertos)

**Bloque 2 - Filtros:**
- FilterBar con período y búsqueda.
- Filtro adicional: Estado (Todas / Abiertas / Cerradas), Broker (All / AMR / IOL / PP).

**Bloque 3 - Tabla:**
Columnas: ID | Fecha | Símbolo | Tipo | Cantidad | Precio | Monto | Broker | Estado | Falopa | Intra | ACCIONES

Comportamiento especial (fuente: `docs/ui/UI-Behavior.md`):
- **Precio de salida en abiertas**: mostrar precio actual (fetch desde price-fetcher).
- **Fecha de salida en abiertas**: mostrar fecha de hoy.
- Badge de estado: `ABIERTA` (azul) / `CERRADA` (zinc).

### 6. Página: Listado de Trades (`/trades`)

Archivo: `src/app/trades/page.tsx`

**Bloque 1 - Métricas:**
- Total trades cerrados
- Win Rate (% positivos)
- Mejor trade (mayor returnPercent)
- P&L total

**Bloque 2 - Filtros:**
- FilterBar con período, búsqueda.
- Filtro: Instrumento (STOCK / CEDEARS / BTC / All), Broker.

**Bloque 3 - Tabla:**
Columnas: ID | F.Entrada | F.Salida | Símbolo | Qty | P.Entrada | P.Salida | M.Entrada | M.Salida | Días | Rdto $ | Rdto % | TNA | Broker | ACCIONES

Semántica de color en Rdto $: verde si positivo, naranja/rojo si negativo.

### 7. Dashboard Principal (`/`)

Archivo: `src/app/page.tsx` (refactorizar el existente)

#### 7a. Grid de Rendimientos por Cuenta y Período (ya parcial en `YieldsGrid.tsx`)
- Mostrar cuadro por broker (AMR, IOL, PP).
- Columnas: Mes | Saldo | PL USD | PL % | I/E (Ingresos/Extracciones).
- Footer con suma de totales.
- Encabezados de cuadro con nombre del broker.

#### 7b. Estadísticas — Tarjetas resumen
- Operaciones abiertas / cerradas / positivas / negativas.
- Promedio de size.
- Volumen por período (barras o lista).

#### 7c. Rankings
- Top 5 trades (tabla compacta: símbolo, fecha, rdto $, rdto %).
- Mejor mes (mes + total ganado).
- Mayor rendimiento de un trade (símbolo + %).

#### 7d. Rendimiento por instrumento
- 3 tarjetas o barra: STOCKS | CEDEARS | BTC con P&L total de cada uno.

### 8. Componente: MetricCard (`src/components/ui/MetricCard.tsx`)

```tsx
interface MetricCardProps {
  title: string        // 11px, uppercase
  value: string        // 20px, bold
  subtitle?: string    // texto chico debajo del valor
  accentColor: "blue" | "emerald" | "orange" | "purple"
}
```
Borde superior con el color del acento. Glassmorphism sutil.

---

## Reglas que debes cumplir

- Cero imports de `@prisma/client` o `@/server/**` en componentes.
- Todos los datos llegan via props o Server Actions llamadas desde Server Components.
- `py-1` máximo en filas de tabla, nunca más padding.
- Inputs siempre con `placeholder`.
- Semántica de color: verde=positivo, naranja/rojo=negativo, azul=activo.
- Consistencia visual absoluta entre todos los dropdowns: `bg-zinc-900` sólido.

---

## Entregables esperados

1. `src/app/layout.tsx` — navegación completa.
2. `src/app/new-operation/page.tsx` — alta con formulario + pegado rápido + cierre manual.
3. `src/app/operations/page.tsx` — listado completo con filtros y precios en vivo.
4. `src/app/trades/page.tsx` — listado completo con filtros y colores semánticos.
5. `src/app/page.tsx` — dashboard con todas las secciones de stats.
6. `src/components/ui/DataTable.tsx` — tabla genérica reutilizable.
7. `src/components/ui/FilterBar.tsx` — barra de filtros con período y búsqueda.
8. `src/components/ui/MetricCard.tsx` — tarjeta de métrica reutilizable.
