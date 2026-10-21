import ExcelJS from 'exceljs'
import pool from '../config/db.js'
import { esFechaPasada, hoyISO, fechaColumnaISO } from '../utils/dates.js'
import {
  leerFilas, cargarContexto, resolverFila, valoresParaMostrar, COLUMNAS_PLANTILLA,
  crearRegistroSimulado, estaOcupadoSimulado, marcarOcupadoSimulado,
} from '../utils/importProgramacion.js'

// Recalcula estado + porcentaje_avance de una fase a partir de sus turnos vinculados
// (no cancelados). Se llama después de cualquier cambio en programacion_planta que
// toque una fase: crear, iniciar, ajustar avance, completar, cancelar o eliminar.
export const recomputeFase = async (id_fase_proyecto) => {
  if (!id_fase_proyecto) return

  const [turnos] = await pool.query(
    `SELECT estado, porcentaje_avance FROM programacion_planta
     WHERE id_fase_proyecto = ? AND estado != 'cancelado'`,
    [id_fase_proyecto])

  // Sin turnos activos vinculados: la fase queda bajo control manual (ProyectoDetalle)
  if (turnos.length === 0) return

  const avance = Math.round(
    turnos.reduce((sum, t) => sum + t.porcentaje_avance, 0) / turnos.length)
  const estado = turnos.every(t => t.estado === 'completado') ? 'completada'
    : turnos.every(t => t.estado === 'programado') ? 'pendiente'
    : 'en_curso'

  const [[fase]] = await pool.query(
    'SELECT estado, porcentaje_avance FROM fases_proyecto WHERE id_fase_proyecto = ?',
    [id_fase_proyecto])
  if (!fase || (fase.estado === estado && fase.porcentaje_avance === avance)) return

  await pool.query(
    'UPDATE fases_proyecto SET estado=?, porcentaje_avance=? WHERE id_fase_proyecto=?',
    [estado, avance, id_fase_proyecto])

  await pool.query(
    `INSERT INTO historial_fases (id_fase_proyecto, estado_anterior, estado_nuevo, porcentaje, observacion)
     VALUES (?,?,?,?,?)`,
    [id_fase_proyecto, fase.estado, estado, avance, 'Actualizado automáticamente desde Programación de planta'])
}

// Operarios y máquinas no disponibles para una actividad nueva: los que tienen
// una actividad en_proceso ahora mismo (bloqueo en tiempo real, sin importar la
// fecha) más, si se indica ?fecha=, los que ya tienen un turno programado o en
// proceso ese mismo día (evita doble-reserva en fechas futuras).
export const getOcupados = async (req, res) => {
  const { fecha } = req.query
  try {
    const [rows] = await pool.query(
      fecha
        ? `SELECT id_operario, id_maquina FROM programacion_planta
           WHERE estado = 'en_proceso'
              OR (fecha = ? AND estado IN ('programado','en_proceso'))`
        : `SELECT id_operario, id_maquina FROM programacion_planta WHERE estado = 'en_proceso'`,
      fecha ? [fecha] : [])
    res.json({
      operarios: [...new Set(rows.map(r => r.id_operario).filter(Boolean))],
      maquinas:  [...new Set(rows.map(r => r.id_maquina).filter(Boolean))],
    })
  } catch (err) {
    console.error('[programacion.getOcupados]', err)
    res.status(500).json({ message: 'Error al obtener disponibilidad' })
  }
}

