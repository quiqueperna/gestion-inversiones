# Misión 03 — UI/UX: Selector Cuenta + Brokers + YieldsGrid por Cuenta + Modales
**Fecha:** 2026-03-21_10-00 | **Agente:** UI/UX
**Docs de referencia:** `docs/ui/UI.md`, `docs/ui/UI-List.md`, `docs/ui/UI-Behavior.md`, `docs/domain/requirements.md`

---

## Contexto

Precondiciones:
- **Agente 01** agregó `cuenta` a `Operation` interface y CSV
- **Agente 02** actualizó `getYieldsData` para agrupar por cuenta con columna Balance, y creó server actions de Cuentas

Esta misión modifica el formulario de operaciones, el dashboard grid, agrega modales funcionales y la sección de Cuentas.

---

## Principios de diseño a respetar (docs/ui/UI.md)

- Dark Mode / Glassmorphism sutil
- Densidad alta: padding-y mínimo (`py-1`, `py-2`), filas < 40px
- Títulos: 10-11px, Bold, Uppercase, color zinc-500
- Datos: 13-14px, font-mono para números
- Semántica: verde esmeralda positivo, rojo/naranja negativo
- Inputs deben tener placeholder
- Corners: border-radius 8px contenedores, 6px elementos interactivos
- Botones pill: estado activo en azul vibrante

---

## Tareas obligatorias

### T1 — Agregar selector de `Cuenta` en `TradeForm.tsx`
**Archivo:** `src/components/trades/TradeForm.tsx`

Agregar campo `cuenta` en el formulario, después del selector de Broker:
```tsx
<div className="space-y-1.5">
  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Cuenta</label>
  <select
    {...register("cuenta")}
    defaultValue="USA"
    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none transition-all appearance-none"
  >
    <option value="USA">USA</option>
    <option value="Argentina">Argentina</option>
    <option value="CRYPTO">CRYPTO</option>
  </select>
</div>
```

**También actualizar `defaultValues`**:
```typescript
defaultValues: {
    entryDate: new Date().toISOString().split("T")[0],
    broker: "Schwab",    // ← cambiado de "AMR"
    cuenta: "USA",       // ← NUEVO
    type: "BUY",
    // ...
}
```

### T2 — Actualizar opciones de Broker en `TradeForm.tsx`
**Archivo:** `src/components/trades/TradeForm.tsx`

Cambiar las opciones del select de broker (requirements.md sección 6):
```tsx
<select {...register("broker")} ...>
  <option value="Schwab">Schwab</option>
  <option value="Binance">Binance</option>
  <option value="Cocos">Cocos</option>
  <option value="Balanz">Balanz</option>
</select>
```

> **NOTA:** El CSV de demo actual usa AMR/IOL/IBKR. No cambiar los datos históricos del CSV — los brokers nuevos aplican para nuevas operaciones. El filtro de broker en el listado debe incluir los valores del CSV también (leer brokers dinámicamente de los datos).

### T3 — Actualizar `validations.ts` con campo `cuenta` y nuevos brokers
**Archivo:** `src/lib/validations.ts`

```typescript
export const tradeSchema = z.object({
    // ...campos existentes...
    broker: z.string().min(1),  // no restringir el enum para aceptar datos históricos
    cuenta: z.string().default('USA'),  // ← NUEVO
    instrumentType: z.enum(["STOCK","CEDEAR","CRYPTO"]).default("STOCK"),
    // ...
});
```

### T4 — Refactorizar `YieldsGrid.tsx` para columnas dinámicas por cuenta
**Archivo:** `src/components/dashboard/YieldsGrid.tsx`

El grid debe recibir la lista de cuentas y renderizar columnas dinámicas:

