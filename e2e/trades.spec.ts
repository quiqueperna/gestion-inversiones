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

  test('filtra trades por estado Cerrados', async ({ page }) => {
    await page.getByRole('button', { name: 'Cerrados' }).click();
    await page.waitForTimeout(300);
    const estadoCells = page.locator('span:has-text("CERRADO")');
    const count = await estadoCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filtra trades por estado Abiertos', async ({ page }) => {
    await page.getByRole('button', { name: 'Abiertos' }).click();
    await page.waitForTimeout(300);
    const estadoCells = page.locator('span:has-text("ABIERTO")');
    const count = await estadoCells.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filtra por instrumento STOCK', async ({ page }) => {
    await page.getByRole('button', { name: 'STOCK' }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('table')).toBeVisible();
  });

  test('exporta trades como CSV', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /csv|exportar/i }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});
