# Misión 03 — Agente de UI/UX
**Fecha:** 2026-03-20 | **Versión:** 2 | **Prioridad:** P1 + P2 + P3

## Origen
Pendientes de `bitacora/pendientes.md`:
- **P1.1** — Modal de cierre manual de trade (CloseTradeModal)
- **P1.2** — Acciones de tabla funcionales conectadas en page.tsx
- **P1.3** — Formulario CashFlow (UI)
- **P2.9** — Filtros adicionales: Estado (Abierta/Cerrada) y Broker en Operaciones; Instrumento en Trades
- **P2.10** — Mejor mes y mejor trade visibles en Dashboard
- **P3.11** — Botón exportar CSV en DataTable
- **P3.12** — Sidebar lateral fijo
- **P3.13** — Selector de instrumento en TradeForm
- **P3.14** — Curva de equity en Analytics

## Design System (fuente: `docs/ui/UI.md` y `docs/ui/UI-List.md`)

- Dark Mode Glassmorphism sutil
- Alta densidad: `py-1` en celdas, altura de fila < 40px
- Tipografía: títulos `text-[10px] uppercase tracking-widest`, valores `text-xl font-semibold`
- Colores semánticos: `text-emerald-400` positivo, `text-red-400` negativo, `bg-blue-600` activo
- Dropdowns/popovers: `bg-zinc-900` sólido y opaco
- Corners: `rounded-lg` contenedores, `rounded-md` interactivos
- Inputs: siempre con `placeholder`

---

## Tarea 1 — CloseTradeModal (P1 — BLOQUEANTE)

**Archivo nuevo:** `src/components/trades/CloseTradeModal.tsx`

### Requerimiento (fuente: `docs/domain/core.md`)
> "Implementa una en la cual yo pueda elegir manualmente contra qué operación abierta puedo cerrar."

### Comportamiento
1. Se abre cuando el usuario crea una operación SELL (en `TradeForm.tsx`) y existen **2 o más** operaciones BUY abiertas del mismo símbolo con la misma cantidad.
2. Si solo hay 1 operación abierta → cierra automáticamente sin modal.
3. Si hay 0 operaciones abiertas → la SELL queda como apertura de short (operación abierta).

### Props del componente

```tsx
interface CloseTradeModalProps {
  symbol: string;
  closeQuantity: number;
  closePrice: number;
  closeDate: string;
  broker: string;
  openOperations: Array<{
    id: number;
    date: Date;
    quantity: number;
    price: number;
    amount: number;
    broker: string;
    days: number;
  }>;
  onConfirm: (openOperationId: number) => Promise<void>;
  onCancel: () => void;
}
```

### Layout del modal

```
┌─────────────────────────────────────────────────────┐
│  CERRAR TRADE — {SYMBOL}                        [X] │
├─────────────────────────────────────────────────────┤
│  Vendés {cantidad} a ${precio}                      │
│  Seleccioná la operación de apertura a cerrar:      │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ ○  F.Entrada   Cant   P.Entrada   Rdto Proy.  │  │
│  │    12/01/2024   10    $150.00    +$100 (+6.7%)│  │
│  ├───────────────────────────────────────────────┤  │
│  │ ○  03/02/2024   10    $145.00    +$150 (+10%) │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  [Cancelar]              [Confirmar Cierre]         │
└─────────────────────────────────────────────────────┘
```

- Cada fila muestra el rendimiento proyectado calculado en tiempo real: `(closePrice - openPrice) * quantity`
- La fila seleccionada se resalta con `bg-blue-900/20 border border-blue-500/30`
- El botón Confirmar solo se activa cuando hay una fila seleccionada
- Botón Confirmar: `bg-emerald-600 hover:bg-emerald-500` si el trade es positivo, `bg-blue-600` si es negativo

### Integración en TradeForm.tsx

En el handler `onSubmit` del form, cuando `type === 'SELL'`:
```typescript
// 1. Llamar a getOpenOperationsForClosing(symbol, 'SELL')
// 2. Si openOps.length === 0 → crear operación SELL normal (queda abierta)
// 3. Si openOps.length === 1 → llamar closeTradeManually automáticamente
// 4. Si openOps.length > 1 → mostrar CloseTradeModal
```

---

## Tarea 2 — Acciones de tabla funcionales (P1)

**Archivo:** `src/app/page.tsx`

### Vista Operaciones
Conectar los handlers de `DataTable` `onView`, `onEdit`, `onDelete`:

