import pool from '../config/db.js'
import { resolveUsuarioPorRol } from '../utils/resolveUsuarioPorRol.js'
import { esFechaPasada, fechaColumnaISO } from '../utils/dates.js'

const validarFechas = (fecha_inicio, fecha_fin_estimada) => {
  if (esFechaPasada(fecha_inicio)) {
    return 'La fecha de inicio no puede ser anterior a hoy'
  }
  if (fecha_inicio && fecha_fin_estimada && fecha_fin_estimada < fecha_inicio) {
    return 'La fecha de entrega estimada no puede ser anterior a la fecha de inicio'
  }
  return null
}

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
             dp.producto AS item_producto, dp.fecha_entrega_estimada AS item_fecha_entrega,
             ua.nombre AS usuario_asignado_nombre,
             (SELECT COUNT(*) FROM programacion_planta pp
              WHERE pp.id_fase_proyecto = fp.id_fase_proyecto AND pp.estado != 'cancelado') AS turnos_vinculados
      FROM fases_proyecto fp
      JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      LEFT JOIN usuarios ua        ON fp.id_usuario_asignado = ua.id_usuario
      WHERE fp.id_proyecto = ?
      ORDER BY fe.orden, dp.id_detalle`, [req.params.id])

    res.json({ ...rows[0], fases })
  } catch (err) {
    console.error('[proyectos.getOne]', err)
    res.status(500).json({ message: 'Error al obtener proyecto' })
  }
}

export const create = async (req, res) => {
  const { nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable } = req.body
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
  const errorFechas = validarFechas(fecha_inicio, fecha_fin_estimada)
  if (errorFechas) return res.status(400).json({ message: errorFechas })

  try {
    // Un pedido solo puede tener un proyecto asociado — evita duplicar el
    // proyecto (y sus fases por ítem) a partir de un pedido ya vinculado.
    if (id_pedido) {
      const [[existente]] = await pool.query(
        'SELECT id_proyecto, nombre FROM proyectos WHERE id_pedido = ? LIMIT 1', [id_pedido])
      if (existente) {
        return res.status(409).json({
          message: `El pedido #${id_pedido} ya está asociado al proyecto "${existente.nombre}"`,
        })
      }
    }

    const [result] = await pool.query(`
      INSERT INTO proyectos (nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable, created_by)
      VALUES (?,?,?,?,?,?,?,?)`,
      [nombre, objetivo || null, prioridad || 'media', fecha_inicio || null,
       fecha_fin_estimada || null, id_pedido || null, id_usuario_responsable || null, req.user.id])
    const id_proyecto = result.insertId

    // El pedido pasa a 'en_proceso' automáticamente al quedar asociado a un
    // proyecto — el estado del pedido no se edita manualmente (ver pedidos.controller.js).
    if (id_pedido) {
      await pool.query(
        `UPDATE pedidos SET estado='en_proceso' WHERE id_pedido=? AND estado='pendiente'`,
        [id_pedido])
    }

    // Fases estándar: orden 1 (Diseño, render e ingeniería) y orden 2 (Compra de
    // materiales) son fases únicas del proyecto, asignadas automáticamente por rol.
    // De la fase 3 en adelante ("Corte" → "Despacho"), se crea una copia por cada
    // ítem del pedido para poder llevar avance y fecha de entrega independientes;
    // si el proyecto no tiene pedido o el pedido no tiene ítems, se crea una sola
    // fila sin ítem asociado (comportamiento anterior, sin cambios).
    const [fasesEstandar] = await pool.query(
      'SELECT id_fase_estandar, orden FROM fases_estandar ORDER BY orden')

    let items = []
    if (id_pedido) {
      const [rows] = await pool.query(
        'SELECT id_detalle FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [id_pedido])
      items = rows
    }

    const [idDisenador, idCompras] = await Promise.all([
      resolveUsuarioPorRol(pool, 'Gerente General'),
      resolveUsuarioPorRol(pool, 'Coordinador de Producción'),
    ])

    const values = []
    for (const fase of fasesEstandar) {
      if (fase.orden === 1) {
        values.push([id_proyecto, fase.id_fase_estandar, null, idDisenador, 'pendiente', 0])
      } else if (fase.orden === 2) {
        values.push([id_proyecto, fase.id_fase_estandar, null, idCompras, 'pendiente', 0])
      } else if (items.length > 0) {
        for (const item of items) {
          values.push([id_proyecto, fase.id_fase_estandar, item.id_detalle, null, 'pendiente', 0])
        }
      } else {
        values.push([id_proyecto, fase.id_fase_estandar, null, null, 'pendiente', 0])
      }
    }
    if (values.length > 0) {
      await pool.query(
        `INSERT INTO fases_proyecto
         (id_proyecto, id_fase_estandar, id_detalle_pedido, id_usuario_asignado, estado, porcentaje_avance)
         VALUES ?`, [values])
    }

    const [rows] = await pool.query(`${BASE_QUERY} HAVING p.id_proyecto = ?`, [id_proyecto])
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese pedido ya está asociado a otro proyecto' })
    }
    console.error('[proyectos.create]', err)
    res.status(500).json({ message: 'Error al crear proyecto' })
  }
}

