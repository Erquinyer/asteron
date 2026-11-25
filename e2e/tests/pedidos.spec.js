import { test, expect } from './support/fixtures.js';
import { crearCliente, pedidosDelCliente, unico } from './support/datos.js';
import { PaginaPedidos } from './support/pagina-pedidos.js';

// Semana 7 · David · flujo crítico: REGISTRAR UN PEDIDO.
// Es lo que hace el área comercial todos los días y es el punto de partida
// de todo lo demás: sin pedido no hay proyecto, ni fases, ni programación de
// planta. Si falla, Asteron deja de servir para lo que existe.
//
// La sesión del administrador ya viene cargada (auth.setup.js) y el cliente
// de cada test se crea por API con un nombre único: por la UI solo se hace
// lo que el test prueba.

// Fecha local (no toISOString, que convierte a UTC) dentro de 30 días.
const enDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.describe('Registrar un pedido', () => {
  test('registra un pedido con dos ítems y lo muestra en la lista con su cliente', async ({ page, api }) => {
    // Arrange
    const cliente = await crearCliente(api);
    const pedidos = new PaginaPedidos(page);
    let mensajeConfirmacion;
    // Tras crear, la app pregunta si se crea el proyecto asociado: aquí no.
    page.once('dialog', (dialogo) => {
      mensajeConfirmacion = dialogo.message();
      dialogo.dismiss();
    });
    await pedidos.abrir();

    // Act
    await pedidos.abrirFormularioNuevo();
    await pedidos.elegirCliente(cliente.nombre);
    await pedidos.formulario.getByLabel('Descripción del pedido').fill('Exhibidores para tiendas');
    await pedidos.llenarItem(1, { producto: 'Góndola metálica', cantidad: 4, fechaEntrega: enDias(30) });
    await pedidos.agregarItem();
    await pedidos.llenarItem(2, { producto: 'Rack de piso', cantidad: 2 });
    await pedidos.botonCrear.click();

    // Assert: lo que ve la persona usuaria…
    await expect(page.getByRole('status').filter({ hasText: 'Pedido creado' })).toBeVisible();
    await expect(pedidos.formulario).toBeHidden();
    await pedidos.buscador.fill(cliente.nombre);
    const fila = pedidos.filaDelCliente(cliente.nombre);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Pendiente');
    await expect(fila).toContainText('Exhibidores para tiendas');
    expect(mensajeConfirmacion).toMatch(/creado\. ¿Deseas crear el proyecto asociado ahora\?/);

    // …y lo que quedó guardado
    const guardados = await pedidosDelCliente(api, cliente.id_cliente);
    expect(guardados).toHaveLength(1);
    expect(guardados[0].total_items).toBe(2);
  });

  test('avisa "Selecciona un cliente" y no envía nada al API cuando falta el cliente', async ({ page }) => {
    // Arrange
    const pedidos = new PaginaPedidos(page);
    const envios = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().endsWith('/api/pedidos')) envios.push(r);
    });
    await pedidos.abrir();

    // Act
    await pedidos.abrirFormularioNuevo();
    await pedidos.llenarItem(1, { producto: unico('Producto sin cliente') });
    await pedidos.botonCrear.click();

    // Assert
    await expect(page.getByRole('status').filter({ hasText: 'Selecciona un cliente' })).toBeVisible();
    await expect(pedidos.formulario).toBeVisible();
    expect(envios).toHaveLength(0);
  });

  test('muestra el error del API y no guarda el pedido cuando la fecha de entrega de un ítem ya pasó', async ({ page, api }) => {
    // Arrange: el datepicker no deja elegir fechas pasadas, pero el campo sí
    // acepta que se escriban; la regla la hace cumplir el API.
    const cliente = await crearCliente(api);
    const pedidos = new PaginaPedidos(page);
    await pedidos.abrir();

    // Act
    await pedidos.abrirFormularioNuevo();
    await pedidos.elegirCliente(cliente.nombre);
    await pedidos.llenarItem(1, { producto: 'Góndola', fechaEntrega: '2020-01-15' });
    await pedidos.botonCrear.click();

    // Assert
    await expect(page.getByRole('status').filter({ hasText: 'La fecha de entrega estimada de un ítem no puede ser anterior a hoy' })).toBeVisible();
    await expect(pedidos.formulario).toBeVisible();
    expect(await pedidosDelCliente(api, cliente.id_cliente)).toHaveLength(0);
  });
});
