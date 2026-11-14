// Agrega usuarios.acepta_politica_datos (Ley 1581 de 2012).
// Se puede correr varias veces: si la columna ya existe no hace nada.
import dotenv from 'dotenv'
dotenv.config()
import pool from '../src/config/db.js'

const run = async () => {
  const [[{ existe }]] = await pool.query(
    `SELECT COUNT(*) AS existe FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND column_name = 'acepta_politica_datos'`)
  if (existe) {
    console.log('· usuarios.acepta_politica_datos ya existe')
  } else {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN acepta_politica_datos DATETIME DEFAULT NULL
      COMMENT 'Cuándo aceptó la política de tratamiento de datos (Ley 1581 de 2012); NULL = pendiente'
      AFTER ultimo_login`)
    console.log('✅ usuarios.acepta_politica_datos')
  }
  await pool.end()
}

run().catch(e => { console.error(e); process.exit(1) })
