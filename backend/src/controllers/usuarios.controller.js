import pool   from '../config/db.js'
import bcrypt  from 'bcryptjs'

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado, u.ultimo_login, u.created_at,
             r.id_rol, r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      ORDER BY u.codigo_empleado, u.nombre`)
    res.json(rows)
  } catch (err) {
    console.error('[usuarios.getAll]', err)
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
}

export const getRoles = async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol')
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener roles' })
  }
}

export const create = async (req, res) => {
  const { nombre, correo, password, id_rol, codigo_empleado } = req.body
  if (!nombre || !correo || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos' })
  }
  try {
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
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El correo o código ya está registrado' })
    console.error('[usuarios.create]', err)
    res.status(500).json({ message: 'Error al crear usuario' })
  }
}

export const update = async (req, res) => {
  const { nombre, correo, password, id_rol, estado, codigo_empleado } = req.body
  try {
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
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El correo o código ya está registrado' })
    console.error('[usuarios.update]', err)
    res.status(500).json({ message: 'Error al actualizar usuario' })
  }
}

export const toggleEstado = async (req, res) => {
  try {
    await pool.query(
      `UPDATE usuarios SET estado = IF(estado=1, 0, 1) WHERE id_usuario=?`, [req.params.id])
    const [[user]] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.estado, r.nombre AS rol
       FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol WHERE u.id_usuario=?`,
      [req.params.id])
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Error al cambiar estado' })
  }
}
