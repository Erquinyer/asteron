import { expect, test as setup } from '@playwright/test';
import { ADMIN, SESION_ADMIN } from './support/entorno.js';

// Inicia sesión UNA sola vez por corrida y guarda la sesión (el token queda
// en localStorage, "asteron_auth"). El proyecto "chromium" la carga en cada
// test con storageState, así ningún test repite el login por la UI.
setup('inicia sesión como administrador y guarda la sesión', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(ADMIN.correo);
  await page.getByLabel('Contraseña', { exact: true }).fill(ADMIN.contrasena);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await page.context().storageState({ path: SESION_ADMIN });
});
