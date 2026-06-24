/**
 * Migration: add Administrador Sistema role and wire admin user to it.
 * Safe to run multiple times (idempotent via INSERT IGNORE / IF NOT EXISTS checks).
 */
import dotenv from 'dotenv'
dotenv.config()
import pool from '../src/config/db.js'

const migrate = async () => {
  console.log('🔧 Migrando: rol Administrador Sistema...\n')

  // 1. Insert the admin role if it doesn't exist
  const [[existing]] = await pool.query(
    `SELECT id_rol FROM roles WHERE nombre = 'Administrador Sistema' LIMIT 1`)

  let adminRolId
  if (existing) {
    adminRolId = existing.id_rol
    console.log(`ℹ️  Rol "Administrador Sistema" ya existe (id_rol=${adminRolId})`)
  } else {
    const [res] = await pool.query(
      `INSERT INTO roles (nombre, descripcion) VALUES ('Administrador Sistema', 'Administrador del sistema con acceso total y gestión de permisos')`)
    adminRolId = res.insertId
    console.log(`✅ Rol "Administrador Sistema" creado (id_rol=${adminRolId})`)
  }

  // 2. Give admin role all permissions
  await pool.query(`DELETE FROM roles_permisos WHERE id_rol = ?`, [adminRolId])
  await pool.query(
    `INSERT INTO roles_permisos (id_rol, id_permiso) SELECT ?, id_permiso FROM permisos`,
    [adminRolId])
  console.log('✅ Permisos totales asignados al rol Administrador Sistema')

  // 3. Point EMP-000 admin user to the admin role
  const [upd] = await pool.query(
    `UPDATE usuarios SET id_rol = ? WHERE codigo_empleado = 'EMP-000'`, [adminRolId])
  if (upd.affectedRows > 0) {
    console.log('✅ Usuario EMP-000 (admin@macromet.com.co) actualizado al nuevo rol')
  } else {
    console.log('⚠️  No se encontró usuario EMP-000 — crea el usuario admin primero')
  }

  console.log('\n✅ Migración completada')
  process.exit(0)
}

migrate().catch(e => { console.error(e); process.exit(1) })
