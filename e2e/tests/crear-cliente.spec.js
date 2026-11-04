import { expect, test } from '@playwright/test';

// Usuario administrador que crea el seed (backend/scripts/seed.js).
const correo = process.env.E2E_CORREO ?? 'admin@macromet.com.co';
const contrasena = process.env.E2E_CONTRASENA ?? 'admin2026';

test('debe crear un cliente nuevo y verlo aparecer en la lista', async ({ page }) => {
  // Arrange — inicia sesión y abre el módulo de Clientes
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/clientes');
  // Nombre único con Date.now() para no chocar con clientes de corridas anteriores.
  const nombreCliente = `Cliente E2E ${Date.now()}`;

  // Act
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  await page.getByLabel('Nombre *').fill(nombreCliente);
  await page.getByRole('button', { name: 'Crear cliente' }).click();

  // Assert
  await expect(page.getByText(nombreCliente)).toBeVisible();
});
