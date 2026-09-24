import pool from '../config/db.js'
import { esFechaPasada } from '../utils/dates.js'

const fechaEntregaPasada = (items = []) =>
  items.some(it => esFechaPasada(it.fecha_entrega_estimada))

const BASE = `
  SELECT p.*, c.nombre AS cliente,
         COUNT(dp.id_detalle) AS total_items
  FROM pedidos p
  LEFT JOIN clientes       c  ON p.id_cliente = c.id_cliente
  LEFT JOIN detalle_pedido dp ON dp.id_pedido  = p.id_pedido`

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`${BASE} GROUP BY p.id_pedido ORDER BY p.created_at DESC`)
    res.json(rows)
  } catch (err) {
    console.error('[pedidos.getAll]', err)
    res.status(500).json({ message: 'Error al obtener pedidos' })
  }
}

export const getOne = async (req, res) => {
  try {
    const [[pedido]] = await pool.query(
      `${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [req.params.id])
    if (!pedido) return res.status(404).json({ message: 'Pedido no encontrado' })
    const [items] = await pool.query(
      'SELECT * FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [req.params.id])
    res.json({ ...pedido, items })
  } catch (err) {
    console.error('[pedidos.getOne]', err)
    res.status(500).json({ message: 'Error al obtener pedido' })
  }
}

const insertItems = async (conn, id_pedido, items) => {
  for (const item of items) {
    if (item.producto?.trim()) {
      await conn.query(
        `INSERT INTO detalle_pedido (id_pedido, producto, cantidad, punto_descargue, estado, fecha_entrega_estimada)
         VALUES (?,?,?,?,?,?)`,
        [id_pedido, item.producto, item.cantidad || 1, item.punto_descargue || null,
         item.estado || 'pendiente', item.fecha_entrega_estimada || null])
    }
  }
}

export const create = async (req, res) => {
  const { id_cliente, descripcion, items = [] } = req.body
  if (!id_cliente) return res.status(400).json({ message: 'El cliente es requerido' })
  if (fechaEntregaPasada(items)) {
    return res.status(400).json({ message: 'La fecha de entrega estimada de un ítem no puede ser anterior a hoy' })
  }
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // El estado siempre arranca en 'pendiente': no es editable manualmente,
    // pasa a 'en_proceso' automáticamente al crear el proyecto asociado
    // (ver proyectos.controller.js create).
    const [result] = await conn.query(
      `INSERT INTO pedidos (id_cliente, fecha_pedido, estado, descripcion) VALUES (?, CURDATE(), 'pendiente', ?)`,
      [id_cliente, descripcion || null])
    const id = result.insertId
    await insertItems(conn, id, items)
    await conn.commit()
    const [[pedido]] = await pool.query(`${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [id])
    res.status(201).json(pedido)
  } catch (err) {
    await conn.rollback()
    console.error('[pedidos.create]', err)
    res.status(500).json({ message: 'Error al crear pedido' })
  } finally { conn.release() }
}

export const update = async (req, res) => {
  const { id_cliente, descripcion, items } = req.body
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    // El estado no se edita manualmente aquí: lo controla el flujo automático
    // (creación del proyecto asociado → 'en_proceso'), así que no se toca en este UPDATE.
    const [result] = await conn.query(
      `UPDATE pedidos SET id_cliente=?, descripcion=? WHERE id_pedido=?`,
      [id_cliente, descripcion || null, req.params.id])
    if (result.affectedRows === 0) {
      await conn.rollback()
      return res.status(404).json({ message: 'Pedido no encontrado' })
    }
    // items === undefined → el cliente no envió la sección de ítems, se preservan tal cual
    if (Array.isArray(items)) {
      await conn.query('DELETE FROM detalle_pedido WHERE id_pedido=?', [req.params.id])
      await insertItems(conn, req.params.id, items)
    }
    await conn.commit()
    const [[pedido]] = await pool.query(`${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [req.params.id])
    res.json(pedido)
  } catch (err) {
    await conn.rollback()
    console.error('[pedidos.update]', err)
    res.status(500).json({ message: 'Error al actualizar pedido' })
  } finally { conn.release() }
}

export const remove = async (req, res) => {
  try {
    const [[{ total_proyectos }]] = await pool.query(
      'SELECT COUNT(*) AS total_proyectos FROM proyectos WHERE id_pedido=?', [req.params.id])
    if (total_proyectos > 0) {
      return res.status(409).json({
        message: `No se puede eliminar: el pedido tiene ${total_proyectos} proyecto${total_proyectos !== 1 ? 's' : ''} asociado${total_proyectos !== 1 ? 's' : ''}. Elimina o desvincula el proyecto primero.`,
      })
    }

    const [result] = await pool.query('DELETE FROM pedidos WHERE id_pedido=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido no encontrado' })
    res.json({ message: 'Pedido eliminado' })
  } catch (err) {
    console.error('[pedidos.remove]', err)
    res.status(500).json({ message: 'Error al eliminar pedido' })
  }
}
