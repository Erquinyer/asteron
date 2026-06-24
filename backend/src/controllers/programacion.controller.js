import pool from '../config/db.js'

export const getAll = async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0]
  try {
    const [rows] = await pool.query(`
      SELECT pp.*,
             u.nombre  AS operario,
             m.nombre  AS maquina,  m.codigo AS maquina_codigo,
             pr.nombre AS proyecto
      FROM programacion_planta pp
      LEFT JOIN usuarios   u  ON pp.id_operario = u.id_usuario
      LEFT JOIN maquinaria m  ON pp.id_maquina  = m.id_maquina
      LEFT JOIN proyectos  pr ON pp.id_proyecto = pr.id_proyecto
      WHERE pp.fecha = ?
      ORDER BY FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`, [fecha])
    res.json(rows)
  } catch (err) {
    console.error('[programacion.getAll]', err)
    res.status(500).json({ message: 'Error al obtener programación' })
  }
}

export const create = async (req, res) => {
  const { fecha, id_operario, id_maquina, id_proyecto, tiempo_estimado, observaciones } = req.body
  if (!fecha || !id_operario || !id_maquina) {
    return res.status(400).json({ message: 'Fecha, operario y máquina son requeridos' })
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO programacion_planta (fecha, id_operario, id_maquina, id_proyecto, tiempo_estimado, estado, observaciones)
       VALUES (?,?,?,?,?,?,?)`,
      [fecha, id_operario, id_maquina, id_proyecto || null,
       tiempo_estimado || 480, 'programado', observaciones || null])
    const [[row]] = await pool.query(`
      SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, pr.nombre AS proyecto
      FROM programacion_planta pp
      LEFT JOIN usuarios   u  ON pp.id_operario = u.id_usuario
      LEFT JOIN maquinaria m  ON pp.id_maquina  = m.id_maquina
      LEFT JOIN proyectos  pr ON pp.id_proyecto = pr.id_proyecto
      WHERE pp.id_programacion = ?`, [result.insertId])
    res.status(201).json(row)
  } catch (err) {
    console.error('[programacion.create]', err)
    res.status(500).json({ message: 'Error al crear programación' })
  }
}

export const updateEstado = async (req, res) => {
  const { estado, tiempo_real } = req.body
  try {
    await pool.query(
      `UPDATE programacion_planta SET estado=?, tiempo_real=? WHERE id_programacion=?`,
      [estado, tiempo_real || null, req.params.id])
    res.json({ message: 'Estado actualizado' })
  } catch (err) {
    console.error('[programacion.updateEstado]', err)
    res.status(500).json({ message: 'Error al actualizar estado' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM programacion_planta WHERE id_programacion=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' })
    res.json({ message: 'Registro eliminado' })
  } catch (err) {
    console.error('[programacion.remove]', err)
    res.status(500).json({ message: 'Error al eliminar' })
  }
}
