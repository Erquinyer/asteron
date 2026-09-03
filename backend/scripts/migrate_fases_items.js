import pool from '../src/config/db.js'

// Agrega soporte para fases por ítem de pedido (Corte→Despacho independientes
// por producto) y fases únicas asignadas a una persona (Diseño, Compra de
// materiales). Idempotente: cada ALTER se salta si la columna ya existe.

const columnExists = async (tabla, columna) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tabla, columna])
  return row.n > 0
}

const constraintExists = async (nombre) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.table_constraints
     WHERE table_schema = DATABASE() AND constraint_name = ?`,
    [nombre])
  return row.n > 0
}

const run = async () => {
  if (!(await columnExists('detalle_pedido', 'fecha_entrega_estimada'))) {
    await pool.query(
      `ALTER TABLE detalle_pedido ADD COLUMN fecha_entrega_estimada DATE NULL AFTER estado`)
    console.log('✅ detalle_pedido.fecha_entrega_estimada agregada')
  } else {
    console.log('· detalle_pedido.fecha_entrega_estimada ya existe')
  }

  if (!(await columnExists('fases_proyecto', 'id_detalle_pedido'))) {
    await pool.query(
      `ALTER TABLE fases_proyecto ADD COLUMN id_detalle_pedido INT NULL AFTER id_fase_estandar`)
    console.log('✅ fases_proyecto.id_detalle_pedido agregada')
  } else {
    console.log('· fases_proyecto.id_detalle_pedido ya existe')
  }

  if (!(await columnExists('fases_proyecto', 'id_usuario_asignado'))) {
    await pool.query(
      `ALTER TABLE fases_proyecto ADD COLUMN id_usuario_asignado INT NULL AFTER id_detalle_pedido`)
    console.log('✅ fases_proyecto.id_usuario_asignado agregada')
  } else {
    console.log('· fases_proyecto.id_usuario_asignado ya existe')
  }

  if (!(await constraintExists('fk_fase_detalle'))) {
    await pool.query(
      `ALTER TABLE fases_proyecto ADD CONSTRAINT fk_fase_detalle
       FOREIGN KEY (id_detalle_pedido) REFERENCES detalle_pedido(id_detalle)
       ON DELETE CASCADE ON UPDATE CASCADE`)
    console.log('✅ fk_fase_detalle agregada')
  } else {
    console.log('· fk_fase_detalle ya existe')
  }

  if (!(await constraintExists('fk_fase_usuario_asignado'))) {
    await pool.query(
      `ALTER TABLE fases_proyecto ADD CONSTRAINT fk_fase_usuario_asignado
       FOREIGN KEY (id_usuario_asignado) REFERENCES usuarios(id_usuario)
       ON DELETE SET NULL ON UPDATE CASCADE`)
    console.log('✅ fk_fase_usuario_asignado agregada')
  } else {
    console.log('· fk_fase_usuario_asignado ya existe')
  }

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
