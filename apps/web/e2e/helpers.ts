import type { Page } from '@playwright/test';

export const USERS = {
  ADMIN: { identifier: 'admin', password: 'Admin#Scienpay2026!' },
  GENERADOR: { identifier: 'generador', password: 'Coord#Scienpay2026!' },
  RECEPTOR: { identifier: 'receptor', password: 'Finan#Scienpay2026!' },
} as const;

export async function login(
  page: Page,
  credentials: { identifier: string; password: string },
): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Usuario o correo').fill(credentials.identifier);
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
}
