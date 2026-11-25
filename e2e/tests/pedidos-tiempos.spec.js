import { test, expect } from './support/fixtures.js';
import { crearCliente, pedidosDelCliente } from './support/datos.js';
import { PaginaPedidos } from './support/pagina-pedidos.js';

// Semana 7 · Parte 3 · defectos de tiempos en el flujo de pedidos.
// Las condiciones difíciles se provocan a propósito con page.route (respuesta
// retrasada), así un fallo que en la vida real sería ocasional aquí es seguro.
// La espera vive en la red simulada, nunca en el test (sin waitForTimeout).

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const esListaDePedidos = (url) => new URL(url).pathname.endsWith('/api/pedidos');

test.describe('Pedidos con tiempos difíciles', () => {
  test('doble clic en "Crear pedido" con el API lento envía un solo POST y guarda un solo pedido', async ({ page, api }) => {
    // Arrange: el POST tarda 1,5 s en llegar al backend
    const cliente = await crearCliente(api);
    const pedidos = new PaginaPedidos(page);
    let posts = 0;
    await page.route(esListaDePedidos, async (route) => {
      if (route.request().method() === 'POST') {
        posts += 1;
        await esperar(1500);
      }
      await route.continue();
    });
    await pedidos.abrir();
    await pedidos.abrirFormularioNuevo();
    await pedidos.elegirCliente(cliente.nombre);
    await pedidos.llenarItem(1, { producto: 'Góndola' });

    // Act
    await pedidos.botonCrear.dblclick();

    // Assert
    await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' }).first()).toBeVisible();
    expect(posts, 'POST enviados al API').toBe(1);
    expect(await pedidosDelCliente(api, cliente.id_cliente)).toHaveLength(1);
  });

  test('si la recarga de la lista llega tarde, no borra de la pantalla un pedido creado después', async ({ page, api }) => {
    // Arrange: la recarga que sigue al pedido A llega 2,5 s tarde y con los
    // datos de cuando se pidió (red lenta en la respuesta, no en el backend).
    // Mientras tanto se crea el pedido B, cuya recarga llega enseguida.
    const cliente = await crearCliente(api);
    const pedidos = new PaginaPedidos(page);
    let posts = 0;
    let recargaLentaUsada = false;
    let recargaLentaTermino;
    const recargaLenta = new Promise((resolve) => { recargaLentaTermino = resolve; });
    await page.route(esListaDePedidos, async (route) => {
      const metodo = route.request().method();
      if (metodo === 'POST') posts += 1;
      if (metodo !== 'GET' || posts !== 1 || recargaLentaUsada) return route.continue();
      recargaLentaUsada = true;
      const respuesta = await route.fetch();
      await esperar(2500);
      await route.fulfill({ response: respuesta });
      recargaLentaTermino();
    });
    page.on('dialog', (dialogo) => dialogo.dismiss());
    await pedidos.abrir();
    await pedidos.buscador.fill(cliente.nombre);

    // Act: pedido A y, sin esperar su recarga, pedido B
    for (const producto of ['Pedido A', 'Pedido B']) {
      await pedidos.abrirFormularioNuevo();
      await pedidos.elegirCliente(cliente.nombre);
      await pedidos.formulario.getByLabel('Descripción del pedido').fill(producto);
      await pedidos.llenarItem(1, { producto });
      await pedidos.botonCrear.click();
      await expect(pedidos.formulario).toBeHidden();
    }
    await expect(pedidos.filaDelCliente(cliente.nombre)).toHaveCount(2);
    await recargaLenta;
    // Deja que la página procese la respuesta tardía (dos cuadros de animación)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    // Assert: los dos están en la BD y los dos deben seguir en pantalla
    expect(await pedidosDelCliente(api, cliente.id_cliente)).toHaveLength(2);
    await expect(pedidos.filaDelCliente(cliente.nombre)).toHaveCount(2);
    await expect(pedidos.filaDelCliente('Pedido B')).toBeVisible();
  });
});
