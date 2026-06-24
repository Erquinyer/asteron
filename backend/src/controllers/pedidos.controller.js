import pool from '../config/db.js'

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

export const create = async (req, res) => {
  const { id_cliente, descripcion, estado, items = [] } = req.body
  if (!id_cliente) return res.status(400).json({ message: 'El cliente es requerido' })
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [result] = await conn.query(
      `INSERT INTO pedidos (id_cliente, fecha_pedido, estado, descripcion) VALUES (?, CURDATE(), ?, ?)`,
      [id_cliente, estado || 'pendiente', descripcion || null])
    const id = result.insertId
    for (const item of items) {
      if (item.producto?.trim()) {
        await conn.query(
          `INSERT INTO detalle_pedido (id_pedido, producto, cantidad, punto_descargue, estado) VALUES (?,?,?,?,?)`,
          [id, item.producto, item.cantidad || 1, item.punto_descargue || null, item.estado || 'pendiente'])
      }
    }
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
  const { id_cliente, descripcion, estado } = req.body
  try {
    const [result] = await pool.query(
      `UPDATE pedidos SET id_cliente=?, descripcion=?, estado=? WHERE id_pedido=?`,
      [id_cliente, descripcion || null, estado, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido no encontrado' })
    const [[pedido]] = await pool.query(`${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [req.params.id])
    res.json(pedido)
  } catch (err) {
    console.error('[pedidos.update]', err)
    res.status(500).json({ message: 'Error al actualizar pedido' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM pedidos WHERE id_pedido=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Pedido no encontrado' })
    res.json({ message: 'Pedido eliminado' })
  } catch (err) {
    console.error('[pedidos.remove]', err)
    res.status(500).json({ message: 'Error al eliminar pedido' })
  }
}
