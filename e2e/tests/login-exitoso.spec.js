import { expect, test } from '@playwright/test';

// Usuario administrador que crea el seed (backend/scripts/seed.js).
// Se pueden cambiar con variables de entorno para no depender de esos datos.
const correo = process.env.E2E_CORREO ?? 'admin@macromet.com.co';
const contrasena = process.env.E2E_CONTRASENA ?? 'admin2026';

test('debe entrar al dashboard y saludar al usuario cuando las credenciales son válidas', async ({ page }) => {
  // Arrange
  await page.goto('/login');

  // Act
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByLabel('Contraseña').fill(contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // Assert
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /Administrador/ })).toBeVisible();
});
