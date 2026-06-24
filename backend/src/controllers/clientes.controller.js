import pool from '../config/db.js'

const BASE = `
  SELECT c.*,
         GROUP_CONCAT(IF(cc.tipo IN ('telefono','celular'), cc.valor, NULL) SEPARATOR ', ') AS telefonos,
         GROUP_CONCAT(IF(cc.tipo='correo', cc.valor, NULL) SEPARATOR ', ')                  AS correos,
         COUNT(DISTINCT p.id_pedido) AS total_pedidos
  FROM clientes c
  LEFT JOIN contactos_cliente cc ON cc.id_cliente = c.id_cliente
  LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente`

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`${BASE} GROUP BY c.id_cliente ORDER BY c.nombre`)
    res.json(rows)
  } catch (err) {
    console.error('[clientes.getAll]', err)
    res.status(500).json({ message: 'Error al obtener clientes' })
  }
}

export const getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado' })

    const [pedidos] = await pool.query(
      `SELECT p.id_pedido, p.estado, p.fecha_pedido, p.descripcion,
              COUNT(dp.id_detalle) AS items
       FROM pedidos p
       LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       WHERE p.id_cliente = ?
       GROUP BY p.id_pedido ORDER BY p.fecha_pedido DESC`, [req.params.id])

    res.json({ ...rows[0], pedidos })
  } catch (err) {
    console.error('[clientes.getOne]', err)
    res.status(500).json({ message: 'Error al obtener cliente' })
  }
}

export const create = async (req, res) => {
  const { nombre, nit, codigo_cliente, direccion } = req.body
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
  try {
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, nit, codigo_cliente, direccion) VALUES (?,?,?,?)`,
      [nombre, nit || null, codigo_cliente || null, direccion || null])
    const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El código de cliente ya existe' })
    console.error('[clientes.create]', err)
    res.status(500).json({ message: 'Error al crear cliente' })
  }
}

export const update = async (req, res) => {
  const { nombre, nit, codigo_cliente, direccion } = req.body
  try {
    const [result] = await pool.query(
      `UPDATE clientes SET nombre=?, nit=?, codigo_cliente=?, direccion=? WHERE id_cliente=?`,
      [nombre, nit || null, codigo_cliente || null, direccion || null, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
    const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [req.params.id])
    res.json(rows[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El código de cliente ya existe' })
    console.error('[clientes.update]', err)
    res.status(500).json({ message: 'Error al actualizar cliente' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM clientes WHERE id_cliente=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json({ message: 'Cliente eliminado' })
  } catch (err) {
    console.error('[clientes.remove]', err)
    res.status(500).json({ message: 'Error al eliminar cliente' })
  }
}

