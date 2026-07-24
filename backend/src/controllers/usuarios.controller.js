import pool   from '../config/db.js'
import bcrypt from 'bcryptjs'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

export const getAll = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado, u.ultimo_login, u.created_at,
           r.id_rol, r.nombre AS rol
    FROM usuarios u
    LEFT JOIN roles r ON u.id_rol = r.id_rol
    ORDER BY u.codigo_empleado, u.nombre`)
  ok(res, rows, 'Usuarios obtenidos correctamente')
})

export const getRoles = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol')
  ok(res, rows, 'Roles obtenidos correctamente')
})

// req.body ya viene validado por usuarioCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { nombre, correo, password, id_rol, codigo_empleado } = req.body

  // Auto-generar código si no se proporciona
  let codigo = codigo_empleado?.trim() || null
  if (!codigo) {
    const [[last]] = await pool.query(
      `SELECT codigo_empleado FROM usuarios WHERE codigo_empleado LIKE 'EMP-%' ORDER BY codigo_empleado DESC LIMIT 1`)
    const num = last ? parseInt(last.codigo_empleado.replace('EMP-', '')) + 1 : 1
    codigo = `EMP-${String(num).padStart(3, '0')}`
  }

  const hash = await bcrypt.hash(password, 10)
  const [result] = await pool.query(
    `INSERT INTO usuarios (codigo_empleado, nombre, correo, password_hash, id_rol, estado) VALUES (?,?,?,?,?,1)`,
    [codigo, nombre, correo, hash, id_rol || null])
  const [[user]] = await pool.query(
    `SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado, r.nombre AS rol
     FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?`,
    [result.insertId])
  ok(res, user, 'Usuario creado correctamente', 201)
})

// req.body ya viene validado por usuarioUpdateSchema
export const update = asyncHandler(async (req, res) => {
  const { nombre, correo, password, id_rol, estado, codigo_empleado } = req.body

  if (password) {
    const hash = await bcrypt.hash(password, 10)
    await pool.query(
      `UPDATE usuarios SET codigo_empleado=?, nombre=?, correo=?, password_hash=?, id_rol=?, estado=? WHERE id_usuario=?`,
      [codigo_empleado || null, nombre, correo, hash, id_rol || null, estado ?? 1, req.params.id])
  } else {
    await pool.query(
      `UPDATE usuarios SET codigo_empleado=?, nombre=?, correo=?, id_rol=?, estado=? WHERE id_usuario=?`,
      [codigo_empleado || null, nombre, correo, id_rol || null, estado ?? 1, req.params.id])
  }

  const [[user]] = await pool.query(
    `SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado, u.id_rol, r.nombre AS rol
     FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario = ?`,
    [req.params.id])
  if (!user) return fail(res, 'Usuario no encontrado', 404)
  ok(res, user, 'Usuario actualizado correctamente')
})

export const toggleEstado = asyncHandler(async (req, res) => {
  await pool.query(`UPDATE usuarios SET estado = IF(estado=1, 0, 1) WHERE id_usuario=?`, [req.params.id])
  const [[user]] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.estado, r.nombre AS rol
     FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario=?`,
    [req.params.id])
  ok(res, user, 'Estado actualizado correctamente')
})
