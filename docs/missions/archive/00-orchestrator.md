# Misión 00 — Orquestador de Sistema

## Visión general

Proyecto: **Gestión de Inversiones** — SaaS para tracking de operaciones de mercado, trades y estadísticas de rendimiento.

---

## Arquitectura de agentes

```
┌─────────────────────────────────────────────────────────────┐
│                    ORQUESTADOR (este archivo)                │
└──────┬──────────────┬──────────────┬───────────────┬────────┘
       │              │              │               │
   01-infra-db    02-logic-api   03-ui-ux       04-qa-standards
   (Prisma/DB)   (Server Actions) (Componentes)  (Tests/CI)
```

---

## Estado del proyecto (análisis al 2026-03-20)

### Lo que existe
- Schema Prisma con modelos `Operation`, `Trade`, `CashFlow` (SQLite en dev).
- Server actions básicas: `dashboard.ts`, `trades.ts`, `transactions.ts` (parciales).
- `page.tsx` con dashboard básico (521 líneas, sin componentizar).
- `YieldsGrid.tsx` parcial, `TradeForm.tsx` básico.
- CSV de datos demo en `public/data/initial_operations.csv`.
- Seeds en `prisma/seed-complete.ts` y `prisma/seed-csv.ts` (sin ejecutar/verificar).

### Lo que FALTA (gaps identificados)

| Gap | Agente responsable |
|---|---|
| Trade.closeDate y campos de cierre deben ser nullable (trade abierto) | 01-infra-db |
| Seed de 100 trades con 2 años de datos + operaciones abiertas acumuladas | 01-infra-db |
| CRUD completo de Operaciones con Zod validation | 02-logic-api |
| Cierre manual de trades (el usuario elige cuál operación cerrar) | 02-logic-api |
| Parser de texto para pegado rápido de operaciones | 02-logic-api |
| Fetch de precio actual para operaciones abiertas (Yahoo Finance) | 02-logic-api |
| Estadísticas completas del dashboard (top5, mejor mes, por instrumento) | 02-logic-api |
| CRUD de CashFlows (Ingresos/Extracciones) | 02-logic-api |
| Navegación completa (layout con sidebar) | 03-ui-ux |
| Página `/new-operation` con formulario tradicional + pegado rápido | 03-ui-ux |
| Modal de selección manual de operación a cerrar | 03-ui-ux |
| Página `/operations` con filtros y precios en vivo | 03-ui-ux |
| Página `/trades` con filtros y colores semánticos | 03-ui-ux |
| Dashboard completo con rankings y stats por instrumento | 03-ui-ux |
| Componente `DataTable` genérico con ordenamiento/paginación | 03-ui-ux |
| Componente `FilterBar` con chips de período + rango personalizado | 03-ui-ux |
| **Cero tests** — ningún archivo `*.test.ts` existe | 04-qa-standards |
| ESLint guardrails sin verificar | 04-qa-standards |
| CI pipeline sin verificar/crear | 04-qa-standards |

---

## Dependencias entre agentes

```
01-infra-db
    └→ provee schema y seed → habilita a 02-logic-api y 04-qa-standards

02-logic-api
    └→ provee server actions → habilita a 03-ui-ux y 04-qa-standards

03-ui-ux
    └→ consume server actions de 02 → entrega UI final

04-qa-standards
    └→ puede ejecutarse en paralelo con 01 y 02
    └→ tests E2E dependen de 03
```

**Orden recomendado de ejecución:**
1. Agente 01 (DB/schema) — base de todo.
2. Agente 02 (lógica) — en paralelo con el 04 para tests unitarios de lib.
3. Agente 03 (UI) — después de 02.
4. Agente 04 completo (E2E) — al final.

---

## Criterios de cierre del proyecto

El proyecto está completo cuando:
- [ ] `npm run lint` → verde
- [ ] `npm run typecheck` → verde
- [ ] `npm run test` → verde (unit + integration)
- [ ] `npm run test:e2e` → verde (flujos principales)
- [ ] `npm run build` → verde
- [ ] Demo navegable con 100 trades de 2 años de datos.
- [ ] Alta de operación funcional (formulario + pegado rápido).
- [ ] Cierre manual de trade funcional (selección de operación abierta).
- [ ] Dashboard con todas las estadísticas pobladas.
- [ ] Listado de operaciones con precio en vivo para abiertas.
- [ ] Listado de trades con filtros y colores semánticos.