**onDelete:**
```typescript
const handleDeleteOperation = async (row: any) => {
  if (!confirm(`¿Eliminar operación #${row.id} (${row.symbol})?`)) return;
  await deleteOperation(row.id); // importar de trades.ts
  fetchData();
};
```

**onEdit:**
- Abrir `TradeForm` con `initialData` pre-relleno con los campos de la operación seleccionada.
- Al guardar, llamar `updateOperation(id, data)` en vez de `createOperation`.

**onView:**
- Abrir un drawer/modal de solo lectura que muestre todos los campos de la operación.
- Puede ser un componente simple `OperationDetailModal.tsx`.

### Vista Trades
- `onDelete`: confirmar y llamar a un `deleteTrade(id)` (agregar a `trades.ts`).
- `onView`: modal de detalle con todos los campos del Trade.
- `onEdit`: los trades cerrados no deberían editarse directamente (mostrar mensaje informativo).

---

## Tarea 3 — Formulario CashFlow (P1)

**Archivo nuevo:** `src/components/cashflow/CashFlowForm.tsx`

### Campos (fuente: `docs/domain/requirements.md` — Dashboard I/E)
- Fecha (date input, default hoy, placeholder "dd/mm/aaaa")
- Tipo: DEPOSIT / WITHDRAWAL (toggle buttons, verde/rojo)
- Monto (número positivo, placeholder "10000")
- Broker (select: AMR / IOL / IBKR / PP)
- Descripción (text input opcional, placeholder "Depósito inicial")

### Cómo integrarlo en page.tsx

Agregar en la navbar un botón "I/E" o "Depósito/Retiro" que abra el modal de CashFlow.
Al guardar → llamar `addMemoryCashFlow()` → `fetchData()` para refrescar el dashboard.

---

## Tarea 4 — Filtros adicionales en listados (P2)

**Archivo:** `src/app/page.tsx` — dentro del bloque de FilterBar de cada vista.

### Operaciones — filtros extra
Debajo del `FilterBar` existente, agregar una fila de pills de filtro rápido:

```tsx
{/* Solo visible en view === 'operations' */}
<div className="flex gap-2 items-center">
  <span className="text-[10px] uppercase text-zinc-600 font-bold">Estado</span>
  {['Todas', 'Abiertas', 'Cerradas'].map(estado => (
    <button key={estado} onClick={() => setEstadoFilter(estado)}
      className={cn("px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
        estadoFilter === estado ? "bg-blue-600 text-white" : "text-zinc-400 hover:bg-white/5")}>
      {estado}
    </button>
  ))}
  <span className="text-[10px] uppercase text-zinc-600 font-bold ml-3">Broker</span>
  {['Todos', 'AMR', 'IOL', 'IBKR'].map(b => (
    <button key={b} onClick={() => setBrokerFilter(b)}
      className={cn("px-3 py-1 rounded-lg text-[11px] font-medium transition-all",
        brokerFilter === b ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-white/5")}>
      {b}
    </button>
  ))}
</div>
```

Agregar estados: `const [estadoFilter, setEstadoFilter] = useState('Todas')` y `const [brokerFilter, setBrokerFilter] = useState('Todos')`.

Actualizar `filteredList` para que aplique estos filtros.

### Trades — filtro por instrumento
Mismo patrón, opciones: `Todos | STOCK | CEDEAR | CRYPTO`.
Estado: `const [instrumentFilter, setInstrumentFilter] = useState('Todos')`.

---

## Tarea 5 — Dashboard: mejor mes y mejor trade (P2)

**Archivo:** `src/app/page.tsx` — sección dashboard, después de Top 5 Trades.

Los datos ya están en `topStats` (viene de `getTopStats()`). Mostrarlos:

```tsx
{topStats && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Mejor Mes */}
    {topStats.bestMonth && (
      <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🗓 Mejor Mes</p>
        <p className="text-xl font-black text-emerald-400">
          ${Math.round(topStats.bestMonth.total).toLocaleString()}
        </p>
        <p className="text-[11px] text-zinc-500 mt-1">{topStats.bestMonth.month}</p>
      </div>
    )}
    {/* Mejor Trade */}
    {topStats.bestReturnTrade && (
      <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">🏆 Mejor Trade</p>
        <p className="text-xl font-black text-emerald-400">
          {topStats.bestReturnTrade.returnPercent.toFixed(1)}%
        </p>
        <p className="text-[11px] text-zinc-500 mt-1">
          {topStats.bestReturnTrade.symbol} — ${Math.round(topStats.bestReturnTrade.returnAmount).toLocaleString()}
        </p>
      </div>
    )}
  </div>
)}
```

---

## Tarea 6 — Exportar CSV desde DataTable (P3)

**Archivo:** `src/components/ui/DataTable.tsx`

Agregar prop opcional `onExport` y botón en la barra de metadatos:

```tsx
interface DataTableProps<T> {
  // ...props existentes...
  onExport?: () => void; // callback que el padre implementa
}

