import pool from '../src/config/db.js'

const run = async () => {
  try {
    await pool.query(`
      ALTER TABLE programacion_planta
      ADD COLUMN porcentaje_avance TINYINT UNSIGNED NOT NULL DEFAULT 0
        COMMENT '% de avance de la actividad (100 al completar)'
        AFTER tiempo_real
    `)
    console.log('✅ Columna porcentaje_avance agregada a programacion_planta')
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  La columna porcentaje_avance ya existía — nada que hacer')
    } else {
      throw err
    }
  }

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
