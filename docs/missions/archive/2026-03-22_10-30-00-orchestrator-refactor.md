# ORQUESTADOR — REFACTOR v10: Operation→Execution / Trade→TradeUnit
**Fecha:** 2026-03-22
**Sesión:** v10 — Refactor de dominio completo
**Estado inicial:** tag `v9-pre-refactor` en commit `748f4b1`

---

## OBJETIVO GENERAL

Transformar el modelo de dominio del sistema según `docs/domain/refactor.md` y `docs/domain/trade-units.md`:

| Concepto Actual | Concepto Nuevo |
|---|---|
| `Operation` | `Execution` |
| `Trade` | `Trade Unit` |
| Vista "Posiciones Abiertas" | **ELIMINADA** |
| Matching FIFO global | Matching multi-estrategia aislado por `account + broker` |

**Todas las demás funcionalidades existentes deben permanecer sin cambios.**

---

## DEPENDENCIAS ENTRE AGENTES

```
[01-INFRA]  →  [02-LOGICA]  →  [03-UI]  →  [04-QA]
   ↓                ↓              ↓            ↓
Interfaces       Server         page.tsx     Tests
data-loader      actions        components   E2E
schema.prisma    matching eng.  forms        typecheck
```

**Orden de ejecución obligatorio:** 01 → 02 → 03 → 04
Cada agente depende de que el anterior no rompa TypeScript (`npx tsc --noEmit`).

---

## ARCHIVOS DE MISIÓN

| Agente | Archivo | Alcance |
|---|---|---|
| 01 - Infra/DB | `2026-03-22_10-30-01-infra-db.md` | `data-loader.ts`, `schema.prisma`, interfaces, CSV parser |
| 02 - Lógica/API | `2026-03-22_10-30-02-logica-api.md` | `server/actions/trades.ts`, `dashboard.ts`, matching engine |
| 03 - UI/UX | `2026-03-22_10-30-03-ui-ux.md` | `page.tsx`, componentes, formularios, navegación |
| 04 - QA | `2026-03-22_10-30-04-qa-standards.md` | Tests Vitest, E2E Playwright, typecheck, lint |

---

## RESTRICCIONES GLOBALES (aplican a TODOS los agentes)

1. **No borrar funcionalidades existentes** — Dashboard, Analytics, CashFlow, Cuentas, Brokers deben seguir funcionando.
2. **Convención de fechas CRÍTICA** — Nunca `new Date("YYYY-MM-DD")`. Siempre `new Date(str + 'T12:00:00')`.
3. **Guardrails ESLint** — `src/app/**` y `src/lib/**` no pueden importar `@prisma/client` ni `@/server/**`.
4. **TypeScript strict** — `npx tsc --noEmit` debe dar 0 errores tras cada agente.
5. **Serializar fechas en server actions** — Verificar con `instanceof Date` antes de `.slice(0,10)`.
6. **In-memory first** — El sistema sigue siendo in-memory (CSV + memoryState). Prisma inactivo.
7. **No usar `any` implícito** — Interfaces explícitas para todos los tipos nuevos.

---

## RESUMEN DEL DELTA (qué cambia vs v9)

### Modelo de datos
- `Operation` interface → `Execution` interface (nuevos campos: `currency`, `commissions`, `exchange_rate`, `side` reemplaza `type`)
- `Trade` interface → `TradeUnit` interface (nuevos campos: `status: 'OPEN'|'CLOSED'`, `entry_exec_id`, `exit_exec_id`, `unit_id`)
- `memoryState.operations` → `memoryState.executions`
- `memoryState.trades` → `memoryState.tradeUnits`

### Motor de matching
- Antes: `openInventory[symbol]` — global, sin aislamiento
- Después: `openInventory[symbol + '::' + account + '::' + broker]` — aislado por account+broker
- Estrategias configurables: FIFO (default), LIFO, MaxProfit, MinProfit, ManualMatch
- Fraccionamiento (splitting): Trade Unit original → CLOSED con qty parcial + nueva Trade Unit OPEN con remanente

### Vistas eliminadas
- Vista `"open"` (Posiciones Abiertas) → ELIMINADA del type `View` y de toda la UI
- Función `getOpenPositions()` → ELIMINADA
- Componente/lógica de posiciones → ELIMINADO

### Dashboard actualizado
- Rendimientos incluyen Trade Units ABIERTAS (precio Yahoo Finance) + CERRADAS
- Estadísticas de Analytics siguen calculándose solo sobre Trade Units CERRADAS

### Navegación actualizada
```typescript
// Antes
type View = "dashboard" | "analytics" | "operations" | "trades" | "open" | "cuentas" | "brokers" | "nueva-op" | "ie" | "movimientos";

// Después
type View = "dashboard" | "analytics" | "executions" | "trade-units" | "cuentas" | "brokers" | "nueva-exec" | "ie" | "movimientos";
```

---

## CRITERIOS DE ACEPTACIÓN

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm run lint` → 0 errores
- [ ] `npm run test` → todos verdes
- [ ] `npm run build` → build limpio
- [ ] Vista "Posiciones Abiertas" no existe en la app
- [ ] Terminología "Execution" y "Trade Unit" en toda la UI (en español: "Ejecuciones" y "Trade Units")
- [ ] Matching engine aísla por account+broker
- [ ] Dashboard muestra rendimientos de TUs abiertas (Yahoo Finance) + cerradas
- [ ] Estadísticas Analytics solo sobre TUs cerradas
