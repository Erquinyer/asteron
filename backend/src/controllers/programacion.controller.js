import pool from '../config/db.js'
import { esFechaPasada } from '../utils/dates.js'

// Recalcula estado + porcentaje_avance de una fase a partir de sus turnos vinculados
// (no cancelados). Se llama después de cualquier cambio en programacion_planta que
// toque una fase: crear, iniciar, ajustar avance, completar, cancelar o eliminar.
export const recomputeFase = async (id_fase_proyecto) => {
  if (!id_fase_proyecto) return

  const [turnos] = await pool.query(
    `SELECT estado, porcentaje_avance FROM programacion_planta
     WHERE id_fase_proyecto = ? AND estado != 'cancelado'`,
    [id_fase_proyecto])

  // Sin turnos activos vinculados: la fase queda bajo control manual (ProyectoDetalle)
  if (turnos.length === 0) return

  const avance = Math.round(
    turnos.reduce((sum, t) => sum + t.porcentaje_avance, 0) / turnos.length)
  const estado = turnos.every(t => t.estado === 'completado') ? 'completada'
    : turnos.every(t => t.estado === 'programado') ? 'pendiente'
    : 'en_curso'

  const [[fase]] = await pool.query(
    'SELECT estado, porcentaje_avance FROM fases_proyecto WHERE id_fase_proyecto = ?',
    [id_fase_proyecto])
  if (!fase || (fase.estado === estado && fase.porcentaje_avance === avance)) return

  await pool.query(
    'UPDATE fases_proyecto SET estado=?, porcentaje_avance=? WHERE id_fase_proyecto=?',
    [estado, avance, id_fase_proyecto])

  await pool.query(
    `INSERT INTO historial_fases (id_fase_proyecto, estado_anterior, estado_nuevo, porcentaje, observacion)
     VALUES (?,?,?,?,?)`,
    [id_fase_proyecto, fase.estado, estado, avance, 'Actualizado automáticamente desde Programación de planta'])
}

// Operarios y máquinas no disponibles para una actividad nueva: los que tienen
// una actividad en_proceso ahora mismo (bloqueo en tiempo real, sin importar la
// fecha) más, si se indica ?fecha=, los que ya tienen un turno programado o en
// proceso ese mismo día (evita doble-reserva en fechas futuras).
export const getOcupados = async (req, res) => {
  const { fecha } = req.query
  try {
    const [rows] = await pool.query(
      fecha
        ? `SELECT id_operario, id_maquina FROM programacion_planta
           WHERE estado = 'en_proceso'
              OR (fecha = ? AND estado IN ('programado','en_proceso'))`
        : `SELECT id_operario, id_maquina FROM programacion_planta WHERE estado = 'en_proceso'`,
      fecha ? [fecha] : [])
    res.json({
      operarios: [...new Set(rows.map(r => r.id_operario).filter(Boolean))],
      maquinas:  [...new Set(rows.map(r => r.id_maquina).filter(Boolean))],
    })
  } catch (err) {
    console.error('[programacion.getOcupados]', err)
    res.status(500).json({ message: 'Error al obtener disponibilidad' })
  }
}

export const getAll = async (req, res) => {
  // Rango de fechas: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (vista semana / mes) o
  // ?fecha=YYYY-MM-DD (vista día, comportamiento por defecto).
  const hoy = new Date().toISOString().split('T')[0]
  const desde = req.query.desde || req.query.fecha || hoy
  const hasta = req.query.hasta || req.query.fecha || desde
  try {
    const [rows] = await pool.query(`
      SELECT pp.*,
             u.nombre  AS operario,
             m.nombre  AS maquina,  m.codigo AS maquina_codigo,
             pr.nombre AS proyecto,
             cl.nombre AS cliente,
             fe.nombre AS fase_nombre,
             dp.producto AS item_producto
      FROM programacion_planta pp
      LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
      LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
      LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
      LEFT JOIN pedidos        pe ON pr.id_pedido        = pe.id_pedido
      LEFT JOIN clientes       cl ON pe.id_cliente       = cl.id_cliente
      LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
      LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      WHERE pp.fecha BETWEEN ? AND ?
      ORDER BY pp.fecha,
               FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`,
      [desde, hasta])
    res.json(rows)
  } catch (err) {
    console.error('[programacion.getAll]', err)
    res.status(500).json({ message: 'Error al obtener programación' })
  }
}

