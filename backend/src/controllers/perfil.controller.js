import pool   from '../config/db.js'
import bcrypt from 'bcryptjs'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

export const getPerfil = asyncHandler(async (req, res) => {
  const [[user]] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.ultimo_login, u.created_at,
            r.id_rol, r.nombre AS rol, r.descripcion AS rol_descripcion
     FROM usuarios u
     LEFT JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.id_usuario = ?`, [req.user.id])
  if (!user) return fail(res, 'Usuario no encontrado', 404)
  ok(res, user, 'Perfil obtenido correctamente')
})

// req.body ya viene validado por perfilUpdateSchema
export const updatePerfil = asyncHandler(async (req, res) => {
  const { nombre } = req.body
  await pool.query(`UPDATE usuarios SET nombre = ? WHERE id_usuario = ?`, [nombre.trim(), req.user.id])
  const [[user]] = await pool.query(
    `SELECT u.id_usuario, u.nombre, u.correo, r.nombre AS rol
     FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.id_usuario = ?`, [req.user.id])
  ok(res, user, 'Perfil actualizado correctamente')
})

// req.body ya viene validado por changePasswordSchema
export const changePassword = asyncHandler(async (req, res) => {
  const { actual, nueva } = req.body

  const [[user]] = await pool.query('SELECT password_hash FROM usuarios WHERE id_usuario = ?', [req.user.id])
  const coincide = await bcrypt.compare(actual, user.password_hash)
  if (!coincide) return fail(res, 'La contraseña actual es incorrecta', 401)

  const hash = await bcrypt.hash(nueva, 10)
  await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [hash, req.user.id])
  ok(res, null, 'Contraseña actualizada correctamente')
})
