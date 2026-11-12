import { expect, type Page } from '@playwright/test';

export interface LoginOptions {
  identifier: string;
  password?: string;
  expectedRole: string;
}

export const DEFAULT_PASSWORDS: Record<string, string> = {
  admin: 'Admin#Scienpay2026!',
  generador: 'Coord#Scienpay2026!',
  receptor: 'Finan#Scienpay2026!',
};

/**
 * Inicia sesión en la interfaz web de Scienpay y espera a que el dashboard
 * y la sesión del rol esperado se encuentren completamente renderizados.
 */
export async function loginAs(page: Page, options: LoginOptions): Promise<void> {
  const {
    identifier,
    password = DEFAULT_PASSWORDS[identifier] || 'Admin#Scienpay2026!',
    expectedRole,
  } = options;

  await page.goto('/#login');

  // Asegura que el formulario de login esté visible
  const heading = page.getByRole('heading', { name: /Iniciar Sesión en Scienpay/i });
  await expect(heading).toBeVisible({ timeout: 10000 });

  // Rellena credenciales
  await page.locator('input[name="identifier"]').fill(identifier);
  await page.locator('input[name="password"]').fill(password);

  // Envía el formulario
  await page.getByRole('button', { name: /Ingresar/i }).click();

  // Espera a que la barra lateral y el rol activo se muestren
  const roleBadge = page.locator(`header span:has-text("${expectedRole}")`);
  await expect(roleBadge).toBeVisible({ timeout: 15000 });
}

/**
 * Realiza el cierre de sesión a través del botón de la barra lateral y el modal
 * de confirmación, verificando que regrese a la pantalla de login.
 */
export async function logout(page: Page): Promise<void> {
  // Clic en "Cerrar Sesión" en la barra lateral
  const sidebarLogout = page.locator('aside button:has-text("Cerrar Sesión")');
  await sidebarLogout.click();

  // Modal de confirmación de logout
  const modalHeading = page.getByRole('heading', { name: /¿Está seguro de cerrar sesión\?/i });
  await expect(modalHeading).toBeVisible({ timeout: 5000 });

  // Confirmar en el modal (botón rojo)
  const confirmButton = page.locator('.fixed button:has-text("Cerrar Sesión")');
  await confirmButton.click();

  // Debe volver a la pantalla de inicio de sesión
  const loginHeading = page.getByRole('heading', { name: /Iniciar Sesión en Scienpay/i });
  await expect(loginHeading).toBeVisible({ timeout: 10000 });
}
