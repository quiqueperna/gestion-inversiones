# Misión 04 — Agente de QA y Estándares

## Rol
Eres el responsable de la calidad del código, testing, linting, guardrails arquitecturales y pipeline de CI del proyecto **Gestión de Inversiones**.

---

## Contexto del proyecto

- Stack: Next.js App Router, TypeScript estricto, Vitest (unit/integration), Playwright (e2e).
- CI: GitHub Actions ejecuta `lint + typecheck + test + build` en cada PR.
- Guardrails: ESLint hace fallar el build si la UI importa DB directamente.

---

## Estado actual (lo que YA existe)

| Artefacto | Estado |
|---|---|
| `docs/rules.md` | Guardrails definidos. ESLint configurado (verificar). |
| `docs/stack.md` | Scripts definidos. Vitest + Playwright listados. |
| `.eslintrc` o `eslint.config.*` | Verificar existencia y completitud. |
| Tests | **No existen**. Ningún archivo `*.test.ts` o `*.spec.ts` detectado. |
| CI Pipeline | Verificar `.github/workflows/`. |

---

## Tareas pendientes (lo que FALTA hacer)

### 1. Verificar y completar ESLint guardrails (`docs/rules.md`)

Las siguientes reglas **deben** fallar en lint:

**Regla 1: UI no toca DB**
```json
// En archivos bajo src/app/**
{
  "no-restricted-imports": ["error", {
    "patterns": ["@prisma/client", "@/server/**"]
  }]
}
```

**Regla 2: lib es puro**
```json
// En archivos bajo src/lib/**
{
  "no-restricted-imports": ["error", {
    "patterns": ["@prisma/client", "@/server/**"]
  }]
}
```

Verificar que `npm run lint` falle si se rompe alguna de estas reglas.
Si el ESLint config no existe o está incompleto: crearlo.

### 2. Configurar TypeScript estricto

Verificar `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```
Resolver todos los errores de `npm run typecheck`.

### 3. Tests unitarios — Lógica de negocio (Vitest)

Archivo: `src/lib/__tests__/trade-calculator.test.ts`

Casos a cubrir:
```typescript
describe("trade-calculator", () => {
  it("calcula returnAmount correctamente")
    // openAmount=1000, closeAmount=1100 → returnAmount=100

  it("calcula returnPercent correctamente")
    // returnAmount=100, openAmount=1000 → returnPercent=10

  it("calcula days entre fechas")
    // openDate=2024-01-01, closeDate=2024-01-11 → days=10

  it("calcula TNA correctamente")
    // returnPercent=10, days=10 → tna = (10/10)*365 = 365

  it("maneja trade con pérdida")
    // openAmount=1000, closeAmount=900 → returnAmount=-100, returnPercent=-10

  it("maneja days=0 sin dividir por cero en TNA")
})
```

Archivo: `src/lib/__tests__/operation-parser.test.ts`

```typescript
describe("operation-parser", () => {
  it("parsea formato corto: 'AAPL 10 150.50 BUY 2024-01-15'")
  it("parsea formato extendido con claves")
  it("retorna null para input inválido")
  it("normaliza símbolo a uppercase")
  it("rechaza cantidad negativa")
  it("rechaza precio negativo")
})
```

### 4. Tests de integración — Server Actions (Vitest)

Archivo: `src/server/actions/__tests__/transactions.test.ts`

Usar base de datos de test (SQLite in-memory o test DB separada).

```typescript
describe("createOperation", () => {
  it("crea operación BUY con todos los campos")
  it("crea operación SELL con todos los campos")
  it("falla con símbolo vacío")
  it("falla con cantidad negativa")
  it("falla con precio cero")
  it("calcula amount = quantity * price automáticamente si no se pasa")
})

describe("closeTradeManually", () => {
  it("cierra trade correctamente cuando hay 1 operación abierta")
  it("calcula todos los campos del Trade (returnAmount, returnPercent, days, tna)")
  it("marca ambas operaciones como isClosed=true")
  it("falla si los símbolos no coinciden")
  it("falla si las cantidades no coinciden")
  it("falla si los tipos son iguales (BUY-BUY)")
  it("usa transacción: rollback si falla el cálculo")
})
```

### 5. Tests de integración — Dashboard Actions

Archivo: `src/server/actions/__tests__/dashboard.test.ts`

```typescript
describe("getDashboardStats", () => {
  it("retorna cero estadísticas con DB vacía")
  it("cuenta correctamente trades abiertos vs cerrados")
  it("calcula P&L total correctamente")
  it("retorna top 5 trades ordenados por returnAmount desc")
  it("agrupa rendimiento por instrumentType")
})
```

### 6. Tests E2E (Playwright)

Archivo: `e2e/operations.spec.ts`

```typescript
test("crear nueva operación BUY via formulario")
  // navegar a /new-operation
  // rellenar campos
  // submit → verificar que aparece en /operations

test("crear operación con pegado rápido")
  // pegar texto en textarea
  // verificar que se pre-rellena el formulario

test("cerrar un trade manualmente")
  // crear operación BUY abierta
  // crear operación SELL → modal de selección → elegir BUY
  // verificar trade aparece en /trades como cerrado

test("filtrar listado de operaciones por período")
  // navegar a /operations
  // click en chip "Este mes"
  // verificar que los registros están filtrados

test("ordenar tabla por columna")
  // click en cabecera "FECHA"
  // verificar orden ASC
  // click de nuevo → verificar DESC
```

### 7. CI Pipeline (GitHub Actions)

Archivo: `.github/workflows/ci.yml`

Si no existe, crearlo:
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

### 8. Scripts de calidad en `package.json`

Verificar que existen todos:
```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "format:check": "prettier --check src",
    "format": "prettier --write src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "build": "next build",
    "db:seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-complete.ts"
  }
}
```

### 9. Checklist de PR (documentar en `docs/AGENTS.md`)

Antes de cerrar cualquier tarea, verificar:
- [ ] `npm run lint` → verde
- [ ] `npm run typecheck` → verde
- [ ] `npm run test` → verde (todos los tests pasan)
- [ ] `npm run build` → verde
- [ ] Si hay UI nueva: prueba manual reproducible documentada
- [ ] Ningún `any` implícito introducido
- [ ] Ningún import prohibido (DB desde UI, server desde lib)

---

## Reglas que debes cumplir

- No cerrar una tarea sin evidencia ejecutable (`npm run test` verde).
- Los guardrails de ESLint deben hacer **fallar** el lint, no solo advertir.
- Tests de lógica pura en `src/lib/__tests__/` (sin DB).
- Tests de integración con DB de test separada (no la de desarrollo).
- Playwright tests contra servidor local levantado.

---

## Entregables esperados

1. ESLint config con guardrails funcionando (lint falla si se rompen las reglas).
2. `tsconfig.json` con strict completo y sin errores.
3. `src/lib/__tests__/trade-calculator.test.ts` — todos los casos pasando.
4. `src/lib/__tests__/operation-parser.test.ts` — todos los casos pasando.
5. `src/server/actions/__tests__/transactions.test.ts` — todos los casos pasando.
6. `src/server/actions/__tests__/dashboard.test.ts` — todos los casos pasando.
7. `e2e/operations.spec.ts` — flujos principales E2E pasando.
8. `.github/workflows/ci.yml` — pipeline completo.
9. `npm run lint && npm run typecheck && npm run test && npm run build` → todo verde.
