import pool from '../config/db.js'
import { esFechaPasada } from '../utils/dates.js'
import { crearFasesItem } from '../utils/fasesProyecto.js'

const fechaEntregaPasada = (items = []) =>
  items.some(it => esFechaPasada(it.fecha_entrega_estimada))

// Cada ítem puede despacharse a varias ubicaciones (puntos_entrega_detalle):
// si trae `ubicaciones`, la suma de sus cantidades debe coincidir exactamente
// con la cantidad total del ítem — si no, no queda claro a dónde va el resto.
// Un ítem sin `ubicaciones` (o con el arreglo vacío) es válido: queda sin
// punto de entrega asignado todavía.
const validarUbicaciones = (items = []) => {
  for (const item of items) {
    if (!Array.isArray(item.ubicaciones) || item.ubicaciones.length === 0) continue
    const suma = item.ubicaciones.reduce((acc, u) => acc + (parseInt(u.cantidad, 10) || 0), 0)
    const cantidad = parseInt(item.cantidad, 10) || 1
    if (suma !== cantidad) {
      return `El producto "${item.producto}" tiene ${cantidad} unidades pero sus puntos de entrega suman ${suma}`
    }
  }
  return null
}

const BASE = `
  SELECT p.*, c.nombre AS cliente, pr.id_proyecto,
         COUNT(DISTINCT dp.id_detalle) AS total_items
  FROM pedidos p
  LEFT JOIN clientes       c  ON p.id_cliente = c.id_cliente
  LEFT JOIN detalle_pedido dp ON dp.id_pedido  = p.id_pedido
  LEFT JOIN proyectos      pr ON pr.id_pedido  = p.id_pedido`

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
    const [ubicaciones] = items.length
      ? await pool.query(
          `SELECT id_entrega, id_detalle, direccion, cantidad FROM puntos_entrega_detalle
           WHERE id_detalle IN (${items.map(() => '?').join(',')})`,
          items.map(it => it.id_detalle))
      : [[]]
    const itemsConUbicaciones = items.map(it => ({
      ...it,
      ubicaciones: ubicaciones.filter(u => u.id_detalle === it.id_detalle),
    }))
    res.json({ ...pedido, items: itemsConUbicaciones })
  } catch (err) {
    console.error('[pedidos.getOne]', err)
    res.status(500).json({ message: 'Error al obtener pedido' })
  }
}

// Reemplaza todas las ubicaciones de un ítem (delete + re-insert), igual que
// guardarDirecciones en clientes.controller.js para direcciones_cliente.
const guardarUbicaciones = async (conn, id_detalle, ubicaciones = []) => {
  await conn.query('DELETE FROM puntos_entrega_detalle WHERE id_detalle = ?', [id_detalle])
  const validas = ubicaciones.filter(u => u.direccion?.trim() && (parseInt(u.cantidad, 10) || 0) > 0)
  if (validas.length === 0) return
  const values = validas.map(u => [id_detalle, u.direccion, parseInt(u.cantidad, 10)])
  await conn.query(
    'INSERT INTO puntos_entrega_detalle (id_detalle, direccion, cantidad) VALUES ?', [values])
}

const insertItems = async (conn, id_pedido, items) => {
  for (const item of items) {
    if (item.producto?.trim()) {
      const [result] = await conn.query(
        `INSERT INTO detalle_pedido (id_pedido, producto, cantidad, estado, fecha_entrega_estimada)
         VALUES (?,?,?,?,?)`,
        [id_pedido, item.producto, item.cantidad || 1,
         item.estado || 'pendiente', item.fecha_entrega_estimada || null])
      await guardarUbicaciones(conn, result.insertId, item.ubicaciones)
    }
  }
}

