// Objeto de página: locators y acciones repetidas de Programación de planta y
// del modal "Nueva actividad". Las aserciones se quedan en los tests.
export class ProgramacionPage {
  constructor(page) {
    this.page = page;
    this.modal = page.getByRole('dialog', { name: 'Nueva actividad' });
    this.fecha = this.modal.getByLabel('Fecha');
    this.proyecto = this.modal.getByLabel('Proyecto');
    this.fase = this.modal.getByLabel('Fase del proyecto');
    this.operario = this.modal.getByLabel('Operario');
    this.maquina = this.modal.getByLabel('Máquina / Equipo');
    this.observaciones = this.modal.getByLabel('Tarea / Observaciones');
    this.guardar = this.modal.getByRole('button', { name: 'Programar actividad' });
  }

  async goto() {
    await this.page.goto('/programacion');
  }

  async abrirNuevaActividad() {
    await this.page.getByRole('button', { name: 'Programar actividad' }).click();
  }

  // Elige proyecto y su fase "Corte" (la fase solo aparece tras elegir proyecto
  // y sus opciones llegan por API: selectOption espera a que exista la opción).
  async elegirProyectoYFase(proyecto) {
    await this.proyecto.selectOption({ label: proyecto.nombre });
    await this.fase.selectOption({ label: 'Corte (pendiente)' });
  }

  // Grupo desplegable del proyecto en la lista del día (colapsado por defecto)
  grupoProyecto(proyecto) {
    return this.page.getByRole('button', { name: new RegExp(proyecto.nombre) });
  }
}
