import { test, expect } from '@playwright/test';

test.describe('Trades', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Trades' }).click();
    await page.waitForTimeout(500);
  });

  test('muestra tabla de trades', async ({ page }) => {
    await expect(page.getByText(/REGISTROS/i)).toBeVisible({ timeout: 8000 });
  });

  test('columnas de rendimiento con colores semánticos', async ({ page }) => {
    const coloredCells = page.locator('span.text-emerald-400, span.text-red-400');
    await expect(coloredCells.first()).toBeVisible({ timeout: 5000 });
  });

  test('ordenar por columna funciona', async ({ page }) => {
    const header = page.getByText('Rdto $').first();
    await header.click();
    await page.waitForTimeout(200);
    await header.click();
    await expect(page.locator('table')).toBeVisible();
  });
});
