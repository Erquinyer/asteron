import pool from '../config/db.js'

export const getByMaquina = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      WHERE mt.id_maquina = ?
      ORDER BY mt.fecha DESC`, [req.params.id])
    res.json(rows)
  } catch (err) {
    console.error('[mantenimientos.getByMaquina]', err)
    res.status(500).json({ message: 'Error al obtener mantenimientos' })
  }
}

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      ORDER BY mt.fecha DESC
      LIMIT 100`)
    res.json(rows)
  } catch (err) {
    console.error('[mantenimientos.getAll]', err)
    res.status(500).json({ message: 'Error al obtener mantenimientos' })
  }
}

export const create = async (req, res) => {
  const { id_maquina, fecha, tipo, descripcion } = req.body
  if (!id_maquina || !fecha || !tipo) {
    return res.status(400).json({ message: 'Máquina, fecha y tipo son requeridos' })
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO mantenimientos (id_maquina, fecha, tipo, descripcion, realizado_por)
       VALUES (?,?,?,?,?)`,
      [id_maquina, fecha, tipo, descripcion || null, req.user.id])

    const [[row]] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      WHERE mt.id_mantenimiento = ?`, [result.insertId])

    // Actualizar estado de la máquina si es correctivo
    if (tipo === 'correctivo') {
      await pool.query(
        `UPDATE maquinaria SET estado = 'en_mantenimiento' WHERE id_maquina = ?`, [id_maquina])
    }

    res.status(201).json(row)
  } catch (err) {
    console.error('[mantenimientos.create]', err)
    res.status(500).json({ message: 'Error al registrar mantenimiento' })
  }
}

export const update = async (req, res) => {
  const { fecha, tipo, descripcion } = req.body
  try {
    const [result] = await pool.query(
      `UPDATE mantenimientos SET fecha = ?, tipo = ?, descripcion = ? WHERE id_mantenimiento = ?`,
      [fecha, tipo, descripcion || null, req.params.id])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Registro no encontrado' })
    }

    const [[row]] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      WHERE mt.id_mantenimiento = ?`, [req.params.id])

    res.json(row)
  } catch (err) {
    console.error('[mantenimientos.update]', err)
    res.status(500).json({ message: 'Error al actualizar mantenimiento' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM mantenimientos WHERE id_mantenimiento = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' })
    res.json({ message: 'Mantenimiento eliminado' })
  } catch (err) {
    console.error('[mantenimientos.remove]', err)
    res.status(500).json({ message: 'Error al eliminar' })
  }
}