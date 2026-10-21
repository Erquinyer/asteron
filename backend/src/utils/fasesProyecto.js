// Crea las fases "por ítem" (todas las de fases_estandar excepto las dos fases
// únicas del proyecto — Diseño y Compra, orden 1 y 2 — que son de nivel de
// proyecto y ya existen desde que el proyecto se creó) para un ítem de pedido
// que se agrega DESPUÉS de que el proyecto ya existe. Son las mismas fases que
// proyectos.controller.js crea por cada ítem al crear el proyecto — se separó
// aquí para poder llamarla también desde pedidos.controller.js cuando se
// agrega un ítem a un pedido con proyecto asociado.
export async function crearFasesItem(db, id_proyecto, id_detalle_pedido) {
  const [fasesEstandar] = await db.query(
    'SELECT id_fase_estandar FROM fases_estandar WHERE orden > 2 ORDER BY orden')
  if (fasesEstandar.length === 0) return

  const values = fasesEstandar.map(f =>
    [id_proyecto, f.id_fase_estandar, id_detalle_pedido, null, 'pendiente', 0])

  await db.query(
    `INSERT INTO fases_proyecto
     (id_proyecto, id_fase_estandar, id_detalle_pedido, id_usuario_asignado, estado, porcentaje_avance)
     VALUES ?`, [values])
}
