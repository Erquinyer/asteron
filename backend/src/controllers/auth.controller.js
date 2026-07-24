import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

// POST /api/auth/login
// req.body ya viene validado por loginSchema (ver middlewares/validate.middleware.js)
export const login = asyncHandler(async (req, res) => {
  const { correo, contrasena } = req.body

  // 1. Buscar usuario por correo + traer nombre del rol
  const [rows] = await pool.query(
    `SELECT u.*, r.nombre AS rol
     FROM usuarios u
     LEFT JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.correo = ?
     LIMIT 1`,
    [correo]
  )

  const user = rows[0]

  // 2. Usuario no existe — mismo mensaje que contraseña incorrecta (seguridad)
  if (!user) return fail(res, 'Credenciales incorrectas', 401)

  // 3. Usuario inactivo
  if (!user.estado) return fail(res, 'Usuario inactivo. Contacta al administrador.', 403)

  // 4. Verificar contraseña
  const passwordValida = await bcrypt.compare(contrasena, user.password_hash)
  if (!passwordValida) return fail(res, 'Credenciales incorrectas', 401)

  // 5. Registrar último acceso
  await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = ?', [user.id_usuario])

  // 6. Obtener módulos habilitados para el rol del usuario
  const [modulosRows] = await pool.query(
    `SELECT p.nombre AS modulo
     FROM permisos p
     JOIN roles_permisos rp ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = ?`,
    [user.id_rol]
  )
  const modulos = modulosRows.map(r => r.modulo)

  // 6b. Obtener acciones permitidas por módulo
  const [accionesRows] = await pool.query(
    'SELECT modulo, accion FROM acciones_modulo WHERE id_rol = ?',
    [user.id_rol]
  )
  const acciones = {}
  for (const { modulo, accion } of accionesRows) {
    if (!acciones[modulo]) acciones[modulo] = []
    acciones[modulo].push(accion)
  }

  // 7. Generar token JWT
  const token = jwt.sign(
    { id: user.id_usuario, correo: user.correo, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )

  // 8. Responder con datos del usuario, módulos, acciones y token
  // Se mantiene el objeto envuelto en "user" porque el frontend
  // (Login.jsx) espera exactamente data.user, no el objeto plano.
  ok(res, {
    user: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol:    user.rol,
      modulos,
      acciones,
      token,
    },
  }, 'Inicio de sesión exitoso')
})
