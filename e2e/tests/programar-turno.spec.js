import { expect, test } from './support/fixtures.js';
import { crearEscenarioTurno, programarTurnoPorApi } from './support/programacion.js';
import { ProgramacionPage } from './support/programacion-page.js';

// Flujo crítico C (semana 7): programar un turno de planta. Es lo que el líder
// de planta hace todos los días, y si falla, la planta no sabe quién trabaja
// en qué máquina ni el avance de las fases de cada proyecto.
// La sesión del administrador ya viene preparada por auth.setup.js y los datos
// se crean con el fixture "api" (tests/support/fixtures.js).

test('debe programar un turno para hoy y mostrarlo en el grupo de su proyecto', async ({ page, api }) => {
  // Arrange — operario, máquina y proyecto nuevos, creados por API
  const { operario, maquina, proyecto } = await crearEscenarioTurno(api);
  const programacion = new ProgramacionPage(page);
  await programacion.goto();
  await programacion.abrirNuevaActividad();

  // Act
  await programacion.elegirProyectoYFase(proyecto);
  await programacion.operario.selectOption({ label: operario.nombre });
  await programacion.maquina.selectOption({ label: `[${maquina.codigo}] ${maquina.nombre}` });
  await programacion.guardar.click();

  // Assert
  await expect(page.getByRole('status').filter({ hasText: 'Actividad programada' })).toBeVisible();
  await expect(programacion.modal).toBeHidden();
  await expect(programacion.grupoProyecto(proyecto)).toContainText('1 turno');
  await programacion.grupoProyecto(proyecto).click();
  await expect(page.getByText(operario.nombre)).toBeVisible();
});

test('no debe ofrecer un operario que ya tiene un turno ese día', async ({ page, api }) => {
  // Arrange — el operario del escenario ocupado ya tiene turno hoy; el del libre no
  const ocupado = await crearEscenarioTurno(api);
  await programarTurnoPorApi(api, ocupado);
  const libre = await crearEscenarioTurno(api);
  const programacion = new ProgramacionPage(page);
  await programacion.goto();

  // Act
  await programacion.abrirNuevaActividad();

  // Assert — el libre sí aparece (la lista ya cargó) y el ocupado no
  await expect(programacion.operario.getByRole('option', { name: libre.operario.nombre })).toBeAttached();
  await expect(programacion.operario.getByRole('option', { name: ocupado.operario.nombre })).toHaveCount(0);
});

test('debe avisar que la fase exige un equipo cuando no se elige máquina', async ({ page, api }) => {
  // Arrange
  const { operario, proyecto } = await crearEscenarioTurno(api);
  const programacion = new ProgramacionPage(page);
  await programacion.goto();
  await programacion.abrirNuevaActividad();

  // Act — "Corte" usa maquinaria pesada, pero no se elige ninguna
  await programacion.elegirProyectoYFase(proyecto);
  await programacion.operario.selectOption({ label: operario.nombre });
  await programacion.guardar.click();

  // Assert — el aviso se ve y el modal sigue abierto para corregir
  await expect(page.getByRole('status').filter({ hasText: 'Esta fase requiere seleccionar un equipo' })).toBeVisible();
  await expect(programacion.modal).toBeVisible();
});
