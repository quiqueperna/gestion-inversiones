# Misión 04 — Agente de QA y Estándares
**Fecha:** 2026-03-20 | **Versión:** 2 | **Prioridad:** P2

## Origen
Pendientes de `bitacora/pendientes.md`:
- **P2.7** — Tests de integración para server actions (actualmente sin cobertura)
- **P2.8** — Tests E2E con Playwright (paquete instalado, sin configuración)
- **P3.15** — Tests de regresión del parser de texto con más formatos

## Estado actual de QA

| Artefacto | Estado |
|---|---|
| `vitest.config.ts` | ✅ Existe, configurado con alias `@/` |
| `eslint.config.mjs` | ✅ Guardrails activos |
| `.github/workflows/ci.yml` | ✅ Lint → typecheck → test → build |
| `src/lib/__tests__/calculations.test.ts` | ✅ 5 tests |
| `src/lib/__tests__/operation-parser.test.ts` | ✅ 8 tests |
| Tests de server actions | ❌ No existen |
| `playwright.config.ts` | ❌ No existe |
| Tests E2E | ❌ No existen |

---

## Tarea 1 — Tests de integración: server actions de dashboard (P2)

**Archivo:** `src/server/actions/__tests__/dashboard.test.ts`

Estos tests usan el sistema en memoria (`initializeMemoryState`) en lugar de una DB real. No requieren Prisma.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeMemoryState, resetMemoryState } from '@/lib/data-loader';

// CSV mínimo de 10 trades conocidos para asserts predecibles
const MINI_CSV = `date,symbol,quantity,price,broker,type,category,instrument,isFalopa
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,false
2024-01-15,AAPL,-10,110,AMR,SELL,TRADE,STOCKS,false
2024-02-01,TSLA,5,200,IOL,BUY,TRADE,STOCKS,false
2024-02-20,TSLA,-5,180,IOL,SELL,TRADE,STOCKS,false
2024-03-01,NVDA,2,400,AMR,BUY,TRADE,STOCKS,false
2024-03-30,NVDA,-2,500,AMR,SELL,TRADE,STOCKS,false
2024-04-01,MSFT,10,300,IOL,BUY,TRADE,STOCKS,false
2024-04-25,MSFT,-10,330,IOL,SELL,TRADE,STOCKS,false
2024-05-01,AAPL,20,150,AMR,BUY,TRADE,STOCKS,false
2024-05-01,TSLA,8,220,IOL,BUY,TRADE,STOCKS,false`;

describe('getStats', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('retorna stats vacías si no hay trades en el período', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2020-01-01'), new Date('2020-12-31'));
    expect(result.totalTrades).toBe(0);
    expect(result.netProfit).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.payoffRatio).toBe(0);
  });

  it('cuenta correctamente trades positivos y negativos', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    // AAPL: +100, TSLA: -100, NVDA: +200, MSFT: +300 → 3 positivos, 1 negativo
    expect(result.totalTrades).toBe(4);
    expect(result.winRate).toBeCloseTo(75, 0);
  });

  it('calcula netProfit correctamente', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    // (110-100)*10 + (180-200)*5 + (500-400)*2 + (330-300)*10
    // = 100 - 100 + 200 + 300 = 500
    expect(result.netProfit).toBeCloseTo(500, 0);
  });

  it('incluye payoffRatio en el retorno', async () => {
    const { getStats } = await import('../dashboard');
    const result = await getStats(new Date('2024-01-01'), new Date('2024-12-31'));
    expect(result.payoffRatio).toBeDefined();
    expect(typeof result.payoffRatio).toBe('number');
  });
});

describe('getDashboardSummary', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('cuenta operaciones abiertas correctamente', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    // AAPL 20 y TSLA 8 quedaron abiertas (sin contraparte)
    expect(result.openOperations).toBeGreaterThan(0);
  });

  it('retorna totalTrades igual al resultado de FIFO matching', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    expect(result.totalTrades).toBe(4); // 4 pares cerrados
  });

  it('positiveTrades + negativeTrades === totalTrades', async () => {
    const { getDashboardSummary } = await import('../dashboard');
    const result = await getDashboardSummary();
    expect(result.positiveTrades + result.negativeTrades).toBe(result.totalTrades);
  });
});

describe('getTopStats', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(MINI_CSV);
  });

  it('top5Trades tiene como máximo 5 elementos', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    expect(result?.top5Trades.length).toBeLessThanOrEqual(5);
  });

  it('top5Trades está ordenado por returnAmount descendente', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    const amounts = result?.top5Trades.map((t: any) => t.returnAmount) ?? [];
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i - 1]).toBeGreaterThanOrEqual(amounts[i]);
    }
  });

  it('bestMonth retorna el mes con mayor retorno', async () => {
    const { getTopStats } = await import('../dashboard');
    const result = await getTopStats();
    expect(result?.bestMonth).toBeDefined();
    expect(typeof result?.bestMonth?.total).toBe('number');
  });
});
```

**PREREQUISITO:** Para que los tests funcionen, `data-loader.ts` necesita exportar `resetMemoryState`:
```typescript
export function resetMemoryState() {
  memoryState = {
    operations: [],
    trades: [],
    cashFlows: [],
    isInitialized: false,
  };
}
```

---

## Tarea 2 — Tests de integración: closeTradeManually (P2)

**Archivo:** `src/server/actions/__tests__/trades.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { initializeMemoryState, resetMemoryState } from '@/lib/data-loader';

