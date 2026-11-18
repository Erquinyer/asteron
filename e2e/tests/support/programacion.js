import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

// Sufijo único para los datos del escenario. randomUUID y no Date.now() con un
// aleatorio corto: con 4+ workers dos escenarios chocaron en el mismo milisegundo.
const sufijoUnico = () => randomUUID().slice(0, 8);

// Fecha de hoy con los componentes locales, no toISOString() (que la pasa a UTC
// y en Colombia adelanta un día por la noche) — misma regla que backend/src/utils/dates.js.
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function ok(respuesta) {
  expect(respuesta.ok(), `${respuesta.url()}: ${respuesta.status()} ${await respuesta.text()}`).toBe(true);
  return respuesta.json();
}

// Arrange por API de todo lo que necesita un turno: un operario, una máquina de
// la categoría que usa la fase "Corte" y un proyecto sin pedido (una sola fila
// por fase). Todo con nombres únicos: otro test en paralelo no los ocupa.
export async function crearEscenarioTurno(api) {
  const roles = await ok(await api.get('admin/roles'));
  const operarioRol = roles.find((r) => r.nombre === 'Operario');

  // Corto: maquinaria.codigo es VARCHAR(20)
  const sufijo = sufijoUnico().toUpperCase();
  const operario = await ok(
    await api.post('usuarios', {
      data: {
        nombre: `Operario ${sufijo}`,
        correo: `operario-${sufijo.toLowerCase()}@e2e.test`,
        password: 'operario-e2e',
        id_rol: operarioRol.id_rol,
        // Código propio (VARCHAR(10)): el autogenerado EMP-NNN lee el último y
        // suma 1 sin bloqueo, y dos altas en paralelo chocan con un 409.
        codigo_empleado: `E${sufijo}`,
      },
    }),
  );
  const maquina = await ok(
    await api.post('maquinaria', {
      data: { nombre: `Tronzadora ${sufijo}`, codigo: `TZ-${sufijo}`, categoria: 'maquinaria_pesada', estado: 'activa' },
    }),
  );
  const proyecto = await ok(await api.post('proyectos', { data: { nombre: `Proyecto ${sufijo}`, fecha_inicio: hoyISO() } }));
  const { fases } = await ok(await api.get(`proyectos/${proyecto.id_proyecto}`));
  const corte = fases.find((f) => f.fase_nombre === 'Corte');

  return { operario, maquina, proyecto, corte };
}

// Turno ya programado por API (para los tests que necesitan un operario ocupado).
export async function programarTurnoPorApi(api, { operario, maquina, proyecto, corte }, fecha = hoyISO()) {
  return ok(
    await api.post('programacion', {
      data: {
        fecha,
        id_operario: operario.id_usuario,
        id_maquina: maquina.id_maquina,
        id_proyecto: proyecto.id_proyecto,
        id_fase_proyecto: corte.id_fase_proyecto,
      },
    }),
  );
}
