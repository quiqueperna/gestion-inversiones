import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('carga la aplicación sin errores', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.getByText('Dashboard').first()).toBeVisible();
  });

  test('muestra la grilla de rendimientos', async ({ page }) => {
    await expect(page.getByText(/Matriz de Rendimientos/i)).toBeVisible({ timeout: 10000 });
  });

  test('chips de período son interactivos', async ({ page }) => {
    const chip = page.getByRole('button', { name: 'Este mes' });
    await chip.click();
    await expect(chip).toHaveClass(/bg-blue-600/, { timeout: 3000 });
  });

  test('popover personalizado se abre y cierra', async ({ page }) => {
    const btn = page.getByRole('button', { name: /Personalizado/i });
    await btn.click();
    await expect(page.locator('#custom-range-start')).toBeVisible({ timeout: 5000 });
    await btn.click(); // toggle off
  });
});
