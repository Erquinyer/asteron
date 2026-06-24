import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'

export const login = async (req, res) => {
  const { correo, contrasena } = req.body

  // Validación básica de campos
  if (!correo || !contrasena) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos' })
  }

  try {
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
    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    // 3. Usuario inactivo
    if (!user.estado) {
      return res.status(403).json({ message: 'Usuario inactivo. Contacta al administrador.' })
    }

    // 4. Verificar contraseña
    const passwordValida = await bcrypt.compare(contrasena, user.password_hash)
    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales incorrectas' })
    }

    // 5. Registrar último acceso
    await pool.query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = ?',
      [user.id_usuario]
    )

    // 6. Generar token JWT
    const token = jwt.sign(
      { id: user.id_usuario, correo: user.correo, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    )

    // 7. Responder con los datos del usuario y el token
    return res.json({
      user: {
        nombre: user.nombre,
        correo: user.correo,
        rol:    user.rol,
        token,
      },
    })
  } catch (error) {
    console.error('[auth.login]', error)
    return res.status(500).json({ message: 'Error interno del servidor' })
  }
}
