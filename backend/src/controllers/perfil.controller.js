import pool   from '../config/db.js'
import bcrypt  from 'bcryptjs'
import { POLITICA_DATOS_VERSION } from '../utils/politicaDatos.js'

export const getPerfil = async (req, res) => {
  try {
    const [[user]] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.correo, u.estado, u.ultimo_login, u.created_at,
              u.politica_datos_version, u.politica_datos_aceptada_en,
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
    // 400 y no 401: el 401 significa "sesión inválida" y el frontend cierra la sesión
    // al recibirlo, así que equivocarse de contraseña actual sacaba a la persona del sistema.
    if (!ok) return res.status(400).json({ message: 'La contraseña actual es incorrecta' })

    const hash = await bcrypt.hash(nueva, 10)
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [hash, req.user.id])
    res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error('[perfil.changePassword]', err)
    res.status(500).json({ message: 'Error al cambiar contraseña' })
  }
}

// Autorización del tratamiento de datos personales (Ley 1581 de 2012).
// La fecha y la versión quedan guardadas como prueba de la autorización (Decreto 1377 de 2013).
export const aceptarPoliticaDatos = async (req, res) => {
  try {
    const aceptadaEn = new Date()
    await pool.query(
      'UPDATE usuarios SET politica_datos_version = ?, politica_datos_aceptada_en = ? WHERE id_usuario = ?',
      [POLITICA_DATOS_VERSION, aceptadaEn, req.user.id])
    res.json({ version: POLITICA_DATOS_VERSION, aceptada_en: aceptadaEn })
  } catch (err) {
    console.error('[perfil.aceptarPoliticaDatos]', err)
    res.status(500).json({ message: 'Error al registrar la autorización' })
  }
}
