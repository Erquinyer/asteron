import pool from '../config/db.js'

const BASE = `
  SELECT c.*,
         GROUP_CONCAT(IF(cc.tipo IN ('telefono','celular'), cc.valor, NULL) SEPARATOR ', ') AS telefonos,
         GROUP_CONCAT(IF(cc.tipo='correo', cc.valor, NULL) SEPARATOR ', ')                  AS correos,
         COUNT(DISTINCT p.id_pedido)     AS total_pedidos,
         COUNT(DISTINCT d.id_direccion)  AS total_direcciones,
         (SELECT direccion FROM direcciones_cliente
          WHERE id_cliente = c.id_cliente ORDER BY principal DESC, id_direccion LIMIT 1) AS direccion_principal
  FROM clientes c
  LEFT JOIN contactos_cliente cc ON cc.id_cliente = c.id_cliente
  LEFT JOIN direcciones_cliente d ON d.id_cliente = c.id_cliente
  LEFT JOIN pedidos p ON p.id_cliente = c.id_cliente`

// Reemplaza por completo las direcciones de un cliente (el formulario edita
// la lista entera cada vez, igual que los ítems de un pedido).
const guardarDirecciones = async (id_cliente, direcciones) => {
  await pool.query('DELETE FROM direcciones_cliente WHERE id_cliente = ?', [id_cliente])
  const filas = (direcciones || []).filter(d => d?.direccion?.trim())
  if (filas.length === 0) return
  const values = filas.map((d, i) => [
    id_cliente, d.etiqueta || `Dirección ${i + 1}`, d.direccion.trim(), d.principal ? 1 : (i === 0 ? 1 : 0),
  ])
  await pool.query(
    'INSERT INTO direcciones_cliente (id_cliente, etiqueta, direccion, principal) VALUES ?', [values])
}

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

    const [direcciones] = await pool.query(
      `SELECT id_direccion, etiqueta, direccion, principal FROM direcciones_cliente
       WHERE id_cliente = ? ORDER BY principal DESC, id_direccion`, [req.params.id])

    const [pedidos] = await pool.query(
      `SELECT p.id_pedido, p.estado, p.fecha_pedido, p.descripcion,
              COUNT(dp.id_detalle) AS items
       FROM pedidos p
       LEFT JOIN detalle_pedido dp ON dp.id_pedido = p.id_pedido
       WHERE p.id_cliente = ?
       GROUP BY p.id_pedido ORDER BY p.fecha_pedido DESC`, [req.params.id])

    res.json({ ...rows[0], direcciones, pedidos })
  } catch (err) {
    console.error('[clientes.getOne]', err)
    res.status(500).json({ message: 'Error al obtener cliente' })
  }
}

export const create = async (req, res) => {
  const { nombre, nit, codigo_cliente, direcciones } = req.body
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
  try {
    const [result] = await pool.query(
      `INSERT INTO clientes (nombre, nit, codigo_cliente) VALUES (?,?,?)`,
      [nombre, nit || null, codigo_cliente || null])
    await guardarDirecciones(result.insertId, direcciones)
    const [rows] = await pool.query(`${BASE} WHERE c.id_cliente = ? GROUP BY c.id_cliente`, [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'El código de cliente ya existe' })
    console.error('[clientes.create]', err)
    res.status(500).json({ message: 'Error al crear cliente' })
  }
}

export const update = async (req, res) => {
  const { nombre, nit, codigo_cliente, direcciones } = req.body
  try {
    const [result] = await pool.query(
      `UPDATE clientes SET nombre=?, nit=?, codigo_cliente=? WHERE id_cliente=?`,
      [nombre, nit || null, codigo_cliente || null, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
    if (direcciones !== undefined) await guardarDirecciones(req.params.id, direcciones)
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
