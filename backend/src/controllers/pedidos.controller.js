import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

const BASE = `
  SELECT p.*, c.nombre AS cliente,
         COUNT(dp.id_detalle) AS total_items
  FROM pedidos p
  LEFT JOIN clientes       c  ON p.id_cliente = c.id_cliente
  LEFT JOIN detalle_pedido dp ON dp.id_pedido  = p.id_pedido`

export const getAll = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`${BASE} GROUP BY p.id_pedido ORDER BY p.created_at DESC`)
  ok(res, rows, 'Pedidos obtenidos correctamente')
})

export const getOne = asyncHandler(async (req, res) => {
  const [[pedido]] = await pool.query(`${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [req.params.id])
  if (!pedido) return fail(res, 'Pedido no encontrado', 404)
  const [items] = await pool.query(
    'SELECT * FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [req.params.id])
  ok(res, { ...pedido, items }, 'Pedido obtenido correctamente')
})

// req.body ya viene validado por pedidoCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { id_cliente, descripcion, estado, items = [] } = req.body
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
    ok(res, pedido, 'Pedido creado correctamente', 201)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
})

// req.body ya viene validado por pedidoUpdateSchema
export const update = asyncHandler(async (req, res) => {
  const { id_cliente, descripcion, estado } = req.body
  const [result] = await pool.query(
    `UPDATE pedidos SET id_cliente=?, descripcion=?, estado=? WHERE id_pedido=?`,
    [id_cliente, descripcion || null, estado, req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Pedido no encontrado', 404)
  const [[pedido]] = await pool.query(`${BASE} WHERE p.id_pedido = ? GROUP BY p.id_pedido`, [req.params.id])
  ok(res, pedido, 'Pedido actualizado correctamente')
})

export const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM pedidos WHERE id_pedido=?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Pedido no encontrado', 404)
  ok(res, null, 'Pedido eliminado correctamente')
})
