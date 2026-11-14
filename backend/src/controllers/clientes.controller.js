import pool from '../config/db.js'
import { responderError } from '../utils/errores.js'

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

// Traduce errores reales de MySQL a una respuesta clara para el cliente HTTP.
// Un doble de la BD (pool simulado) no distingue cuál UNIQUE KEY falló ni
// trunca datos por longitud — esto solo salió al probar contra el motor
// real (ver tests/integration/clientes.db.test.js, semana 6):
// - `clientes` tiene DOS unique keys (nit y codigo_cliente); antes de este
//   cambio, cualquier ER_DUP_ENTRY respondía siempre "el código ya existe",
//   aunque el NIT fuera el que chocó.
// - `nombre` es VARCHAR(120): un nombre más largo no viola ninguna regla de
//   la app, pero MySQL lo rechaza con ER_DATA_TOO_LONG, que caía al 500
//   genérico en vez de un 400 claro.
const mensajeErrorCliente = (err) => {
  if (err.code === 'ER_DUP_ENTRY') {
    if (err.sqlMessage?.includes('uq_cliente_nit')) return { status: 409, message: 'El NIT ya existe' }
    return { status: 409, message: 'El código de cliente ya existe' }
  }
  if (err.code === 'ER_DATA_TOO_LONG') {
    return { status: 400, message: 'Uno de los campos supera la longitud permitida' }
  }
  return null
}

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
    responderError(res, err, { contexto: 'clientes.getAll', mensaje: 'Error al obtener clientes' })
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
    responderError(res, err, { contexto: 'clientes.getOne', mensaje: 'Error al obtener cliente' })
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
    const conocido = mensajeErrorCliente(err)
    if (conocido) return res.status(conocido.status).json({ message: conocido.message })
    responderError(res, err, { contexto: 'clientes.create', mensaje: 'Error al crear cliente' })
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
    const conocido = mensajeErrorCliente(err)
    if (conocido) return res.status(conocido.status).json({ message: conocido.message })
    responderError(res, err, { contexto: 'clientes.update', mensaje: 'Error al actualizar cliente' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM clientes WHERE id_cliente=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cliente no encontrado' })
    res.json({ message: 'Cliente eliminado' })
  } catch (err) {
    responderError(res, err, { contexto: 'clientes.remove', mensaje: 'Error al eliminar cliente' })
  }
}
