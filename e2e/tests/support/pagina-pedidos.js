// Objeto de página del módulo de Pedidos: agrupa los pasos que repiten los
// tests (abrir el formulario, elegir cliente, llenar un ítem). No tiene
// aserciones: lo que se verifica queda a la vista en cada test.
export class PaginaPedidos {
  constructor(page) {
    this.page = page;
    this.botonNuevo = page.getByRole('button', { name: 'Nuevo pedido' });
    this.formulario = page.getByRole('dialog', { name: 'Nuevo pedido' });
    this.botonCrear = this.formulario.getByRole('button', { name: 'Crear pedido' });
    this.buscador = page.getByPlaceholder('Buscar por cliente o descripción…');
  }

  async abrir() {
    await this.page.goto('/pedidos');
  }

  async abrirFormularioNuevo() {
    await this.botonNuevo.click();
  }

  async elegirCliente(nombre) {
    await this.formulario.getByRole('button', { name: 'Seleccionar cliente' }).click();
    await this.formulario.getByPlaceholder('Buscar por nombre o NIT…').fill(nombre);
    await this.formulario.getByRole('button', { name: nombre }).click();
  }

  // numero empieza en 1, igual que el nombre accesible del campo ("Producto del ítem 1")
  async llenarItem(numero, { producto, cantidad, fechaEntrega }) {
    await this.formulario.getByLabel(`Producto del ítem ${numero}`).fill(producto);
    if (cantidad !== undefined) {
      await this.formulario.getByLabel(`Cantidad del ítem ${numero}`).fill(String(cantidad));
    }
    if (fechaEntrega !== undefined) {
      await this.formulario.getByLabel(`Fecha de entrega del ítem ${numero}`).fill(fechaEntrega);
    }
  }

  async agregarItem() {
    await this.formulario.getByRole('button', { name: 'Agregar item' }).click();
  }

  filaDelCliente(nombreCliente) {
    return this.page.getByRole('row').filter({ hasText: nombreCliente });
  }
}