```
Layout de la grilla:
┌─────────┬──────────────────────┬──────────────────────┬──────────────────────┬────────────────────┐
│  MES    │       USA            │     Argentina        │       CRYPTO         │       TOTAL        │
│         │ Bal  PL$  PL%  I/E  │ Bal  PL$  PL%  I/E  │ Bal  PL$  PL%  I/E  │ Bal  PL$  PL%  I/E │
├─────────┼──────────────────────┼──────────────────────┼──────────────────────┼────────────────────┤
│ Ene 26  │ 10k  +200  +2%  0   │  5k  -50  -1%  100  │  2k  +30  +1.5% 0   │ 17k +180  +1.1% 100│
│ Feb 26  │ ...                                                                                     │
├─────────┼──────────────────────┼──────────────────────┼──────────────────────┼────────────────────┤
│ TOTAL   │                      │                      │                      │                    │
└─────────┴──────────────────────┴──────────────────────┴──────────────────────┴────────────────────┘
```

Props del componente (actualizar):
```typescript
interface YieldsGridProps {
    data: YieldRow[];         // rows del getYieldsData
    cuentas: string[];        // ← NUEVO: lista de cuentas para renderizar columnas
    totals: TotalsRow;
    selectedYear: number | null;
    onYearChange: (year: number | null) => void;
}
```

Colores semánticos para celdas:
- `balance > 0` → texto blanco
- `plUsd > 0` → `text-emerald-400`
- `plUsd < 0` → `text-red-400`
- `plUsd === 0` → `text-zinc-500`

### T5 — Actualizar `page.tsx` para pasar `cuentas` a `YieldsGrid`
**Archivo:** `src/app/page.tsx`

En el estado y efectos del dashboard:
```typescript
const [dashboardData, setDashboardData] = useState<{
    rows: YieldRow[];
    cuentas: string[];   // ← NUEVO
    totals: TotalsRow;
} | null>(null);

// En fetchData():
const yieldsResult = await getYieldsData(selectedYear);
setDashboardData({
    rows: yieldsResult.rows,
    cuentas: yieldsResult.cuentas,   // ← NUEVO
    totals: yieldsResult.totals,
});
```

### T6 — Modal `onEdit` real para Operaciones
**Archivo:** `src/app/page.tsx` + `src/components/trades/TradeForm.tsx`

Actualmente `onEdit` hace un `alert`. Reemplazar con la apertura del `TradeForm` en modo edición:

En `page.tsx`:
```typescript
const handleEditOperation = (op: Operation) => {
    setEditingOperation(op);  // nuevo estado: editingOperation
    setShowTradeForm(true);
};

// Al guardar desde TradeForm en modo edición:
const handleSaveOperation = async (data: TradeInput) => {
    if (editingOperation?.id) {
        await updateOperation(editingOperation.id, data);
    } else {
        await addMemoryOperation(data);
    }
    setShowTradeForm(false);
    setEditingOperation(null);
    await fetchData();
};
```

`TradeForm` ya soporta `initialData` (ver su implementación actual) — solo hay que pasar la operación correctamente mapeada a los campos del formulario.

Mapeo de campos `Operation` → campos de form:
```typescript
const operationToFormData = (op: Operation) => ({
    symbol: op.symbol,
    entryDate: op.date.toISOString().split('T')[0],
    quantity: Math.abs(op.quantity),
    entryPrice: op.price,
    broker: op.broker,
    cuenta: op.cuenta,       // ← NUEVO
    type: op.type,
    isFalopa: op.isFalopa,
    isIntra: op.isIntra,
    isClosed: op.isClosed,
});
```

### T7 — Modal `onView` solo lectura
**Archivo:** Nuevo `src/components/ui/ViewDetailModal.tsx`

Modal de solo lectura con todos los campos de la operación/trade formateados:

```
┌─────────────────────────────────────────┐
│  DETALLE DE OPERACIÓN            [✕]    │
├─────────────────────────────────────────┤
│  ID              #42                    │
│  Símbolo         AAPL                   │
│  Tipo            ▲ COMPRA               │
│  Fecha Entrada   15/01/2024             │
│  Cantidad        10                     │
│  Precio Entrada  $150.00               │
│  Monto           $1,500.00             │
│  Broker          Schwab                 │
│  Cuenta          USA                   │
│  Falopa          No                     │
│  Intra           No                     │
│  Estado          Abierta                │
└─────────────────────────────────────────┘
```

