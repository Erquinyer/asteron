import { test, expect } from '@playwright/test';

test('Debe mostrar un mensaje de error al ingresar credenciales incorrectas', async ({ page }) => {
  // 1. ARRANGE
  const correoInvalido = `usuario_${Date.now()}@asteron.com`;
  const contrasenaInvalida = 'ClaveErronea123!';
  await page.goto('/login');

  // 2. ACT
  await page.getByLabel('Correo electrónico').fill(correoInvalido);
  await page.getByLabel('Contraseña').fill(contrasenaInvalida);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  // 3. ASSERT
  await expect(page.getByText('Valide el usuario y la contraseña ingresados.')).toBeVisible();
});