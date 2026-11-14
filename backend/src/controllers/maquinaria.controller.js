import pool from '../config/db.js'
import { responderError } from '../utils/errores.js'

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
    responderError(res, err, { contexto: 'maquinaria.getAll', mensaje: 'Error al obtener maquinaria' })
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
    responderError(res, err, { contexto: 'maquinaria.getOne', mensaje: 'Error al obtener equipo' })
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
    res.status(201).json(rows[0])
  } catch (err) {
    responderError(res, err, { contexto: 'maquinaria.create', mensaje: 'Error al crear equipo' })
  }
}

export const update = async (req, res) => {
  const { nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado, id_responsable } = req.body
  try {
    const [result] = await pool.query(
      `UPDATE maquinaria SET nombre=?, codigo=?, categoria=?, marca=?, referencia=?,
       serial=?, descripcion=?, ubicacion=?, estado=?, id_responsable=? WHERE id_maquina=?`,
      [nombre, codigo || null, categoria || 'maquinaria_pesada',
       marca || null, referencia || null, serial || null,
       descripcion || null, ubicacion || null, estado || 'activa', id_responsable || null, req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' })
    const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [req.params.id])
    res.json(rows[0])
  } catch (err) {
    responderError(res, err, { contexto: 'maquinaria.update', mensaje: 'Error al actualizar equipo' })
  }
}

export const remove = async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM maquinaria WHERE id_maquina=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Equipo no encontrado' })
    res.json({ message: 'Equipo eliminado' })
  } catch (err) {
    responderError(res, err, { contexto: 'maquinaria.remove', mensaje: 'Error al eliminar equipo' })
  }
}

