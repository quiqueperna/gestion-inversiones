import { test, expect } from '@playwright/test';

test.describe('Operaciones', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Operaciones' }).click();
    await page.waitForTimeout(500);
  });

  test('muestra tabla de operaciones', async ({ page }) => {
    await expect(page.getByText(/REGISTROS/i)).toBeVisible({ timeout: 8000 });
  });

  test('buscar filtra resultados', async ({ page }) => {
    const search = page.getByPlaceholder(/Buscar/i);
    await search.fill('AAPL');
    await page.waitForTimeout(300);
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('abre modal de nueva operación', async ({ page }) => {
    await page.getByRole('button', { name: /Nueva Operación/i }).click();
    await expect(page.locator('[class*="fixed inset-0"]')).toBeVisible({ timeout: 3000 });
  });
});