// En la barra de metadatos (header del DataTable):
{onExport && (
  <button onClick={onExport}
    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors border border-white/5">
    <Download className="w-3 h-3" /> CSV
  </button>
)}
```

En `page.tsx`, pasar el handler usando `csv-exporter.ts`:
```typescript
const handleExportTrades = () => {
  const csv = exportToCSV(filteredList, tradeColumns.map(c => ({ key: c.key, header: c.header })));
  downloadCSV(csv, `trades-${new Date().toISOString().split('T')[0]}.csv`);
};
```

---

## Tarea 7 — Selector de instrumento en TradeForm (P3)

**Archivo:** `src/components/trades/TradeForm.tsx`

Agregar campo después del broker:
```tsx
<div className="space-y-1.5">
  <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Instrumento</label>
  <select {...register("instrumentType")}
    className="w-full px-3 py-2 bg-zinc-950 border border-white/10 rounded-[6px] text-[14px] focus:border-blue-500 outline-none appearance-none">
    <option value="STOCK">STOCK (USA)</option>
    <option value="CEDEAR">CEDEAR (Argentina)</option>
    <option value="CRYPTO">CRYPTO</option>
  </select>
</div>
```

Agregar `instrumentType: z.enum(["STOCK", "CEDEAR", "CRYPTO"]).default("STOCK")` al schema en `validations.ts`.

---

## Tarea 8 — Curva de Equity en Analytics (P3)

**Archivo:** `src/app/page.tsx` — sección Analytics

Los datos vienen de `getEquityCurve()` (implementada en Misión 02). Visualización simple sin librería de gráficos — usar SVG o una representación de barras:

```tsx
{equityCurve && equityCurve.length > 0 && (
  <div className="bg-zinc-900/50 rounded-lg border border-white/5 p-4">
    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
      Curva de Equity Acumulada
    </p>
    {/* Mini sparkline SVG */}
    <div className="h-24 flex items-end gap-px">
      {equityCurve.map((point, i) => {
        const maxVal = Math.max(...equityCurve.map(p => Math.abs(p.equity)));
        const height = maxVal > 0 ? Math.abs(point.equity) / maxVal * 100 : 0;
        return (
          <div key={i} title={`${point.date}: $${point.equity}`}
            style={{ height: `${height}%` }}
            className={cn("flex-1 min-h-[2px] rounded-t-sm transition-all",
              point.equity >= 0 ? "bg-emerald-500" : "bg-red-500")} />
        );
      })}
    </div>
    <div className="flex justify-between mt-1 text-[10px] text-zinc-600">
      <span>{equityCurve[0]?.date}</span>
      <span className={cn("font-bold", equityCurve.at(-1)?.equity ?? 0 >= 0 ? "text-emerald-400" : "text-red-400")}>
        ${Math.round(equityCurve.at(-1)?.equity ?? 0).toLocaleString()}
      </span>
      <span>{equityCurve.at(-1)?.date}</span>
    </div>
  </div>
)}
```

Agregar estado: `const [equityCurve, setEquityCurve] = useState<any[]>([])`.
Cargar en `fetchData` solo cuando `view === 'analytics'` para no pagar el costo siempre.

---

## Reglas que debes cumplir (fuente: `docs/rules.md`)

- Ningún componente importa `@prisma/client` ni `@/server/**`.
- Los datos llegan como props o desde server actions llamadas en handlers del cliente.
- Alta densidad obligatoria: `py-1` en celdas, altura < 40px por fila.
- Todos los inputs deben tener `placeholder`.
- Dropdowns/popovers: fondo `bg-zinc-900` sólido (no transparente).
- Verde = positivo, rojo/naranja = negativo, azul = activo/acción principal.

---

## Entregables esperados

1. `src/components/trades/CloseTradeModal.tsx` — modal de selección de operación a cerrar.
2. `src/components/cashflow/CashFlowForm.tsx` — formulario de depósitos/retiros.
3. `src/app/page.tsx` — acciones funcionales, filtros extra, mejor mes/trade, curva equity.
4. `src/components/ui/DataTable.tsx` — prop `onExport` + botón CSV.
5. `src/components/trades/TradeForm.tsx` — selector `instrumentType`.
6. `src/lib/validations.ts` — `instrumentType` en schema.
7. `npm run build` → verde. `npm run typecheck` → verde.
