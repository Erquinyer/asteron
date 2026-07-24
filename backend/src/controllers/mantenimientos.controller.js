import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

export const getByMaquina = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
    FROM mantenimientos mt
    LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
    LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
    WHERE mt.id_maquina = ?
    ORDER BY mt.fecha DESC`, [req.params.id])
  ok(res, rows, 'Mantenimientos obtenidos correctamente')
})

export const getAll = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
    FROM mantenimientos mt
    LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
    LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
    ORDER BY mt.fecha DESC
    LIMIT 100`)
  ok(res, rows, 'Mantenimientos obtenidos correctamente')
})

// req.body ya viene validado por mantenimientoCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { id_maquina, fecha, tipo, descripcion } = req.body
  const [result] = await pool.query(
    `INSERT INTO mantenimientos (id_maquina, fecha, tipo, descripcion, realizado_por)
     VALUES (?,?,?,?,?)`,
    [id_maquina, fecha, tipo, descripcion || null, req.user.id])

  const [[row]] = await pool.query(`
    SELECT mt.*, u.nombre AS tecnico, m.nombre AS maquina, m.codigo AS maquina_codigo
    FROM mantenimientos mt
    LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
    LEFT JOIN maquinaria m ON m.id_maquina  = mt.id_maquina
    WHERE mt.id_mantenimiento = ?`, [result.insertId])

  // Actualizar estado de la máquina si es correctivo
  if (tipo === 'correctivo') {
    await pool.query(`UPDATE maquinaria SET estado = 'en_mantenimiento' WHERE id_maquina = ?`, [id_maquina])
  }

  ok(res, row, 'Mantenimiento registrado correctamente', 201)
})

export const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM mantenimientos WHERE id_mantenimiento = ?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Registro no encontrado', 404)
  ok(res, null, 'Mantenimiento eliminado correctamente')
})
