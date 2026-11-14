// Migración para bases creadas antes de la autorización de tratamiento de datos (Ley 1581 de 2012).
// Se puede ejecutar más de una vez: solo agrega lo que falta.
import pool from '../src/config/db.js'

const columnaExiste = async (tabla, columna) => {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${tabla} LIKE ?`, [columna])
  return rows.length > 0
}

const run = async () => {
  if (!await columnaExiste('usuarios', 'politica_datos_version')) {
    await pool.query(`ALTER TABLE usuarios
      ADD COLUMN politica_datos_version     VARCHAR(10) DEFAULT NULL COMMENT 'Versión de la política de datos que autorizó; NULL = no ha autorizado' AFTER ultimo_login,
      ADD COLUMN politica_datos_aceptada_en DATETIME    DEFAULT NULL COMMENT 'Prueba de la autorización (Decreto 1377 de 2013)' AFTER politica_datos_version`)
    console.log('✅ usuarios: politica_datos_version y politica_datos_aceptada_en')
  } else {
    console.log('✔ usuarios ya tiene las columnas de la política de datos')
  }

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
