import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth.js';

test.describe('Flujo E2E — Rol RECEPTOR (HANDOFF 4.2)', () => {
  test('debe autenticarse, operar bandeja 4 ojos, desembolsos FIFO, recibos y caja chica', async ({
    page,
  }) => {
    // 1. Iniciar sesión como RECEPTOR
    await loginAs(page, {
      identifier: 'receptor',
      password: 'Finan#Scienpay2026!',
      expectedRole: 'RECEPTOR',
    });

    // 2. Verificar que inicia en la Bandeja de Aprobación (4 Ojos)
    await expect(
      page.getByRole('heading', {
        name: /Bandeja de Fiscalización y Aprobación de Solicitudes/i,
      }),
    ).toBeVisible();
    await expect(page.locator('aside button:has-text("Bandeja de Aprobación")')).toBeVisible();

    // 3. Navegar a Entregas de Fondos (FIFO)
    const fifoTab = page.locator('aside button:has-text("Entregas de Fondos (FIFO)")');
    await fifoTab.click();
    await expect(
      page.getByRole('heading', { name: /Entregas de Fondos con Imputación FIFO/i }),
    ).toBeVisible();

    // 4. Navegar a Recibos Inmutables
    const receiptsTab = page.locator('aside button:has-text("Recibos Inmutables")');
    await receiptsTab.click();
    await expect(
      page.getByRole('heading', { name: /Recibos Individuales Inmutables/i }),
    ).toBeVisible();

    // 5. Navegar a Cajas Chicas
    const pettyCashTab = page.locator('aside button:has-text("Cajas Chicas")');
    await pettyCashTab.click();
    await expect(
      page.getByRole('heading', { name: /Control Mensual de Cajas Chicas/i }),
    ).toBeVisible();

    // 6. Cerrar sesión
    await logout(page);
  });
});
