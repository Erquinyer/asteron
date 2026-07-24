import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

const BASE = `
  SELECT m.*,
         COUNT(mt.id_mantenimiento)               AS total_mantenimientos,
         MAX(mt.fecha)                             AS ultimo_mantenimiento,
         SUM(pp.estado IN ('en_proceso','programado')) AS en_uso_hoy
  FROM maquinaria m
  LEFT JOIN mantenimientos      mt ON mt.id_maquina = m.id_maquina
  LEFT JOIN programacion_planta pp ON pp.id_maquina = m.id_maquina AND pp.fecha = CURDATE()`

export const getAll = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`${BASE} GROUP BY m.id_maquina ORDER BY m.categoria, m.nombre`)
  ok(res, rows, 'Maquinaria obtenida correctamente')
})

export const getOne = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [req.params.id])
  if (!rows[0]) return fail(res, 'Equipo no encontrado', 404)

  const [mantenimientos] = await pool.query(
    `SELECT mt.*, u.nombre AS tecnico
     FROM mantenimientos mt
     LEFT JOIN usuarios u ON u.id_usuario = mt.realizado_por
     WHERE mt.id_maquina = ? ORDER BY mt.fecha DESC`, [req.params.id])

  ok(res, { ...rows[0], mantenimientos }, 'Equipo obtenido correctamente')
})

// req.body ya viene validado por maquinariaCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado } = req.body
  const [result] = await pool.query(
    `INSERT INTO maquinaria (nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [nombre, codigo || null, categoria || 'maquinaria_pesada',
     marca || null, referencia || null, serial || null,
     descripcion || null, ubicacion || null, estado || 'activa'])
  const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [result.insertId])
  ok(res, rows[0], 'Equipo creado correctamente', 201)
})

// req.body ya viene validado por maquinariaUpdateSchema
export const update = asyncHandler(async (req, res) => {
  const { nombre, codigo, categoria, marca, referencia, serial, descripcion, ubicacion, estado } = req.body
  const [result] = await pool.query(
    `UPDATE maquinaria SET nombre=?, codigo=?, categoria=?, marca=?, referencia=?,
     serial=?, descripcion=?, ubicacion=?, estado=? WHERE id_maquina=?`,
    [nombre, codigo || null, categoria || 'maquinaria_pesada',
     marca || null, referencia || null, serial || null,
     descripcion || null, ubicacion || null, estado || 'activa', req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Equipo no encontrado', 404)
  const [rows] = await pool.query(`${BASE} WHERE m.id_maquina = ? GROUP BY m.id_maquina`, [req.params.id])
  ok(res, rows[0], 'Equipo actualizado correctamente')
})

export const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM maquinaria WHERE id_maquina=?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Equipo no encontrado', 404)
  ok(res, null, 'Equipo eliminado correctamente')
})
