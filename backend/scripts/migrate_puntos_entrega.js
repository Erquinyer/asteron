import pool from '../src/config/db.js'

// Reemplaza detalle_pedido.punto_descargue (un solo destino por ítem) por la
// tabla puntos_entrega_detalle (varios destinos por ítem, cada uno con su
// propia cantidad). Idempotente: se puede correr varias veces sin duplicar
// datos ni fallar si ya se aplicó antes.

const tableExists = async (tabla) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tabla])
  return row.n > 0
}

const columnExists = async (tabla, columna) => {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS n FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [tabla, columna])
  return row.n > 0
}

const run = async () => {
  if (!(await tableExists('puntos_entrega_detalle'))) {
    await pool.query(`
      CREATE TABLE puntos_entrega_detalle (
        id_entrega   INT          NOT NULL AUTO_INCREMENT,
        id_detalle   INT          NOT NULL,
        direccion    VARCHAR(255) NOT NULL,
        cantidad     INT          NOT NULL,
        PRIMARY KEY (id_entrega),
        CONSTRAINT fk_entrega_detalle FOREIGN KEY (id_detalle) REFERENCES detalle_pedido(id_detalle) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)
    console.log('✅ Tabla puntos_entrega_detalle creada')
  } else {
    console.log('· Tabla puntos_entrega_detalle ya existe')
  }

  if (await columnExists('detalle_pedido', 'punto_descargue')) {
    const [{ affectedRows }] = await pool.query(`
      INSERT INTO puntos_entrega_detalle (id_detalle, direccion, cantidad)
      SELECT id_detalle, punto_descargue, COALESCE(cantidad, 1)
      FROM detalle_pedido
      WHERE punto_descargue IS NOT NULL AND punto_descargue != ''
        AND id_detalle NOT IN (SELECT DISTINCT id_detalle FROM puntos_entrega_detalle)`)
    console.log(`✅ ${affectedRows} punto(s) de entrega migrados desde detalle_pedido.punto_descargue`)

    await pool.query(`ALTER TABLE detalle_pedido DROP COLUMN punto_descargue`)
    console.log('✅ detalle_pedido.punto_descargue eliminada')
  } else {
    console.log('· detalle_pedido.punto_descargue ya no existe')
  }

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