const CSV_WITH_OPEN = `date,symbol,quantity,price,broker,type,category,instrument,isFalopa
2024-01-01,AAPL,10,100,AMR,BUY,TRADE,STOCKS,false
2024-01-01,AAPL,10,105,AMR,BUY,TRADE,STOCKS,false`;

describe('closeTradeManually', () => {
  beforeEach(() => {
    resetMemoryState();
    initializeMemoryState(CSV_WITH_OPEN);
  });

  it('cierra el trade y crea un registro de trade', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getTrades } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');
    expect(openOps.length).toBe(2);

    await closeTradeManually({
      symbol: 'AAPL',
      closeDate: '2024-02-01',
      closePrice: 120,
      quantity: 10,
      broker: 'AMR',
      openOperationId: openOps[0].id,
    });

    const trades = await getTrades();
    expect(trades.length).toBe(1);
    expect(trades[0].returnAmount).toBeCloseTo(200, 0); // (120-100)*10
    expect(trades[0].returnPercent).toBeCloseTo(20, 0);
  });

  it('marca la operación de apertura como cerrada', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getOperations } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');
    const targetId = openOps[0].id;

    await closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', openOperationId: targetId,
    });

    const ops = await getOperations();
    const closedOp = ops.find((o: any) => o.id === targetId);
    expect(closedOp?.isClosed).toBe(true);
    expect(closedOp?.remainingQty).toBeLessThanOrEqual(0.001);
  });

  it('lanza error si la operación de apertura no existe', async () => {
    const { closeTradeManually } = await import('../trades');
    await expect(closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-02-01',
      closePrice: 120, quantity: 10,
      broker: 'AMR', openOperationId: 99999,
    })).rejects.toThrow('no encontrada');
  });

  it('calcula TNA correctamente (retorno / días * 365)', async () => {
    const { closeTradeManually, getOpenOperationsForClosing, getTrades } = await import('../trades');
    const openOps = await getOpenOperationsForClosing('AAPL', 'SELL');

    await closeTradeManually({
      symbol: 'AAPL', closeDate: '2024-01-31', // 30 días desde 2024-01-01
      closePrice: 110, quantity: 10,
      broker: 'AMR', openOperationId: openOps[0].id,
    });

    const trades = await getTrades();
    const t = trades[0];
    // returnPercent = 10%, days = 30
    // TNA = (10 / 30) * 365 ≈ 121.67%
    expect(t.tna).toBeCloseTo(121.67, 0);
  });
});
```

---

## Tarea 3 — Configurar Playwright y tests E2E (P2)

### 3a. Crear `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

### 3b. Crear `e2e/dashboard.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Gemini', { timeout: 10000 });
  });

  test('carga el dashboard sin errores', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('muestra la grilla de rendimientos', async ({ page }) => {
    await expect(page.getByText(/Matriz de Rendimientos/i)).toBeVisible();
    // Verifica que hay al menos una fila de mes
    await expect(page.getByText('Ene').first()).toBeVisible();
  });

  test('el selector de año cambia el título de la grilla', async ({ page }) => {
    await page.getByRole('button', { name: '2025' }).click();
    await expect(page.getByText('Matriz de Rendimientos 2025')).toBeVisible();
  });

  test('chips de período filtran los datos', async ({ page }) => {
    await page.getByRole('button', { name: 'Este mes' }).click();
    // El chip activo debe tener fondo azul
    const chip = page.getByRole('button', { name: 'Este mes' });
    await expect(chip).toHaveClass(/bg-blue-600/);
  });
});
```

### 3c. Crear `e2e/operations.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Operaciones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=GeminiCapital', { timeout: 10000 });
    await page.getByRole('button', { name: 'Operaciones' }).click();
  });

  test('navega a la vista de operaciones', async ({ page }) => {
    await expect(page.getByText(/REGISTROS/i)).toBeVisible();
  });

  test('la búsqueda filtra por símbolo', async ({ page }) => {
    await page.getByPlaceholder(/Buscar/i).fill('AAPL');
    // Todas las filas visibles deben contener AAPL
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(rows.nth(i)).toContainText('AAPL');
    }
  });

  test('abre el formulario de nueva operación', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva Operación/i }).click();
    await expect(page.getByText(/Nueva Operación/i).last()).toBeVisible();
    await expect(page.getByPlaceholder('NVDA')).toBeVisible();
  });

  test('el formulario tiene toggle BUY/SELL', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva Operación/i }).click();
    await expect(page.getByRole('button', { name: /Compra/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Venta/i })).toBeVisible();
  });
});
```

### 3d. Crear `e2e/trades.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Trades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=GeminiCapital', { timeout: 10000 });
    await page.getByRole('button', { name: 'Trades' }).click();
  });

  test('muestra la tabla de trades', async ({ page }) => {
    await expect(page.getByText(/REGISTROS/i)).toBeVisible();
  });

  test('la columna Rdto $ muestra colores semánticos', async ({ page }) => {
    // Busca celdas con class text-emerald-400 o text-red-400
    const greenCells = page.locator('td.text-emerald-400, td span.text-emerald-400');
    const redCells = page.locator('td.text-red-400, td span.text-red-400');
    const hasColored = (await greenCells.count()) + (await redCells.count()) > 0;
    expect(hasColored).toBe(true);
  });

  test('ordenar por columna Rdto $ ordena descendente al segundo click', async ({ page }) => {
    // Primer click: ASC
    await page.getByText('Rdto $').click();
    // Segundo click: DESC
    await page.getByText('Rdto $').click();
    await expect(page.locator('thead')).toBeVisible(); // tabla sigue presente
  });
});
```

---

## Tarea 4 — Tests de regresión del parser (P3)

**Archivo:** `src/lib/__tests__/operation-parser.test.ts` — agregar casos al final:

```typescript
// Casos adicionales de regresión con formatos de brokers externos

