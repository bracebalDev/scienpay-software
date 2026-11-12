import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth.js';

test.describe('Flujo E2E — Rol GENERADOR (HANDOFF 4.2)', () => {
  test('debe autenticarse, explorar proyectos, personal, causación y solicitudes', async ({
    page,
  }) => {
    // 1. Iniciar sesión como GENERADOR
    await loginAs(page, {
      identifier: 'generador',
      password: 'Coord#Scienpay2026!',
      expectedRole: 'GENERADOR',
    });

    // 2. Verificar que inicia en Proyectos Científicos
    await expect(
      page.getByRole('heading', { name: /Proyectos de Investigación Científica/i }),
    ).toBeVisible();
    await expect(page.locator('aside button:has-text("Proyectos Científicos")')).toBeVisible();

    // Comprobar presencia de botón Nuevo Proyecto
    await expect(page.getByRole('button', { name: /Nuevo Proyecto/i })).toBeVisible();

    // 3. Navegar a Personal (Beneficiarios)
    const personalTab = page.locator('aside button:has-text("Personal (Beneficiarios)")');
    await personalTab.click();
    await expect(
      page.getByRole('heading', { name: /Personal Beneficiario de Asignaciones/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Registrar Beneficiario/i })).toBeVisible();

    // 4. Navegar a Asignaciones y Grupos
    const assignmentsTab = page.locator('aside button:has-text("Asignaciones y Grupos")');
    await assignmentsTab.click();
    await expect(
      page.getByRole('heading', { name: /Asignaciones y Grupos de Pago/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Nueva Asignación/i })).toBeVisible();

    // 5. Navegar al Motor de Causación
    const causationTab = page.locator('aside button:has-text("Motor de Causación")');
    await causationTab.click();
    await expect(
      page.getByRole('heading', { name: /Motor de Causación y Prorrateo/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Calcular Previsualización/i })).toBeVisible();

    // 6. Navegar a Mis Solicitudes
    const requestsTab = page.locator('aside button:has-text("Mis Solicitudes")');
    await requestsTab.click();
    await expect(page.getByRole('heading', { name: /Mis Solicitudes de Pago/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();

    // 7. Cerrar sesión
    await logout(page);
  });
});
