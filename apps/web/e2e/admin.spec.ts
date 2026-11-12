import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers/auth.js';

test.describe('Flujo E2E — Rol ADMIN (HANDOFF 4.2)', () => {
  test('debe autenticarse, auditar usuarios, revisar auditoría y cerrar sesión', async ({
    page,
  }) => {
    // 1. Iniciar sesión como ADMIN
    await loginAs(page, {
      identifier: 'admin',
      password: 'Admin#Scienpay2026!',
      expectedRole: 'ADMIN',
    });

    // 2. Verificar que inicia en la vista de Usuarios y Roles
    await expect(
      page.getByRole('heading', { name: /Usuarios, Roles y Control de Seguridad/i }),
    ).toBeVisible();
    await expect(page.locator('aside button:has-text("Usuarios y Roles")')).toBeVisible();

    // 3. Comprobar que la tabla lista los usuarios sembrados
    const userTable = page.locator('table');
    await expect(userTable).toBeVisible();
    await expect(page.getByText('admin', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('generador', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('receptor', { exact: false }).first()).toBeVisible();

    // 4. Abrir y cancelar el modal de creación de usuario
    const newUserButton = page.getByRole('button', { name: /Nuevo Usuario/i });
    await expect(newUserButton).toBeVisible();
    await newUserButton.click();

    // Modal abierto
    await expect(page.getByRole('heading', { name: /Registrar Nuevo Usuario/i })).toBeVisible();
    // Cerrar modal
    const closeButton = page.locator('div[role="dialog"] button[aria-label="Cerrar"]');
    await closeButton.click();
    await expect(page.getByRole('heading', { name: /Registrar Nuevo Usuario/i })).not.toBeVisible();

    // 5. Navegar a Parámetros del Sistema
    const paramsTab = page.locator('aside button:has-text("Parámetros del Sistema")');
    await paramsTab.click();
    await expect(
      page.getByRole('heading', { name: /Parámetros Globales del Sistema/i }),
    ).toBeVisible();

    // 6. Navegar a Registro de Auditoría
    const auditTab = page.locator('aside button:has-text("Registro de Auditoría")');
    await auditTab.click();
    await expect(
      page.getByRole('heading', { name: /Registro de Auditoría Append-Only/i }),
    ).toBeVisible();

    // Comprobar que la tabla de auditoría carga registros
    const auditTable = page.locator('table');
    await expect(auditTable).toBeVisible();
    await expect(page.getByRole('button', { name: /Aplicar Filtros/i })).toBeVisible();

    // 7. Cerrar Sesión y verificar retorno al formulario de acceso
    await logout(page);
  });
});
