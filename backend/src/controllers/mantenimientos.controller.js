import pool from '../config/db.js'

// Valores permitidos por la columna ENUM de la BD (mantenimientos.tipo)
const TIPOS = ['preventivo', 'correctivo', 'predictivo']

// Fecha real en formato AAAA-MM-DD (rechaza "2026-13-45" y "2026-02-30")
const fechaValida = (f) => {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false
  const d = new Date(`${f}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f
}

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
  // Restricciones de la BD llevadas a reglas del servicio: sin ellas, MySQL en modo
  // estricto rechaza el INSERT y el API respondía 500 en vez de 400.
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ message: 'Tipo de mantenimiento no válido' })
  }
    if (!fechaValida(fecha)) {
    return res.status(400).json({ message: 'Fecha no válida (use AAAA-MM-DD)' })
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
    // La máquina no existe: viola la llave foránea fk_mantenimiento_maquina
    if (err.code === 'ER_NO_REFERENCED_ROW_2' && err.sqlMessage?.includes('fk_mantenimiento_maquina')) {
      return res.status(404).json({ message: 'La máquina no existe' })
    }
    console.error('[mantenimientos.create]', err)
    res.status(500).json({ message: 'Error al registrar mantenimiento' })
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