// Actualiza los ítems de un pedido ya existente SIN destruir los que ya
// tenían id_detalle: un DELETE+recreate (el comportamiento anterior) le
// cambiaba el id_detalle a TODOS los ítems, y como fases_proyecto.id_detalle_pedido
// tiene ON DELETE CASCADE, eso borraba las fases (y su avance) de todos los
// ítems del proyecto asociado con solo guardar el pedido, no solo del que
// se estaba agregando. Ahora: los ítems con id_detalle se actualizan en su
// propia fila, los que no tienen id_detalle (agregados en este guardado) se
// insertan, y los que existían pero ya no vienen en la lista se eliminan.
// Devuelve los ítems recién insertados (para poder generarles sus fases si
// el pedido ya tiene un proyecto asociado).
const sincronizarItems = async (conn, id_pedido, items) => {
  const validos = items.filter(it => it.producto?.trim())

  const [actuales] = await conn.query(
    'SELECT id_detalle FROM detalle_pedido WHERE id_pedido=?', [id_pedido])
  const idsActuales = new Set(actuales.map(it => it.id_detalle))

  const idsConservados = validos.filter(it => it.id_detalle).map(it => it.id_detalle)
  if (idsConservados.length > 0) {
    await conn.query(
      `DELETE FROM detalle_pedido WHERE id_pedido=? AND id_detalle NOT IN (${idsConservados.map(() => '?').join(',')})`,
      [id_pedido, ...idsConservados])
  } else {
    await conn.query('DELETE FROM detalle_pedido WHERE id_pedido=?', [id_pedido])
  }

  const nuevos = []
  for (const item of validos) {
    const cantidad = item.cantidad || 1
    const fecha = item.fecha_entrega_estimada || null

    if (item.id_detalle && idsActuales.has(item.id_detalle)) {
      await conn.query(
        `UPDATE detalle_pedido SET producto=?, cantidad=?, estado=?, fecha_entrega_estimada=?
         WHERE id_detalle=? AND id_pedido=?`,
        [item.producto, cantidad, item.estado || 'pendiente', fecha, item.id_detalle, id_pedido])
      await guardarUbicaciones(conn, item.id_detalle, item.ubicaciones)
    } else {
      const [result] = await conn.query(
        `INSERT INTO detalle_pedido (id_pedido, producto, cantidad, estado, fecha_entrega_estimada)
         VALUES (?,?,?,?,?)`,
        [id_pedido, item.producto, cantidad, item.estado || 'pendiente', fecha])
      await guardarUbicaciones(conn, result.insertId, item.ubicaciones)
      nuevos.push({ ...item, id_detalle: result.insertId })
    }
  }
  return nuevos
}

export const create = async (req, res) => {
  const { id_cliente, descripcion, items = [] } = req.body
  if (!id_cliente) return res.status(400).json({ message: 'El cliente es requerido' })
  if (fechaEntregaPasada(items)) {
    return res.status(400).json({ message: 'La fecha de entrega estimada de un ítem no puede ser anterior a hoy' })
  }
  const errorUbicaciones = validarUbicaciones(items)
  if (errorUbicaciones) return res.status(400).json({ message: errorUbicaciones })
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

  // Igual que al crear: un ítem que se está registrando ahora (sin id_detalle
  // todavía, sea porque el pedido es nuevo o porque se agregó en esta edición)
  // no puede quedar con fecha de entrega pasada. Los ítems ya existentes no
  // se revalidan aquí — pueden tener una fecha ya vencida de antes y no se
  // debe bloquear guardar otros cambios del pedido por eso.
  if (Array.isArray(items) && fechaEntregaPasada(items.filter(it => !it.id_detalle))) {
    return res.status(400).json({ message: 'La fecha de entrega estimada de un ítem nuevo no puede ser anterior a hoy' })
  }
  if (Array.isArray(items)) {
    const errorUbicaciones = validarUbicaciones(items)
    if (errorUbicaciones) return res.status(400).json({ message: errorUbicaciones })
  }

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
    let itemsNuevos = []
    if (Array.isArray(items)) {
      itemsNuevos = await sincronizarItems(conn, req.params.id, items)
    }

    // Si el pedido ya tiene un proyecto asociado, los ítems que se acaban de
    // agregar necesitan sus propias fases (Corte → Despacho) igual que las
    // que ya tienen los demás ítems — si no, el proyecto los muestra sin fases.
    if (itemsNuevos.length > 0) {
      const [[proyecto]] = await conn.query(
        'SELECT id_proyecto FROM proyectos WHERE id_pedido=?', [req.params.id])
      if (proyecto) {
        for (const item of itemsNuevos) {
          await crearFasesItem(conn, proyecto.id_proyecto, item.id_detalle)
        }
      }
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