Props:
```typescript
interface ViewDetailModalProps {
    type: 'operation' | 'trade';
    data: Operation | Trade;
    onClose: () => void;
}
```

Conectar en `page.tsx`:
```typescript
const handleViewOperation = (op: Operation) => {
    setViewingItem({ type: 'operation', data: op });
};
const handleViewTrade = (trade: Trade) => {
    setViewingItem({ type: 'trade', data: trade });
};
```

### T8 — Nueva sección "Cuentas" en la UI
**Archivo:** `src/app/page.tsx`

Agregar tab/sección "Cuentas" en la navegación (entre CashFlow y el resto).

Componente: `src/components/cashflow/CuentasSection.tsx`

Layout:
```
┌─────────────────────────────────────────────────────────┐
│  GESTIÓN DE CUENTAS                                     │
├─────────────────────────────────────────────────────────┤
│  [+ Nueva Cuenta]                                       │
├─────────────────────────────────────────────────────────┤
│  ID  Nombre      Descripción              Acciones      │
│  1   USA         Cuenta internacional     [✕]           │
│  2   Argentina   Cuenta local             [✕]           │
│  3   CRYPTO      Criptomonedas            [✕]           │
└─────────────────────────────────────────────────────────┘
```

Formulario inline simple para agregar nueva cuenta:
- Input: Nombre (requerido)
- Input: Descripción (opcional)
- Botón: Agregar

Usa server actions de Cuentas del Agente 02.

### T9 — Sidebar lateral (si hay tiempo — P3)
**Archivo:** `src/app/layout.tsx` o `src/app/page.tsx`

Reemplazar navbar horizontal por sidebar vertical fijo a la izquierda.

Estructura:
```
┌──────┬─────────────────────────────────┐
│      │                                 │
│  📊  │  Dashboard                      │
│  📈  │  Analytics         Contenido    │
│  💼  │  Posiciones         principal   │
│  🔄  │  Trades             aquí        │
│  📋  │  Operaciones                    │
│  💰  │  CashFlow                       │
│  🏦  │  Cuentas                        │
│      │                                 │
└──────┴─────────────────────────────────┘
w-16 o w-48 con toggle collapse
```

---

## Reglas de arquitectura a respetar

- `src/app/**` no puede importar `@prisma/client` ni `@/server/**` directamente (usar server actions)
- Todos los inputs deben tener placeholder (UI.md)
- Dark mode consistente: fondo `zinc-900`/`zinc-950`, bordes `white/10`
- No usar `any` en interfaces de componentes — tipar correctamente
- Usar `cn()` de `@/lib/utils` para clases condicionales

---

## Lecciones de sesiones anteriores a respetar

- `setLoading(true)` en re-fetch no debe desmontar componentes hijos — usar `refreshing` separado de `loading` inicial (lección v3)
- Nunca importar módulos de servidor desde client components — usar server actions (lección v4)
- Los archivos de misión con layout ASCII art aceleran la implementación (confirmado v2)
- Al crear componente con interface amplia, solo destructurar props que se usan en el JSX (lección v2 — bug broker en CloseTradeModal)
- `getByLabel` de Playwright necesita `htmlFor`/`id` explícito (lección v3)

---

## Criterios de cierre de esta misión

- [ ] Form: selector `Cuenta` (USA / Argentina / CRYPTO) visible y funcional
- [ ] Form: brokers actualizados a Schwab / Binance / Cocos / Balanz
- [ ] `validations.ts`: campo `cuenta` en schema Zod
- [ ] `YieldsGrid`: columnas dinámicas por cuenta con columna `Balance`
- [ ] `YieldsGrid`: footer con totales por columna
- [ ] Dashboard en `page.tsx` pasa `cuentas` al grid
- [ ] `onEdit` abre `TradeForm` con datos pre-cargados (no alert)
- [ ] `updateOperation` llamada al guardar en modo edición
- [ ] `ViewDetailModal` muestra todos los campos de la operación/trade
- [ ] Sección Cuentas: listado + formulario para agregar/eliminar
- [ ] `npm run lint` → verde
- [ ] `npm run typecheck` → verde