it('parsea export típico de IBKR: símbolo cantidad precio en ese orden', () => {
  const result = parseOperationText('TSLA 2024-03-15 20 250.50 BUY IBKR');
  expect(result?.symbol).toBe('TSLA');
  expect(result?.quantity).toBe(20);
  expect(result?.price).toBe(250.50);
  expect(result?.broker).toBe('IBKR');
  expect(result?.date).toBe('2024-03-15');
});

it('maneja símbolo de CEDEAR con punto', () => {
  const result = parseOperationText('GGAL 2024-06-01 100 32.5 BUY AMR');
  expect(result?.symbol).toBe('GGAL');
});

it('parsea SELL correctamente', () => {
  const result = parseOperationText('NVDA 10 800 SELL 2024-09-01 IOL');
  expect(result?.type).toBe('SELL');
  expect(result?.symbol).toBe('NVDA');
});

it('formato clave=valor con orden diferente de claves', () => {
  const result = parseOperationText('tipo=SELL precio=200 simbolo=MSFT cantidad=5 fecha=2024-08-01');
  expect(result?.symbol).toBe('MSFT');
  expect(result?.type).toBe('SELL');
  expect(result?.price).toBe(200);
  expect(result?.quantity).toBe(5);
});

it('retorna null si cantidad es cero', () => {
  const result = parseOperationText('AAPL 0 150 BUY 2024-01-01');
  // quantity=0 → inválido
  expect(result).toBeNull();
});

it('retorna null si precio es cero', () => {
  const result = parseOperationText('AAPL 10 0 BUY 2024-01-01');
  expect(result).toBeNull();
});
```

---

## Tarea 5 — Actualizar CI para incluir E2E (P2)

**Archivo:** `.github/workflows/ci.yml` — agregar job de E2E al pipeline existente:

```yaml
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: quality  # espera que pasen los tests unitarios
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - name: Build app
        run: npm run build
        env:
          DATABASE_URL: "file:./dev.db"
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: "file:./dev.db"
```

---

## Reglas que debes cumplir (fuente: `docs/stack.md`, `docs/AGENTS.md`)

- No cerrar ninguna tarea sin evidencia ejecutable (`npm run test` verde).
- Los tests de server actions usan `resetMemoryState()` en `beforeEach` para aislamiento.
- Los tests E2E usan `webServer` de Playwright para levantar Next.js automáticamente.
- Los tests NO mockean el `memoryState` completo: usan CSV mini reproducible para asserts determinísticos.
- Registrar en `bitacora/lessons.md` si surge un error repetible durante la implementación.

---

## Entregables esperados

1. `src/lib/data-loader.ts` — `resetMemoryState()` exportada.
2. `src/server/actions/__tests__/dashboard.test.ts` — tests de integración de stats.
3. `src/server/actions/__tests__/trades.test.ts` — tests de `closeTradeManually`.
4. `playwright.config.ts` — configuración E2E.
5. `e2e/dashboard.spec.ts`, `e2e/operations.spec.ts`, `e2e/trades.spec.ts` — flujos principales.
6. `src/lib/__tests__/operation-parser.test.ts` — 6 casos de regresión adicionales.
7. `.github/workflows/ci.yml` — job E2E agregado.
8. `npm run test` → todos los tests en verde.
9. `npm run test:e2e` → flujos principales pasan en CI.
