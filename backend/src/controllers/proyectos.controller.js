import pool from '../config/db.js'

const BASE_QUERY = `
  SELECT p.id_proyecto, p.nombre, p.objetivo, p.prioridad,
         p.fecha_inicio, p.fecha_fin_estimada, p.created_at,
         u.nombre  AS responsable, u.id_usuario AS id_responsable,
         c.nombre  AS cliente,
         pe.id_pedido,
         COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance,
         COUNT(fp.id_fase_proyecto) AS total_fases
  FROM proyectos p
  LEFT JOIN usuarios       u  ON p.id_usuario_responsable = u.id_usuario
  LEFT JOIN pedidos        pe ON p.id_pedido = pe.id_pedido
  LEFT JOIN clientes       c  ON pe.id_cliente = c.id_cliente
  LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
  GROUP BY p.id_proyecto, p.nombre, p.objetivo, p.prioridad,
           p.fecha_inicio, p.fecha_fin_estimada, p.created_at,
           u.nombre, u.id_usuario, c.nombre, pe.id_pedido`

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`${BASE_QUERY} ORDER BY p.created_at DESC`)
    res.json(rows)
  } catch (err) {
    console.error('[proyectos.getAll]', err)
    res.status(500).json({ message: 'Error al obtener proyectos' })
  }
}

export const getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`${BASE_QUERY} HAVING p.id_proyecto = ?`, [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Proyecto no encontrado' })

    const [fases] = await pool.query(`
      SELECT fp.*, fe.nombre AS fase_nombre, fe.orden,
             (SELECT COUNT(*) FROM programacion_planta pp
              WHERE pp.id_fase_proyecto = fp.id_fase_proyecto AND pp.estado != 'cancelado') AS turnos_vinculados
      FROM fases_proyecto fp
      JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      WHERE fp.id_proyecto = ?
      ORDER BY fe.orden`, [req.params.id])

    res.json({ ...rows[0], fases })
  } catch (err) {
    console.error('[proyectos.getOne]', err)
    res.status(500).json({ message: 'Error al obtener proyecto' })
  }
}

export const create = async (req, res) => {
  const { nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable } = req.body
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })

  try {
    const [result] = await pool.query(`
      INSERT INTO proyectos (nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable, created_by)
      VALUES (?,?,?,?,?,?,?,?)`,
      [nombre, objetivo || null, prioridad || 'media', fecha_inicio || null,
       fecha_fin_estimada || null, id_pedido || null, id_usuario_responsable || null, req.user.id])

    // Aplicar automáticamente todas las fases estándar al nuevo proyecto
    const [fases] = await pool.query(
      'SELECT id_fase_estandar FROM fases_estandar ORDER BY orden')
    if (fases.length > 0) {
      const values = fases.map(f => [result.insertId, f.id_fase_estandar, 'pendiente', 0])
      await pool.query(
        'INSERT INTO fases_proyecto (id_proyecto, id_fase_estandar, estado, porcentaje_avance) VALUES ?',
        [values])
    }

    const [rows] = await pool.query(`${BASE_QUERY} HAVING p.id_proyecto = ?`, [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[proyectos.create]', err)
    res.status(500).json({ message: 'Error al crear proyecto' })
  }
}

export const update = async (req, res) => {
  const { nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable } = req.body
  try {
    const [result] = await pool.query(`
      UPDATE proyectos SET nombre=?, objetivo=?, prioridad=?, fecha_inicio=?,
        fecha_fin_estimada=?, id_pedido=?, id_usuario_responsable=?, updated_at=NOW()
      WHERE id_proyecto=?`,
      [nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada,
       id_pedido || null, id_usuario_responsable || null, req.params.id])

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Proyecto no encontrado' })
    const [rows] = await pool.query(`${BASE_QUERY} HAVING p.id_proyecto = ?`, [req.params.id])
    res.json(rows[0])
  } catch (err) {
    console.error('[proyectos.update]', err)
    res.status(500).json({ message: 'Error al actualizar proyecto' })
  }
}

export const updateFase = async (req, res) => {
  const { estado, porcentaje_avance } = req.body
  try {
    const [[{ turnos_vinculados }]] = await pool.query(
      `SELECT COUNT(*) AS turnos_vinculados FROM programacion_planta
       WHERE id_fase_proyecto = ? AND estado != 'cancelado'`,
      [req.params.faseId])
    if (turnos_vinculados > 0) {
      return res.status(409).json({
        message: 'Esta fase se actualiza automáticamente desde Programación de planta',
      })
    }

    await pool.query(
      `UPDATE fases_proyecto SET estado=?, porcentaje_avance=? WHERE id_fase_proyecto=? AND id_proyecto=?`,
      [estado, porcentaje_avance ?? 0, req.params.faseId, req.params.id])
    res.json({ message: 'Fase actualizada' })
  } catch (err) {
    console.error('[proyectos.updateFase]', err)
    res.status(500).json({ message: 'Error al actualizar fase' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM proyectos WHERE id_proyecto=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Proyecto no encontrado' })
    res.json({ message: 'Proyecto eliminado' })
  } catch (err) {
    console.error('[proyectos.remove]', err)
    res.status(500).json({ message: 'Error al eliminar proyecto' })
  }
}
