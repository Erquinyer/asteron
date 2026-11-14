import pool from '../config/db.js'
import { fotoMaquina, registrarBitacora } from '../utils/bitacora.js'

const BASE = `
  SELECT m.*,
         r.nombre                                  AS responsable,
         COUNT(mt.id_mantenimiento)               AS total_mantenimientos,
         MAX(mt.fecha)                             AS ultimo_mantenimiento,
         SUM(pp.estado IN ('en_proceso','programado')) AS en_uso_hoy
  FROM maquinaria m
  LEFT JOIN usuarios            r  ON r.id_usuario  = m.id_responsable
  LEFT JOIN mantenimientos      mt ON mt.id_maquina = m.id_maquina
  LEFT JOIN programacion_planta pp ON pp.id_maquina = m.id_maquina AND pp.fecha = CURDATE()`

export const getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(`${BASE} GROUP BY m.id_maquina ORDER BY m.categoria, m.nombre`)
    res.json(rows)
  } catch (err) {
    console.error('[maquinaria.getAll]', err)
    res.status(500).json({ message: 'Error al obtener maquinaria' })
  }
}

export const getOne = async (req, res) => {
  try {
    const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [req.params.id])
    if (!rows[0]) return res.status(404).json({ message: 'Equipo no encontrado' })

    const [mantenimientos] = await pool.query(
      `SELECT mt.*, u.nombre AS tecnico
       FROM mantenimientos mt
       LEFT JOIN usuarios u ON u.id_usuario = mt.realizado_por
       WHERE mt.id_maquina = ? ORDER BY mt.fecha DESC`, [req.params.id])

    res.json({ ...rows[0], mantenimientos })
  } catch (err) {
    console.error('[maquinaria.getOne]', err)
    res.status(500).json({ message: 'Error al obtener equipo' })
  }
}

export const create = async (req, res) => {
  const { nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado, id_responsable } = req.body
  if (!nombre) return res.status(400).json({ message: 'El nombre es requerido' })
  try {
    const [result] = await pool.query(
      `INSERT INTO maquinaria (nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado, id_responsable)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [nombre, codigo || null, categoria || 'maquinaria_pesada',
       marca || null, referencia || null, serial || null,
       descripcion || null, ubicacion || null, estado || 'activa', id_responsable || null])
    const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [result.insertId])
    await registrarBitacora({
      entidad: 'maquinaria', id_registro: result.insertId, accion: 'crear',
      despues: await fotoMaquina(result.insertId), autor: req.user.id,
    })
    res.status(201).json(rows[0])
  } catch (err) {
    console.error('[maquinaria.create]', err)
    res.status(500).json({ message: 'Error al crear equipo' })
  }
}

export const update = async (req, res) => {
  const { nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado, id_responsable } = req.body
  try {
    const antes = await fotoMaquina(req.params.id)
    const [result] = await pool.query(
      `UPDATE maquinaria SET nombre=?, codigo=?, categoria=?, marca=?, referencia=?,
       serial=?, descripcion=?, ubicacion=?, estado=?, id_responsable=? WHERE id_maquina=?`,
      [nombre, codigo || null, categoria || 'maquinaria_pesada',
       marca || null, referencia || null, serial || null,
       descripcion || null, ubicacion || null, estado || 'activa', id_responsable || null, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' })
    const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [req.params.id])
    await registrarBitacora({
      entidad: 'maquinaria', id_registro: Number(req.params.id), accion: 'editar',
      antes, despues: await fotoMaquina(req.params.id), autor: req.user.id,
    })
    res.json(rows[0])
  } catch (err) {
    console.error('[maquinaria.update]', err)
    res.status(500).json({ message: 'Error al actualizar equipo' })
  }
}

export const remove = async (req, res) => {
  try {
    // Foto antes de borrar: es lo único que quedará de este equipo en la bitácora
    const antes = await fotoMaquina(req.params.id)
    const [result] = await pool.query('DELETE FROM maquinaria WHERE id_maquina=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' })
    await registrarBitacora({
      entidad: 'maquinaria', id_registro: Number(req.params.id), accion: 'eliminar', antes, autor: req.user.id,
    })
    res.json({ message: 'Equipo eliminado' })
  } catch (err) {
    // fk_mantenimiento_maquina es RESTRICT: el historial de mantenimientos no se pierde al borrar
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        message: 'No se puede eliminar: el equipo tiene mantenimientos registrados. Márcalo como dado de baja.',
      })
    }
    console.error('[maquinaria.remove]', err)
    res.status(500).json({ message: 'Error al eliminar equipo' })
  }
}