export const update = async (req, res) => {
  const { nombre, objetivo, prioridad, fecha_inicio, fecha_fin_estimada, id_pedido, id_usuario_responsable } = req.body
  try {
    // "No puede ser pasada" solo se exige si la fecha de inicio realmente
    // cambió: no debe bloquear la edición de un proyecto ya en curso cuyo
    // inicio quedó, legítimamente, en el pasado. fin >= inicio sí se valida siempre.
    const [[actual]] = await pool.query(
      'SELECT fecha_inicio FROM proyectos WHERE id_proyecto = ?', [req.params.id])
    if (!actual) return res.status(404).json({ message: 'Proyecto no encontrado' })
    const fechaInicioCambio = fechaColumnaISO(actual.fecha_inicio) !== (fecha_inicio || null)
    if (fechaInicioCambio && esFechaPasada(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha de inicio no puede ser anterior a hoy' })
    }
    if (fecha_inicio && fecha_fin_estimada && fecha_fin_estimada < fecha_inicio) {
      return res.status(400).json({ message: 'La fecha de entrega estimada no puede ser anterior a la fecha de inicio' })
    }

    if (id_pedido) {
      const [[existente]] = await pool.query(
        'SELECT id_proyecto, nombre FROM proyectos WHERE id_pedido = ? AND id_proyecto <> ? LIMIT 1',
        [id_pedido, req.params.id])
      if (existente) {
        return res.status(409).json({
          message: `El pedido #${id_pedido} ya está asociado al proyecto "${existente.nombre}"`,
        })
      }
    }

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
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ese pedido ya está asociado a otro proyecto' })
    }
    console.error('[proyectos.update]', err)
    res.status(500).json({ message: 'Error al actualizar proyecto' })
  }
}

export const updateFase = async (req, res) => {
  const { estado, porcentaje_avance } = req.body
  try {
    const [[fase]] = await pool.query(
      `SELECT id_usuario_asignado FROM fases_proyecto WHERE id_fase_proyecto = ? AND id_proyecto = ?`,
      [req.params.faseId, req.params.id])
    if (!fase) return res.status(404).json({ message: 'Fase no encontrada' })

    // Fases únicas (Diseño, Compra) solo las gestiona la persona asignada o el admin
    if (fase.id_usuario_asignado && fase.id_usuario_asignado !== req.user.id
      && req.user.rol !== 'Administrador Sistema') {
      return res.status(403).json({ message: 'Solo la persona asignada a esta fase puede actualizarla' })
    }

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
    // Flujo correcto: eliminar primero las actividades de Programación
    // asociadas (o su fase) y solo entonces el proyecto queda libre para borrarse.
    const [[{ total_actividades }]] = await pool.query(
      `SELECT COUNT(*) AS total_actividades FROM programacion_planta pp
       WHERE pp.id_proyecto = ?
          OR pp.id_fase_proyecto IN (SELECT id_fase_proyecto FROM fases_proyecto WHERE id_proyecto = ?)`,
      [req.params.id, req.params.id])
    if (total_actividades > 0) {
      return res.status(409).json({
        message: `No se puede eliminar: el proyecto tiene ${total_actividades} actividad${total_actividades !== 1 ? 'es' : ''} de Programación asociada${total_actividades !== 1 ? 's' : ''}. Elimínalas primero desde Programación de planta.`,
      })
    }

    const [result] = await pool.query('DELETE FROM proyectos WHERE id_proyecto=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Proyecto no encontrado' })
    res.json({ message: 'Proyecto eliminado' })
  } catch (err) {
    console.error('[proyectos.remove]', err)
    res.status(500).json({ message: 'Error al eliminar proyecto' })
  }
}
