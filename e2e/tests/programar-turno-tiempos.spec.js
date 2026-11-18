import { expect, test } from './support/fixtures.js';
import { retrasarRespuestas } from './support/network.js';
import { crearEscenarioTurno, hoyISO, programarTurnoPorApi } from './support/programacion.js';
import { ProgramacionPage } from './support/programacion-page.js';

// Semana 7, Parte 3 — defectos de tiempos del flujo "programar un turno".
// Los retrasos hacen el test determinista: con el backend local todo responde
// en milisegundos y estas condiciones casi nunca se dan solas.

const mananaISO = () => {
  const d = new Date(`${hoyISO()}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Al terminar el test puede quedar una respuesta retrasada todavía esperando
// (el modal pide la disponibilidad de hoy más de una vez). Sin esto, al cerrarse
// la página esa respuesta falla con "Fetch response has been disposed" y tumba
// un test que ya había pasado.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('debe enviar un solo POST cuando se hace doble clic en Programar actividad', async ({ page, api }) => {
  // Arrange — el POST tarda en responder, como con una red lenta
  const { operario, maquina, proyecto } = await crearEscenarioTurno(api);
  await retrasarRespuestas(page, '**/api/programacion', { metodo: 'POST', ms: 500 });
  const posts = [];
  page.on('request', (peticion) => {
    if (peticion.method() === 'POST' && peticion.url().endsWith('/api/programacion')) posts.push(peticion);
  });
  const programacion = new ProgramacionPage(page);
  await programacion.goto();
  await programacion.abrirNuevaActividad();
  await programacion.elegirProyectoYFase(proyecto);
  await programacion.operario.selectOption({ label: operario.nombre });
  await programacion.maquina.selectOption({ label: `[${maquina.codigo}] ${maquina.nombre}` });

  // Act
  await programacion.guardar.dblclick();

  // Assert — un solo turno: ni dos POST ni un 409 por el segundo
  await expect(page.getByRole('status').filter({ hasText: 'Actividad programada' })).toBeVisible();
  expect(posts).toHaveLength(1);
  const turnos = await (await api.get(`programacion?fecha=${hoyISO()}`)).json();
  expect(turnos.filter((t) => t.id_operario === operario.id_usuario)).toHaveLength(1);
});

test('no debe ofrecer un operario ocupado aunque la disponibilidad de otra fecha llegue tarde', async ({ page, api }) => {
  // Arrange — el operario ya tiene turno mañana; la disponibilidad de hoy tarda 1,5 s
  const escenario = await crearEscenarioTurno(api);
  await programarTurnoPorApi(api, escenario, mananaISO());
  const hoy = hoyISO();
  await retrasarRespuestas(page, '**/api/programacion/ocupados*', {
    ms: 1500,
    cuales: (peticion) => new URL(peticion.url()).searchParams.get('fecha') === hoy,
  });
  const respuestaDeHoy = page.waitForResponse((r) => r.url().includes(`/ocupados?fecha=${hoy}`));
  const programacion = new ProgramacionPage(page);
  await programacion.goto();
  await programacion.abrirNuevaActividad();

  // Act — la persona cambia a mañana mientras la consulta de hoy sigue cargando
  await programacion.fecha.fill(mananaISO());
  await respuestaDeHoy;

  // Assert — cuando todo termina de llegar, el formulario muestra la disponibilidad de mañana
  await expect(programacion.operario.getByRole('option', { name: escenario.operario.nombre })).toHaveCount(0);
});
