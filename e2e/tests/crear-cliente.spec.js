import { expect, test } from '@playwright/test';

// La sesión del administrador ya viene cargada (tests/auth.setup.js):
// el test no repite el login por la UI.
test('debe crear un cliente nuevo y verlo aparecer en la lista', async ({ page }) => {
  // Arrange — abre el módulo de Clientes
  await page.goto('/clientes');
  // Nombre único con Date.now() para no chocar con clientes de corridas anteriores.
  const nombreCliente = `Cliente E2E ${Date.now()}`;

  // Act
  await page.getByRole('button', { name: 'Nuevo cliente' }).click();
  await page.getByLabel('Nombre *').fill(nombreCliente);
  await page.getByRole('button', { name: 'Crear cliente' }).click();

  // La lista pagina de 8 en 8 y acumula los clientes de corridas previas del
  // E2E: sin filtrar, el recién creado puede caer en otra página y el test
  // se vuelve intermitente. Se busca por el nombre único para acotar la
  // lista a una sola fila, como lo haría una persona verificando el alta.
  await page.getByPlaceholder('Buscar por nombre o código…').fill(nombreCliente);

  // Assert
  await expect(page.getByText(nombreCliente)).toBeVisible();
});
