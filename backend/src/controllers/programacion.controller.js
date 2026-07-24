import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

export const getAll = asyncHandler(async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0]
  const [rows] = await pool.query(`
    SELECT pp.*,
           u.nombre  AS operario,
           m.nombre  AS maquina,  m.codigo AS maquina_codigo,
           pr.nombre AS proyecto,
           fe.nombre AS fase_nombre
    FROM programacion_planta pp
    LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
    LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
    LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
    LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
    LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
    WHERE pp.fecha = ?
    ORDER BY FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`, [fecha])
  ok(res, rows, 'Programación obtenida correctamente')
})

// req.body ya viene validado por programacionCreateSchema
export const create = asyncHandler(async (req, res) => {
  const { fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, observaciones } = req.body
  const [result] = await pool.query(
    `INSERT INTO programacion_planta (fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, estado, observaciones)
     VALUES (?,?,?,?,?,?,?,?)`,
    [fecha, id_operario, id_maquina, id_proyecto || null,
     id_fase_proyecto || null, tiempo_estimado || 480, 'programado', observaciones || null])

  const [[row]] = await pool.query(`
    SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo,
           pr.nombre AS proyecto, fe.nombre AS fase_nombre
    FROM programacion_planta pp
    LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
    LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
    LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
    LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
    LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
    WHERE pp.id_programacion = ?`, [result.insertId])

  ok(res, row, 'Programación creada correctamente', 201)
})

// req.body ya viene validado por programacionEstadoSchema
export const updateEstado = asyncHandler(async (req, res) => {
  const { estado, tiempo_real } = req.body
  const { id } = req.params

  await pool.query(
    `UPDATE programacion_planta SET estado=?, tiempo_real=? WHERE id_programacion=?`,
    [estado, tiempo_real || null, id])

  if (estado === 'completado') {
    const [[prog]] = await pool.query(
      'SELECT id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [id])
    if (prog?.id_fase_proyecto) {
      await pool.query(
        'UPDATE fases_proyecto SET estado=?, porcentaje_avance=100 WHERE id_fase_proyecto=?',
        ['completada', prog.id_fase_proyecto])
    }
  }

  ok(res, null, 'Estado actualizado correctamente')
})

export const remove = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM programacion_planta WHERE id_programacion=?', [req.params.id])
  if (result.affectedRows === 0) return fail(res, 'Registro no encontrado', 404)
  ok(res, null, 'Registro eliminado correctamente')
})
