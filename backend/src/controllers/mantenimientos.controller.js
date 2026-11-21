import pool from '../config/db.js'
import { esFechaPasada, hoyISO } from '../utils/dates.js'
import { fotoMaquina, registrarBitacora } from '../utils/bitacora.js'
import { responderError } from '../utils/errores.js'

// Valores permitidos por la columna ENUM de la BD (mantenimientos.tipo)
const TIPOS = ['preventivo', 'correctivo', 'predictivo', 'calibracion']

// Fecha real en formato AAAA-MM-DD (rechaza "2026-13-45" y "2026-02-30")
const fechaValida = (f) => {
  if (typeof f !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f)) return false
  const d = new Date(`${f}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f
}

export const getByMaquina = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      WHERE mt.id_maquina = ?
      ORDER BY mt.fecha DESC`, [req.params.id])
    res.json(rows)
  } catch (err) {
    responderError(res, err, 'mantenimientos.getByMaquina', 'Error al obtener mantenimientos')
  }
}

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      ORDER BY mt.fecha DESC
      LIMIT 100`)
    res.json(rows)
  } catch (err) {
    responderError(res, err, 'mantenimientos.getAll', 'Error al obtener mantenimientos')
  }
}

// Un correctivo realizado deja la máquina en mantenimiento; el cambio de estado
// queda en la bitácora con el mantenimiento que lo causó
const detenerPorCorrectivo = async (id_maquina, id_mantenimiento, autor) => {
  const antes = await fotoMaquina(id_maquina)
  await pool.query(`UPDATE maquinaria SET estado = 'en_mantenimiento' WHERE id_maquina = ?`, [id_maquina])
  if (antes && antes.estado !== 'en_mantenimiento') {
    await registrarBitacora({
      entidad: 'maquinaria', id_registro: Number(id_maquina), accion: 'estado',
      antes, despues: await fotoMaquina(id_maquina), autor,
      detalle: `Mantenimiento correctivo #${id_mantenimiento}`,
    })
  }
}

export const create = async (req, res) => {
  const { id_maquina, fecha, tipo, descripcion } = req.body
  const programado = req.body.estado === 'programado'
  if (!id_maquina || !fecha || !tipo) {
    return res.status(400).json({ message: 'Máquina, fecha y tipo son requeridos' })
  }
  // Restricciones de la BD llevadas a reglas del servicio: sin ellas, MySQL en modo
  // estricto rechaza el INSERT y el API respondía 500 en vez de 400.
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ message: 'Tipo de mantenimiento no válido' })
  }
  if (!fechaValida(fecha)) {
    return res.status(400).json({ message: 'Fecha no válida (use AAAA-MM-DD)' })
  }
  if (programado && esFechaPasada(fecha)) {
    return res.status(400).json({ message: 'La fecha de un mantenimiento programado no puede ser anterior a hoy' })
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO mantenimientos (id_maquina, fecha, tipo, descripcion, realizado_por, estado)
       VALUES (?,?,?,?,?,?)`,
      [id_maquina, fecha, tipo, descripcion || null, programado ? null : req.user.id,
       programado ? 'programado' : 'realizado'])

    const [[row]] = await pool.query(`
      SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM mantenimientos mt
      LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
      LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
      WHERE mt.id_mantenimiento = ?`, [result.insertId])

    // Actualizar estado de la máquina si es correctivo (uno programado aún no la detiene)
    if (tipo === 'correctivo' && !programado) {
      await detenerPorCorrectivo(id_maquina, result.insertId, req.user.id)
    }

    res.status(201).json(row)
  } catch (err) {
    // La máquina no existe: viola la llave foránea fk_mantenimiento_maquina
    if (err.code === 'ER_NO_REFERENCED_ROW_2' && err.sqlMessage?.includes('fk_mantenimiento_maquina')) {
      return res.status(404).json({ message: 'La máquina no existe' })
    }
    responderError(res, err, 'mantenimientos.create', 'Error al registrar mantenimiento')
  }
}

// PATCH /:id/realizar — cierra un mantenimiento programado: la fecha pasa a ser la
// de ejecución real y queda registrado quién lo hizo.
export const realizar = async (req, res) => {
  const { id } = req.params
  try {
    const [[mantenimiento]] = await pool.query(
      'SELECT id_maquina, tipo, estado, descripcion FROM mantenimientos WHERE id_mantenimiento = ?', [id])
    if (!mantenimiento) return res.status(404).json({ message: 'Registro no encontrado' })
    if (mantenimiento.estado !== 'programado') {
      return res.status(400).json({ message: 'Este mantenimiento ya fue realizado' })
    }
    await pool.query(
      `UPDATE mantenimientos SET estado = 'realizado', fecha = ?, realizado_por = ?, descripcion = ?
       WHERE id_mantenimiento = ?`,
      [hoyISO(), req.user.id, req.body.descripcion?.trim() || mantenimiento.descripcion, id])
    if (mantenimiento.tipo === 'correctivo') {
      await detenerPorCorrectivo(mantenimiento.id_maquina, Number(id), req.user.id)
    }
    res.json({ message: 'Mantenimiento realizado' })
  } catch (err) {
    responderError(res, err, 'mantenimientos.realizar', 'Error al actualizar el mantenimiento')
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM mantenimientos WHERE id_mantenimiento = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' })
    res.json({ message: 'Mantenimiento eliminado' })
  } catch (err) {
    responderError(res, err, 'mantenimientos.remove', 'Error al eliminar')
  }
}