export const getAll = async (req, res) => {
  // Rango de fechas: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (vista semana / mes) o
  // ?fecha=YYYY-MM-DD (vista día, comportamiento por defecto).
  const hoy = hoyISO()
  const desde = req.query.desde || req.query.fecha || hoy
  const hasta = req.query.hasta || req.query.fecha || desde
  try {
    const [rows] = await pool.query(`
      SELECT pp.*,
             u.nombre  AS operario,
             m.nombre  AS maquina,  m.codigo AS maquina_codigo,
             pr.nombre AS proyecto,
             cl.nombre AS cliente,
             fe.nombre AS fase_nombre,
             dp.producto AS item_producto
      FROM programacion_planta pp
      LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
      LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
      LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
      LEFT JOIN pedidos        pe ON pr.id_pedido        = pe.id_pedido
      LEFT JOIN clientes       cl ON pe.id_cliente       = cl.id_cliente
      LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
      LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      WHERE pp.fecha BETWEEN ? AND ?
      ORDER BY pp.fecha,
               FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`,
      [desde, hasta])
    res.json(rows)
  } catch (err) {
    console.error('[programacion.getAll]', err)
    res.status(500).json({ message: 'Error al obtener programación' })
  }
}

// GET /fase/:idFase — actividades (turnos) vinculadas a una fase concreta de un
// proyecto. Se usa en ProyectoDetalle para ver el detalle sin salir del módulo.
export const getByFase = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT pp.id_programacion, pp.fecha, pp.estado, pp.porcentaje_avance,
             pp.tiempo_estimado, pp.tiempo_real, pp.observaciones,
             u.nombre AS operario,
             m.nombre AS maquina, m.codigo AS maquina_codigo
      FROM programacion_planta pp
      LEFT JOIN usuarios   u ON pp.id_operario = u.id_usuario
      LEFT JOIN maquinaria m ON pp.id_maquina  = m.id_maquina
      WHERE pp.id_fase_proyecto = ?
      ORDER BY pp.fecha DESC,
               FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`,
      [req.params.idFase])
    res.json(rows)
  } catch (err) {
    console.error('[programacion.getByFase]', err)
    res.status(500).json({ message: 'Error al obtener actividades de la fase' })
  }
}

// Reglas de negocio de un turno (fecha, disponibilidad de operario/máquina ese
// día, estado de la fase) SIN escribir en la BD — solo lectura. La usan
// `crearTurnoInterno` antes de insertar y `previsualizarImportar` para el
// dry-run de la importación masiva. Devuelve { ok: true } o { ok: false, status, message }.
export const validarTurnoInterno = async ({ fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto }) => {
  if (!fecha || !id_operario) {
    return { ok: false, status: 400, message: 'Fecha y operario son requeridos' }
  }
  if (esFechaPasada(fecha)) {
    return { ok: false, status: 400, message: 'No se puede programar una actividad en una fecha pasada' }
  }
  if (id_proyecto && !id_fase_proyecto) {
    return { ok: false, status: 400, message: 'Selecciona la fase específica del proyecto' }
  }

  // La fase determina si esta actividad necesita equipo: si no se indica fase,
  // se sigue exigiendo máquina como antes (turno "suelto", sin contexto de proyecto).
  let maquinaRequerida = true
  if (id_fase_proyecto) {
    const [[fase]] = await pool.query(`
      SELECT fp.estado, fe.requiere_turno, fe.categoria_equipo
      FROM fases_proyecto fp JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      WHERE fp.id_fase_proyecto = ?`, [id_fase_proyecto])
    if (!fase) {
      return { ok: false, status: 404, message: 'La fase indicada no existe' }
    }
    if (!fase.requiere_turno) {
      return { ok: false, status: 400, message: 'Esa fase no se programa desde Programación de planta' }
    }
    if (fase.estado === 'completada') {
      return { ok: false, status: 409, message: 'Esa fase ya está completada; no admite nuevas actividades' }
    }
    maquinaRequerida = fase.categoria_equipo !== null
  }
  if (maquinaRequerida && !id_maquina) {
    return { ok: false, status: 400, message: 'Esta fase requiere seleccionar un equipo' }
  }

  const [[operarioOcupado]] = await pool.query(
    `SELECT 1 FROM programacion_planta
     WHERE id_operario=? AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
    [id_operario, fecha])
  if (operarioOcupado) {
    return { ok: false, status: 409, message: 'El operario ya tiene una actividad asignada ese día' }
  }

  if (id_maquina) {
    const [[maquinaOcupada]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_maquina=? AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_maquina, fecha])
    if (maquinaOcupada) {
      return { ok: false, status: 409, message: 'La máquina ya está reservada ese día en otra actividad' }
    }
  }

  return { ok: true }
}