// GET /fase/:idFase — actividades (turnos) vinculadas a una fase concreta de un
// proyecto. Se usa en ProyectoDetalle para ver el detalle sin salir del módulo.
export const getByFase = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pp.id_programacion, pp.fecha, pp.estado, pp.porcentaje_avance,
             pp.tiempo_estimado, pp.tiempo_real, pp.observaciones,
             u.nombre AS operario,
             m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM programacion_planta pp
      LEFT JOIN usuarios   u ON pp.id_operario = u.id_usuario
      LEFT JOIN maquinaria m ON pp.id_maquina  = m.id_maquina
      WHERE pp.id_fase_proyecto = ?
      ORDER BY pp.fecha DESC,
               FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`,
      [req.params.idFase])
    res.json(rows)
  } catch (err) {
    console.error('[programacion.getByFase]', err)
    res.status(500).json({ message: 'Error al obtener actividades de la fase' })
  }
}

export const create = async (req, res) => {
  const { fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, observaciones } = req.body
  if (!fecha || !id_operario || !id_maquina) {
    return res.status(400).json({ message: 'Fecha, operario y máquina son requeridos' })
  }
  if (esFechaPasada(fecha)) {
    return res.status(400).json({ message: 'No se puede programar una actividad en una fecha pasada' })
  }
  try {
    const [[operarioOcupado]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_operario=? AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_operario, fecha])
    if (operarioOcupado) {
      return res.status(409).json({ message: 'El operario ya tiene una actividad asignada ese día' })
    }

    const [[maquinaOcupada]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_maquina=? AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_maquina, fecha])
    if (maquinaOcupada) {
      return res.status(409).json({ message: 'La máquina ya está reservada ese día en otra actividad' })
    }

    // No se pueden programar actividades sobre una fase ya completada.
    if (id_fase_proyecto) {
      const [[fase]] = await pool.query(
        'SELECT estado FROM fases_proyecto WHERE id_fase_proyecto = ?', [id_fase_proyecto])
      if (!fase) {
        return res.status(404).json({ message: 'La fase indicada no existe' })
      }
      if (fase.estado === 'completada') {
        return res.status(409).json({ message: 'Esa fase ya está completada; no admite nuevas actividades' })
      }
    }

    const [result] = await pool.query(
      `INSERT INTO programacion_planta (fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, estado, porcentaje_avance, observaciones)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [fecha, id_operario, id_maquina, id_proyecto || null,
       id_fase_proyecto || null, tiempo_estimado || 480, 'programado', 0, observaciones || null])

    if (id_fase_proyecto) await recomputeFase(id_fase_proyecto)

    const [[row]] = await pool.query(`
      SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo,
             pr.nombre AS proyecto, fe.nombre AS fase_nombre,
             dp.producto AS item_producto
      FROM programacion_planta pp
      LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
      LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
      LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
      LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
      LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      WHERE pp.id_programacion = ?`, [result.insertId])

    res.status(201).json(row)
  } catch (err) {
    console.error('[programacion.create]', err)
    res.status(500).json({ message: 'Error al crear programación' })
  }
}

// PUT /:id — edita un turno que aún no inició (fecha, operario, máquina,
// proyecto/fase, tiempo estimado, observaciones). Una vez en_proceso o
// completado, ya no se puede reprogramar: solo estado/avance.
export const update = async (req, res) => {
  const { id } = req.params
  const { fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, observaciones } = req.body
  if (!fecha || !id_operario || !id_maquina) {
    return res.status(400).json({ message: 'Fecha, operario y máquina son requeridos' })
  }
  try {
    const [[actual]] = await pool.query(
      'SELECT estado, fecha, id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [id])
    if (!actual) return res.status(404).json({ message: 'Registro no encontrado' })
    if (actual.estado !== 'programado') {
      return res.status(409).json({ message: 'Solo se puede editar una actividad que aún no ha iniciado' })
    }

    // "No puede ser pasada" solo se exige si la fecha realmente cambió: no debe
    // bloquear la edición de otros campos de un turno cuya fecha ya quedó atrás.
    const fechaCambio = actual.fecha.toISOString().slice(0, 10) !== fecha
    if (fechaCambio && esFechaPasada(fecha)) {
      return res.status(400).json({ message: 'No se puede programar una actividad en una fecha pasada' })
    }

    const [[operarioOcupado]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_operario=? AND id_programacion!=?
         AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_operario, id, fecha])
    if (operarioOcupado) {
      return res.status(409).json({ message: 'El operario ya tiene una actividad asignada ese día' })
    }

    const [[maquinaOcupada]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_maquina=? AND id_programacion!=?
         AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_maquina, id, fecha])
    if (maquinaOcupada) {
      return res.status(409).json({ message: 'La máquina ya está reservada ese día en otra actividad' })
    }

    if (id_fase_proyecto) {
      const [[fase]] = await pool.query(
        'SELECT estado FROM fases_proyecto WHERE id_fase_proyecto = ?', [id_fase_proyecto])
      if (!fase) return res.status(404).json({ message: 'La fase indicada no existe' })
      if (fase.estado === 'completada') {
        return res.status(409).json({ message: 'Esa fase ya está completada; no admite nuevas actividades' })
      }
    }

    await pool.query(
      `UPDATE programacion_planta SET fecha=?, id_operario=?, id_maquina=?, id_proyecto=?,
       id_fase_proyecto=?, tiempo_estimado=?, observaciones=? WHERE id_programacion=?`,
      [fecha, id_operario, id_maquina, id_proyecto || null,
       id_fase_proyecto || null, tiempo_estimado || 480, observaciones || null, id])

    // Recalcula ambas fases si el turno cambió de fase (o se desvinculó de una)
    if (actual.id_fase_proyecto && actual.id_fase_proyecto !== id_fase_proyecto) {
      await recomputeFase(actual.id_fase_proyecto)
    }
    if (id_fase_proyecto) await recomputeFase(id_fase_proyecto)

    const [[row]] = await pool.query(`
      SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo,
             pr.nombre AS proyecto, fe.nombre AS fase_nombre,
             dp.producto AS item_producto
      FROM programacion_planta pp
      LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
      LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
      LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
      LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
      LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      WHERE pp.id_programacion = ?`, [id])

    res.json(row)
  } catch (err) {
    console.error('[programacion.update]', err)
    res.status(500).json({ message: 'Error al actualizar programación' })
  }
}

