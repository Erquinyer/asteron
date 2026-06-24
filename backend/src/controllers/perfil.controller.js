import pool   from '../config/db.js'
import bcrypt  from 'bcryptjs'

export const getPerfil = async (req, res) => {
  try {
    const [[user]] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.ultimo_login, u.created_at,
              r.id_rol, r.nombre AS rol, r.descripcion AS rol_descripcion
       FROM usuarios u
       LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`, [req.user.id])
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch (err) {
    console.error('[perfil.get]', err)
    res.status(500).json({ message: 'Error al obtener perfil' })
  }
}

export const updatePerfil = async (req, res) => {
  const { nombre } = req.body
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
  try {
    await pool.query(
      `UPDATE usuarios SET nombre = ? WHERE id_usuario = ?`, [nombre.trim(), req.user.id])
    const [[user]] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, r.nombre AS rol
       FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol
       WHERE u.id_usuario = ?`, [req.user.id])
    res.json(user)
  } catch (err) {
    console.error('[perfil.update]', err)
    res.status(500).json({ message: 'Error al actualizar perfil' })
  }
}

export const changePassword = async (req, res) => {
  const { actual, nueva } = req.body
  if (!actual || !nueva) return res.status(400).json({ message: 'Contraseña actual y nueva son requeridas' })
  if (nueva.length < 6)  return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' })

  try {
    const [[user]] = await pool.query(
      'SELECT password_hash FROM usuarios WHERE id_usuario = ?', [req.user.id])
    const ok = await bcrypt.compare(actual, user.password_hash)
    if (!ok) return res.status(401).json({ message: 'La contraseña actual es incorrecta' })

    const hash = await bcrypt.hash(nueva, 10)
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [hash, req.user.id])
    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error('[perfil.changePassword]', err)
    res.status(500).json({ message: 'Error al cambiar contraseña' })
  }
}