// Crea el turno: valida con `validarTurnoInterno` y, si pasa, inserta.
// Compartida entre el endpoint POST individual y el importador masivo
// (backend/src/utils/importProgramacion.js) — así ambos caminos quedan
// siempre en sincro. Devuelve { ok: true, turno } o { ok: false, status, message }.
export const crearTurnoInterno = async (datos) => {
  const { fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, observaciones } = datos

  const validacion = await validarTurnoInterno(datos)
  if (!validacion.ok) return validacion

  const [result] = await pool.query(
    `INSERT INTO programacion_planta (fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, estado, porcentaje_avance, observaciones)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [fecha, id_operario, id_maquina || null, id_proyecto || null,
     id_fase_proyecto || null, tiempo_estimado || 480, 'programado', 0, observaciones || null])

  if (id_fase_proyecto) await recomputeFase(id_fase_proyecto)

  const [[turno]] = await pool.query(`
    SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo,
           pr.nombre AS proyecto, fe.nombre AS fase_nombre,
           dp.producto AS item_producto
    FROM programacion_planta pp
    LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
    LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
    LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
    LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
    LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
    LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
    WHERE pp.id_programacion = ?`, [result.insertId])

  return { ok: true, turno }
}

export const create = async (req, res) => {
  try {
    const resultado = await crearTurnoInterno(req.body)
    if (!resultado.ok) return res.status(resultado.status).json({ message: resultado.message })
    res.status(201).json(resultado.turno)
  } catch (err) {
    console.error('[programacion.create]', err)
    res.status(500).json({ message: 'Error al crear programación' })
  }
}

// GET /plantilla — plantilla .xlsx para cargar varios turnos a la vez, con
// hojas de referencia de operarios/máquinas vigentes para reducir errores.
export const getPlantilla = async (_req, res) => {
  try {
    const workbook = new ExcelJS.Workbook()

    const hoja = workbook.addWorksheet('Programación')
    hoja.columns = [
      { header: 'Fecha', key: 'Fecha', width: 14 },
      { header: 'Operario', key: 'Operario', width: 22 },
      { header: 'Maquina', key: 'Maquina', width: 14 },
      { header: 'Proyecto', key: 'Proyecto', width: 32 },
      { header: 'Item', key: 'Item', width: 26 },
      { header: 'Fase', key: 'Fase', width: 22 },
      { header: 'TiempoEstimado', key: 'TiempoEstimado', width: 16 },
      { header: 'Observaciones', key: 'Observaciones', width: 32 },
    ]
    hoja.getRow(1).font = { bold: true }
    hoja.addRow({
      Fecha: hoyISO(),
      Operario: 'Nombre o código del operario (ver hoja Operarios)',
      Maquina: 'Código de la máquina (ver hoja Maquinas)',
      Proyecto: '',
      Item: '',
      Fase: '',
      TiempoEstimado: 480,
      Observaciones: 'Fila de ejemplo — bórrala antes de importar',
    })

    const ctx = await cargarContexto()

    const hojaOperarios = workbook.addWorksheet('Operarios')
    hojaOperarios.columns = [{ header: 'Codigo', key: 'c', width: 14 }, { header: 'Nombre', key: 'n', width: 28 }]
    hojaOperarios.getRow(1).font = { bold: true }
    ctx.operarios.forEach(o => hojaOperarios.addRow({ c: o.codigo_empleado, n: o.nombre }))

    const hojaMaquinas = workbook.addWorksheet('Maquinas')
    hojaMaquinas.columns = [{ header: 'Codigo', key: 'c', width: 14 }, { header: 'Nombre', key: 'n', width: 28 }]
    hojaMaquinas.getRow(1).font = { bold: true }
    ctx.maquinas.forEach(m => hojaMaquinas.addRow({ c: m.codigo, n: m.nombre }))

    const buffer = await workbook.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_programacion.xlsx"')
    res.send(Buffer.from(buffer))
  } catch (err) {
    console.error('[programacion.getPlantilla]', err)
    res.status(500).json({ message: 'Error al generar la plantilla' })
  }
}

// POST /importar — crea varios turnos a partir de un .xlsx/.csv (campo "archivo").
// Reusa crearTurnoInterno fila por fila (secuencial) para que las mismas reglas
// de disponibilidad/fecha/fase apliquen, incluso entre filas del propio archivo.
export const importar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Debes adjuntar un archivo .xlsx o .csv' })
  }
  try {
    const { filas } = await leerFilas(req.file.buffer, req.file.originalname)
    if (filas.length === 0) {
      return res.status(400).json({ message: 'El archivo no tiene filas con datos para importar' })
    }

    const ctx = await cargarContexto()
    const fasesCache = new Map()
    const errores = []
    let creados = 0

    for (const row of filas) {
      const { payload, error } = await resolverFila(row, ctx, fasesCache)
      if (error) { errores.push({ fila: row.__fila, motivo: error }); continue }

      const resultado = await crearTurnoInterno(payload)
      if (!resultado.ok) { errores.push({ fila: row.__fila, motivo: resultado.message }); continue }
      creados++
    }

    res.json({ total: filas.length, creados, errores })
  } catch (err) {
    console.error('[programacion.importar]', err)
    res.status(400).json({ message: err.message || 'No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido.' })
  }
}

// POST /importar/preview — dry-run: parsea y valida el archivo (misma lógica
// que `importar`, incluyendo disponibilidad) pero no crea nada. Además del
// chequeo contra la BD, lleva un registro simulado de lo que "iría quedando
// ocupado" fila a fila dentro del propio archivo — la BD sola no detecta que
// dos filas del mismo archivo reserven el mismo operario/máquina el mismo día,
// porque ninguna de las dos existe todavía.
export const previsualizarImportar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Debes adjuntar un archivo .xlsx o .csv' })
  }
  try {
    const { filas } = await leerFilas(req.file.buffer, req.file.originalname)
    if (filas.length === 0) {
      return res.status(400).json({ message: 'El archivo no tiene filas con datos para importar' })
    }

    const ctx = await cargarContexto()
    const fasesCache = new Map()
    const simulado = crearRegistroSimulado()
    const resultado = []

    for (const row of filas) {
      const valores = valoresParaMostrar(row)
      const { payload, error } = await resolverFila(row, ctx, fasesCache)
      if (error) { resultado.push({ fila: row.__fila, valores, estado: 'error', motivo: error }); continue }

      if (estaOcupadoSimulado(simulado, 'operarios', payload.id_operario, payload.fecha)) {
        resultado.push({ fila: row.__fila, valores, estado: 'error', motivo: 'El operario ya está asignado ese día en otra fila de este archivo' })
        continue
      }
      if (estaOcupadoSimulado(simulado, 'maquinas', payload.id_maquina, payload.fecha)) {
        resultado.push({ fila: row.__fila, valores, estado: 'error', motivo: 'La máquina ya está reservada ese día en otra fila de este archivo' })
        continue
      }

      const validacion = await validarTurnoInterno(payload)
      if (!validacion.ok) { resultado.push({ fila: row.__fila, valores, estado: 'error', motivo: validacion.message }); continue }

      marcarOcupadoSimulado(simulado, 'operarios', payload.id_operario, payload.fecha)
      marcarOcupadoSimulado(simulado, 'maquinas', payload.id_maquina, payload.fecha)
      resultado.push({ fila: row.__fila, valores, estado: 'ok', motivo: null })
    }

    res.json({
      columnas: COLUMNAS_PLANTILLA,
      filas: resultado,
      total: resultado.length,
      validas: resultado.filter(r => r.estado === 'ok').length,
    })
  } catch (err) {
    console.error('[programacion.previsualizarImportar]', err)
    res.status(400).json({ message: err.message || 'No se pudo leer el archivo. Verifica que sea un .xlsx o .csv válido.' })
  }
}

// PUT /:id — edita un turno que aún no inició (fecha, operario, máquina,
// proyecto/fase, tiempo estimado, observaciones). Una vez en_proceso o
// completado, ya no se puede reprogramar: solo estado/avance.
export const update = async (req, res) => {
  const { id } = req.params
  const { fecha, id_operario, id_maquina, id_proyecto, id_fase_proyecto, tiempo_estimado, observaciones } = req.body
  if (!fecha || !id_operario) {
    return res.status(400).json({ message: 'Fecha y operario son requeridos' })
  }
  if (id_proyecto && !id_fase_proyecto) {
    return res.status(400).json({ message: 'Selecciona la fase específica del proyecto' })
  }
  try {
    const [[actual]] = await pool.query(
      'SELECT estado, fecha, id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [id])
    if (!actual) return res.status(404).json({ message: 'Registro no encontrado' })
    if (actual.estado !== 'programado') {
      return res.status(409).json({ message: 'Solo se puede editar una actividad que aún no ha iniciado' })
    }

    // "No puede ser pasada" solo se exige si la fecha realmente cambió: no debe
    // bloquear la edición de otros campos de un turno cuya fecha ya quedó atrás.
    const fechaCambio = fechaColumnaISO(actual.fecha) !== fecha
    if (fechaCambio && esFechaPasada(fecha)) {
      return res.status(400).json({ message: 'No se puede programar una actividad en una fecha pasada' })
    }

    // La fase determina si hace falta máquina — igual que al crear (ver validarTurnoInterno).
    let maquinaRequerida = true
    if (id_fase_proyecto) {
      const [[fase]] = await pool.query(`
        SELECT fp.estado, fe.requiere_turno, fe.categoria_equipo
        FROM fases_proyecto fp JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
        WHERE fp.id_fase_proyecto = ?`, [id_fase_proyecto])
      if (!fase) return res.status(404).json({ message: 'La fase indicada no existe' })
      if (!fase.requiere_turno) {
        return res.status(400).json({ message: 'Esa fase no se programa desde Programación de planta' })
      }
      if (fase.estado === 'completada') {
        return res.status(409).json({ message: 'Esa fase ya está completada; no admite nuevas actividades' })
      }
      maquinaRequerida = fase.categoria_equipo !== null
    }
    if (maquinaRequerida && !id_maquina) {
      return res.status(400).json({ message: 'Esta fase requiere seleccionar un equipo' })
    }

    const [[operarioOcupado]] = await pool.query(
      `SELECT 1 FROM programacion_planta
       WHERE id_operario=? AND id_programacion!=?
         AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
      [id_operario, id, fecha])
    if (operarioOcupado) {
      return res.status(409).json({ message: 'El operario ya tiene una actividad asignada ese día' })
    }

    if (id_maquina) {
      const [[maquinaOcupada]] = await pool.query(
        `SELECT 1 FROM programacion_planta
         WHERE id_maquina=? AND id_programacion!=?
           AND (estado='en_proceso' OR (fecha=? AND estado IN ('programado','en_proceso'))) LIMIT 1`,
        [id_maquina, id, fecha])
      if (maquinaOcupada) {
        return res.status(409).json({ message: 'La máquina ya está reservada ese día en otra actividad' })
      }
    }

    await pool.query(
      `UPDATE programacion_planta SET fecha=?, id_operario=?, id_maquina=?, id_proyecto=?,
       id_fase_proyecto=?, tiempo_estimado=?, observaciones=? WHERE id_programacion=?`,
      [fecha, id_operario, id_maquina || null, id_proyecto || null,
       id_fase_proyecto || null, tiempo_estimado || 480, observaciones || null, id])

    // Recalcula ambas fases si el turno cambió de fase (o se desvinculó de una)
    if (actual.id_fase_proyecto && actual.id_fase_proyecto !== id_fase_proyecto) {
      await recomputeFase(actual.id_fase_proyecto)
    }
    if (id_fase_proyecto) await recomputeFase(id_fase_proyecto)

    const [[row]] = await pool.query(`
      SELECT pp.*, u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo,
             pr.nombre AS proyecto, fe.nombre AS fase_nombre,
             dp.producto AS item_producto
      FROM programacion_planta pp
      LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
      LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
      LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
      LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
      LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
      WHERE pp.id_programacion = ?`, [id])

    res.json(row)
  } catch (err) {
    console.error('[programacion.update]', err)
    res.status(500).json({ message: 'Error al actualizar programación' })
  }
}

