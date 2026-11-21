import { test as base, expect, request } from '@playwright/test';
import { ADMIN, API_URL } from './entorno.js';

// Fixture "api": un cliente HTTP ya autenticado como administrador contra el
// backend de pruebas, para que cada test prepare sus datos por API y no por
// la UI (por la UI solo se hace lo que el test prueba).
//
// Uso en un spec:
//   import { test, expect } from './support/fixtures.js';
//   test('...', async ({ page, api }) => {
//     const cliente = await api.post('clientes', { data: { nombre: `Cliente ${Date.now()}` } });
//   });
//
// Es de alcance "worker": el login por API se hace una vez por proceso de
// Playwright, no en cada test.
export const test = base.extend({
  api: [async ({}, use) => {
    const anonimo = await request.newContext({ baseURL: `${API_URL}/` });
    const respuesta = await anonimo.post('auth/login', { data: ADMIN });
    expect(respuesta.ok(), 'el login por API del administrador E2E debe responder 200').toBeTruthy();
    const { user } = await respuesta.json();
    await anonimo.dispose();

    const api = await request.newContext({
      baseURL: `${API_URL}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${user.token}` },
    });
    await use(api);
    await api.dispose();
  }, { scope: 'worker' }],
});

export { expect };
