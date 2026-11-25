import { expect, request, test } from '@playwright/test';
import { API_URL, OPERARIO } from './support/entorno.js';

// Semana 8 · David · flujo E2E que faltaba en la suite: el permiso denegado.
// Los tests de pedidos corren como administrador; ninguno comprobaba que un
// rol SIN el módulo "pedidos" (Operario) quede fuera, ni en la interfaz ni en
// el API. Si este control se rompe, cualquier operario podría crear o borrar
// pedidos.

test.describe('Pedidos sin permiso', () => {
  // Estos tests inician sesión con otro usuario: arrancan sin la sesión del admin
  test.use({ storageState: { cookies: [], origins: [] } });

  test('un operario no ve el módulo Pedidos y si entra por la URL vuelve al dashboard', async ({ page }) => {
    // Arrange: inicia sesión como operario (rol con dashboard y programación)
    await page.goto('/login');
    await page.getByLabel('Correo electrónico').fill(OPERARIO.correo);
    await page.getByLabel('Contraseña', { exact: true }).fill(OPERARIO.contrasena);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // Act: intenta abrir Pedidos escribiendo la dirección
    await page.goto('/pedidos');

    // Assert
    await expect(page).toHaveURL(/\/dashboard$/);
    const menu = page.getByRole('navigation');
    await expect(menu.getByRole('link', { name: 'Programación' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Pedidos' })).toHaveCount(0);
  });

  test('el API responde 403 si un operario intenta crear un pedido saltándose la interfaz', async () => {
    // Arrange: token real del operario
    const api = await request.newContext({ baseURL: `${API_URL}/` });
    const login = await api.post('auth/login', { data: OPERARIO });
    expect(login.ok()).toBeTruthy();
    const { user } = await login.json();

    // Act
    const respuesta = await api.post('pedidos', {
      headers: { Authorization: `Bearer ${user.token}` },
      data: { id_cliente: 1, items: [{ producto: 'Intento sin permiso' }] },
    });

    // Assert
    expect(respuesta.status()).toBe(403);
    await api.dispose();
  });
});
