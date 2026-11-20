// Prepara una base NUEVA de producción: carga los catálogos (roles, módulos por rol,
// acciones y fases estándar) y crea el primer usuario Administrador Sistema.
// A diferencia de seed.js, no borra nada ni carga datos de prueba.
//
// Orden en una base nueva: 1) esquema (asteron_v2.sql), 2) este script, 3) `pnpm migrar`.
// Uso:
//   ADMIN_NOMBRE="Nombre Apellido" ADMIN_CORREO=correo@macromet.com.co \
//   ADMIN_CONTRASENA='una-clave-larga' pnpm inicializar
//
// La contraseña va por variable de entorno y no como argumento para que no quede en
// el historial de procesos. Solo crea el administrador si todavía no hay usuarios.
import dotenv from 'dotenv'
dotenv.config()
import bcrypt from 'bcryptjs'
import pool from '../src/config/db.js'
import { cargarRoles, cargarPermisos, cargarFasesEstandar, ID_ADMINISTRADOR_SISTEMA } from './catalogos.js'

const MIN_CONTRASENA = 12
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const run = async () => {
  // Los catálogos usan ids fijos. En una base que ya tiene roles (cargados por seed.js
  // o por otra vía) los ids podrían no coincidir y se darían permisos al rol equivocado,
  // así que solo se cargan en una base vacía.
  const [[{ roles }]] = await pool.query('SELECT COUNT(*) AS roles FROM roles')
  if (roles === 0) {
    await cargarRoles(pool)
    await cargarPermisos(pool)
    await cargarFasesEstandar(pool)
    console.log('✅ Catálogos: roles, módulos por rol, acciones y fases estándar')
  } else {
    console.log(`· La base ya tiene ${roles} rol(es): no se cargan catálogos`)
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM usuarios')
  if (total > 0) {
    console.log(`· Ya hay ${total} usuario(s): no se crea otro administrador`)
    return
  }

  const nombre = process.env.ADMIN_NOMBRE?.trim()
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase()
  const contrasena = process.env.ADMIN_CONTRASENA || ''
  if (!nombre || !CORREO.test(correo || '') || contrasena.length < MIN_CONTRASENA) {
    throw new Error(`Para crear el primer administrador define ADMIN_NOMBRE, ADMIN_CORREO (válido) y ADMIN_CONTRASENA (mínimo ${MIN_CONTRASENA} caracteres)`)
  }
  await pool.query(
    `INSERT INTO usuarios (codigo_empleado, nombre, correo, password_hash, id_rol, estado)
     VALUES ('EMP-000', ?, ?, ?, ?, 1)`,
    [nombre, correo, await bcrypt.hash(contrasena, 10), ID_ADMINISTRADOR_SISTEMA])
  console.log(`✅ Administrador Sistema creado: ${correo}`)
}

run()
  .then(() => pool.end())
  .catch(async (err) => { console.error('❌', err.message); await pool.end().catch(() => {}); process.exit(1) })