export const updateEstado = async (req, res) => {
  const { estado, tiempo_real } = req.body
  const { id } = req.params
  try {
    const [[prog]] = await pool.query(
      'SELECT id_fase_proyecto, id_operario, id_maquina FROM programacion_planta WHERE id_programacion=?', [id])
    if (!prog) return res.status(404).json({ message: 'Registro no encontrado' })

    if (estado === 'en_proceso') {
      const [[operarioOcupado]] = await pool.query(
        `SELECT 1 FROM programacion_planta
         WHERE id_operario=? AND estado='en_proceso' AND id_programacion!=? LIMIT 1`,
        [prog.id_operario, id])
      if (operarioOcupado) {
        return res.status(409).json({ message: 'El operario ya tiene otra actividad en curso' })
      }

      const [[maquinaOcupada]] = await pool.query(
        `SELECT 1 FROM programacion_planta
         WHERE id_maquina=? AND estado='en_proceso' AND id_programacion!=? LIMIT 1`,
        [prog.id_maquina, id])
      if (maquinaOcupada) {
        return res.status(409).json({ message: 'La máquina ya está en uso en otra actividad' })
      }
    }

    const porcentaje_avance = estado === 'completado' ? 100 : undefined
    await pool.query(
      porcentaje_avance !== undefined
        ? `UPDATE programacion_planta SET estado=?, tiempo_real=?, porcentaje_avance=? WHERE id_programacion=?`
        : `UPDATE programacion_planta SET estado=?, tiempo_real=? WHERE id_programacion=?`,
      porcentaje_avance !== undefined
        ? [estado, tiempo_real || null, porcentaje_avance, id]
        : [estado, tiempo_real || null, id])

    if (prog.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Estado actualizado' })
  } catch (err) {
    console.error('[programacion.updateEstado]', err)
    res.status(500).json({ message: 'Error al actualizar estado' })
  }
}

// PATCH /:id/avance — solo mientras el turno está en_proceso; 100% se reserva para "Completar"
export const updateAvance = async (req, res) => {
  const { id } = req.params
  const porcentaje_avance = Math.max(0, Math.min(99, Number(req.body.porcentaje_avance) || 0))

  try {
    const [[prog]] = await pool.query(
      'SELECT estado, id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [id])
    if (!prog) return res.status(404).json({ message: 'Registro no encontrado' })
    if (prog.estado !== 'en_proceso') {
      return res.status(400).json({ message: 'Solo se puede ajustar el avance de una actividad en proceso' })
    }

    await pool.query(
      'UPDATE programacion_planta SET porcentaje_avance=? WHERE id_programacion=?',
      [porcentaje_avance, id])

    if (prog.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Avance actualizado', porcentaje_avance })
  } catch (err) {
    console.error('[programacion.updateAvance]', err)
    res.status(500).json({ message: 'Error al actualizar avance' })
  }
}

export const remove = async (req, res) => {
  try {
    const [[prog]] = await pool.query(
      'SELECT id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [req.params.id])

    const [result] = await pool.query(
      'DELETE FROM programacion_planta WHERE id_programacion=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' })

    if (prog?.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Registro eliminado' })
  } catch (err) {
    console.error('[programacion.remove]', err)
    res.status(500).json({ message: 'Error al eliminar' })
  }
}