export const updateEstado = async (req, res) => {
  const { estado, tiempo_real } = req.body
  const { id } = req.params
  try {
    const [[prog]] = await pool.query(
      'SELECT id_fase_proyecto, id_operario, id_maquina FROM programacion_planta WHERE id_programacion=?', [id])
    if (!prog) return res.status(404).json({ message: 'Registro no encontrado' })

    if (estado === 'en_proceso') {
      const [[operarioOcupado]] = await pool.query(
        `SELECT 1 FROM programacion_planta
         WHERE id_operario=? AND estado='en_proceso' AND id_programacion!=? LIMIT 1`,
        [prog.id_operario, id])
      if (operarioOcupado) {
        return res.status(409).json({ message: 'El operario ya tiene otra actividad en curso' })
      }

      const [[maquinaOcupada]] = await pool.query(
        `SELECT 1 FROM programacion_planta
         WHERE id_maquina=? AND estado='en_proceso' AND id_programacion!=? LIMIT 1`,
        [prog.id_maquina, id])
      if (maquinaOcupada) {
        return res.status(409).json({ message: 'La máquina ya está en uso en otra actividad' })
      }
    }

    const porcentaje_avance = estado === 'completado' ? 100 : undefined
    await pool.query(
      porcentaje_avance !== undefined
        ? `UPDATE programacion_planta SET estado=?, tiempo_real=?, porcentaje_avance=? WHERE id_programacion=?`
        : `UPDATE programacion_planta SET estado=?, tiempo_real=? WHERE id_programacion=?`,
      porcentaje_avance !== undefined
        ? [estado, tiempo_real || null, porcentaje_avance, id]
        : [estado, tiempo_real || null, id])

    if (prog.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Estado actualizado' })
  } catch (err) {
    console.error('[programacion.updateEstado]', err)
    res.status(500).json({ message: 'Error al actualizar estado' })
  }
}

// PATCH /:id/avance — solo mientras el turno está en_proceso; 100% se reserva para "Completar"
export const updateAvance = async (req, res) => {
  const { id } = req.params
  const porcentaje_avance = Math.max(0, Math.min(99, Number(req.body.porcentaje_avance) || 0))

  try {
    const [[prog]] = await pool.query(
      'SELECT estado, id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [id])
    if (!prog) return res.status(404).json({ message: 'Registro no encontrado' })
    if (prog.estado !== 'en_proceso') {
      return res.status(400).json({ message: 'Solo se puede ajustar el avance de una actividad en proceso' })
    }

    await pool.query(
      'UPDATE programacion_planta SET porcentaje_avance=? WHERE id_programacion=?',
      [porcentaje_avance, id])

    if (prog.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Avance actualizado', porcentaje_avance })
  } catch (err) {
    console.error('[programacion.updateAvance]', err)
    res.status(500).json({ message: 'Error al actualizar avance' })
  }
}

export const remove = async (req, res) => {
  try {
    const [[prog]] = await pool.query(
      'SELECT id_fase_proyecto FROM programacion_planta WHERE id_programacion=?', [req.params.id])

    const [result] = await pool.query(
      'DELETE FROM programacion_planta WHERE id_programacion=?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Registro no encontrado' })

    if (prog?.id_fase_proyecto) await recomputeFase(prog.id_fase_proyecto)

    res.json({ message: 'Registro eliminado' })
  } catch (err) {
    console.error('[programacion.remove]', err)
    res.status(500).json({ message: 'Error al eliminar' })
  }
}
