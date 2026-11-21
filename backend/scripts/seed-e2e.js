// ============================================================
// Datos mínimos para los E2E (semana 7) en la BD de pruebas desechable
// (servicio mysql-test de docker-compose, puerto 3308).
//
// Por qué un seed propio y no scripts/seed.js:
//  - El esquema "Data Base/asteron_v2.sql" no crea la tabla acciones_modulo
//    (la crea scripts/migrate_acciones_modulo.js), y el login la consulta:
//    sin ella, iniciar sesión responde 500.
//  - scripts/seed.js inserta clientes con una columna "direccion" que ya no
//    existe en el esquema (ahora es la tabla direcciones_cliente), así que
//    falla a mitad de camino contra una BD nueva.
//
// Es idempotente (se puede correr en cada arranque de Playwright) y solo
// crea lo que los E2E necesitan: roles, permisos, acciones, un usuario
// administrador, un operario sin permiso de pedidos y las fases estándar.
// Los datos de cada test (clientes, pedidos…) los crea cada test por API.
// ============================================================
import dotenv from 'dotenv'
dotenv.config()
import bcrypt from 'bcryptjs'
import pool from '../src/config/db.js'

// Protección: este script solo corre contra la BD de pruebas (puerto 3308),
// nunca contra la de desarrollo.
if (process.env.DB_PORT !== '3308') {
  console.error('❌ seed-e2e solo corre contra la BD de pruebas (DB_PORT=3308). Lo lanza Playwright; no lo corras a mano.')
  process.exit(1)
}

const MODULOS = ['dashboard', 'proyectos', 'pedidos', 'clientes', 'maquinaria',
  'mantenimientos', 'programacion', 'usuarios']
const ACCIONES = ['crear', 'editar', 'eliminar']

const USUARIOS_E2E = [
  { correo: 'admin@macromet.com.co',          nombre: 'Administrador Sistema', contrasena: 'admin2026',    rol: 'Administrador Sistema' },
  { correo: 'operario.e2e@macromet.com.co',   nombre: 'Operario E2E',          contrasena: 'operario2026', rol: 'Operario' },
]

const FASES_ESTANDAR = [
  ['Diseño, render e ingeniería', 1, 0, null],
  ['Compra de materiales',        2, 0, null],
  ['Corte',                       3, 1, 'maquinaria_pesada'],
  ['Doblez y conformado',         4, 1, 'maquinaria_pesada'],
  ['Soldadura MIG',               5, 1, 'equipo_mig'],
  ['Lijado y preparación',        6, 1, 'herramienta_electrica'],
  ['Pintura y acabados',          7, 0, null],
  ['Ensamble final',              8, 1, 'herramienta_electrica'],
  ['Control de calidad',          9, 1, null],
  ['Despacho e instalación',     10, 1, null],
]

const idRol = async (nombre) => {
  const [[rol]] = await pool.query('SELECT id_rol FROM roles WHERE nombre = ?', [nombre])
  return rol.id_rol
}

const sembrar = async () => {
  // Misma definición que scripts/migrate_acciones_modulo.js
  await pool.query(`
    CREATE TABLE IF NOT EXISTS acciones_modulo (
      id      INT NOT NULL AUTO_INCREMENT,
      id_rol  INT NOT NULL,
      modulo  VARCHAR(50) NOT NULL,
      accion  ENUM('crear','editar','eliminar') NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_rol_mod_acc (id_rol, modulo, accion),
      CONSTRAINT fk_am_rol FOREIGN KEY (id_rol)
        REFERENCES roles(id_rol) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`)

  await pool.query(`INSERT IGNORE INTO roles (nombre, descripcion) VALUES
    ('Administrador Sistema', 'Acceso total (E2E)'),
    ('Operario',              'Solo dashboard y programación (E2E)')`)
  await pool.query('INSERT IGNORE INTO permisos (nombre) VALUES ?', [MODULOS.map(m => [m])])

  const admin    = await idRol('Administrador Sistema')
  const operario = await idRol('Operario')

  await pool.query(
    'INSERT IGNORE INTO roles_permisos (id_rol, id_permiso) SELECT ?, id_permiso FROM permisos', [admin])
  await pool.query(
    `INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
     SELECT ?, id_permiso FROM permisos WHERE nombre IN ('dashboard', 'programacion')`, [operario])
  await pool.query(
    'INSERT IGNORE INTO acciones_modulo (id_rol, modulo, accion) VALUES ?',
    [MODULOS.filter(m => m !== 'dashboard').flatMap(m => ACCIONES.map(a => [admin, m, a]))])

  for (const u of USUARIOS_E2E) {
    const hash = await bcrypt.hash(u.contrasena, 10)
    await pool.query(
      `INSERT INTO usuarios (nombre, correo, password_hash, id_rol, estado) VALUES (?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), id_rol = VALUES(id_rol), estado = 1`,
      [u.nombre, u.correo, hash, await idRol(u.rol)])
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM fases_estandar')
  if (total === 0) {
    await pool.query(
      'INSERT INTO fases_estandar (nombre, orden, requiere_turno, categoria_equipo) VALUES ?', [FASES_ESTANDAR])
  }
}

try {
  await sembrar()
  console.log('✅ Datos E2E listos en la BD de pruebas')
  await pool.end()
} catch (err) {
  console.error(`❌ No se pudieron sembrar los datos E2E en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
    `¿Está arriba la BD de pruebas? (docker compose up -d --wait mysql-test). Causa: ${err.message}`)
  process.exit(1)
}
