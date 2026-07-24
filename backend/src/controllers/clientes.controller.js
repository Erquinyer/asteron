import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

const BASE = `
  SELECT c.*,
         GROUP_CONCAT(IF(cc.tipo IN ('telefono','celular'), cc.valor, NULL) SEPARATOR ', ') AS telefonos,
         GROUP_CONCAT(IF(cc.tipo='correo', cc.valor, NULL) SEPARATOR ', ')                  AS correos,
         COUNT(DISTINCT p.id_pedido) AS total_pedidos
  FROM clientes c
  LEFT JOIN contactos_cliente cc ON cc.id_cliente = c.id_cliente
  LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente`

export const getAll = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`${BASE} GROUP BY c.id_cliente ORDER BY c.nombre`)
  ok(res, rows, 'Clientes obtenidos correctamente')
})

export const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [req.params.id])
  if (!rows[0]) return fail(res, 'Cliente no encontrado', 404)

  const [pedidos] = await pool.query(
    `SELECT p.id_pedido, p.estado, p.fecha_pedido, p.descripcion,
            COUNT(dp.id_detalle) AS items
     FROM pedidos p
     LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
     WHERE p.id_cliente = ?
     GROUP BY p.id_pedido ORDER BY p.fecha_pedido DESC`, [req.params.id])

  ok(res, { ...rows[0], pedidos }, 'Cliente obtenido correctamente')
})

// req.body ya viene validado por clienteCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { nombre, nit, codigo_cliente, direccion } = req.body
  const [result] = await pool.query(
    `INSERT INTO clientes (nombre, nit, codigo_cliente, direccion) VALUES (?,?,?,?)`,
    [nombre, nit || null, codigo_cliente || null, direccion || null])
  const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [result.insertId])
  ok(res, rows[0], 'Cliente creado correctamente', 201)
})

// req.body ya viene validado por clienteUpdateSchema
export const update = asyncHandler(async (req, res) => {
  const { nombre, nit, codigo_cliente, direccion } = req.body
  const [result] = await pool.query(
    `UPDATE clientes SET nombre=?, nit=?, codigo_cliente=?, direccion=? WHERE id_cliente=?`,
    [nombre, nit || null, codigo_cliente || null, direccion || null, req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Cliente no encontrado', 404)
  const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [req.params.id])
  ok(res, rows[0], 'Cliente actualizado correctamente')
})

export const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM clientes WHERE id_cliente=?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Cliente no encontrado', 404)
  ok(res, null, 'Cliente eliminado correctamente')
})
