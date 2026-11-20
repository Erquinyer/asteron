import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import pool from '../config/db.js'
import { tieneAccion } from '../middlewares/requireModulo.js'
import { DIR_EVIDENCIAS, tipoImagen, borrarArchivos } from '../utils/evidencias.js'
import { responderError } from '../utils/errores.js'

const BASE_QUERY = `
  SELECT e.id_evidencia, e.id_proyecto, e.id_fase_proyecto, e.id_programacion,
         e.nombre_original, e.descripcion, e.fecha,
         e.id_autor, u.nombre AS autor,
         fe.nombre AS fase_nombre, dp.producto AS item_producto,
         pp.fecha AS turno_fecha
  FROM evidencias_fotograficas e
  LEFT JOIN usuarios            u  ON u.id_usuario        = e.id_autor
  LEFT JOIN fases_proyecto      fp ON fp.id_fase_proyecto = e.id_fase_proyecto
  LEFT JOIN fases_estandar      fe ON fe.id_fase_estandar = fp.id_fase_estandar
  LEFT JOIN detalle_pedido      dp ON dp.id_detalle       = fp.id_detalle_pedido
  LEFT JOIN programacion_planta pp ON pp.id_programacion  = e.id_programacion`

// Convierte un campo opcional del formulario a id entero (null si viene vacío)
const idOpcional = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : NaN
}

// Galería del proyecto (RF-26): de la más reciente a la más antigua, con autor.
// Filtros opcionales por fase o por actividad.
export const getAll = async (req, res) => {
  const proyecto = idOpcional(req.query.proyecto)
  const fase = idOpcional(req.query.fase)
  const programacion = idOpcional(req.query.programacion)
  if (!proyecto || Number.isNaN(fase) || Number.isNaN(programacion)) {
    return res.status(400).json({ message: 'Indica un proyecto válido' })
  }

  const where = ['e.id_proyecto = ?']
  const params = [proyecto]
  if (fase)         { where.push('e.id_fase_proyecto = ?'); params.push(fase) }
  if (programacion) { where.push('e.id_programacion = ?');  params.push(programacion) }

  try {
    const [rows] = await pool.query(
      `${BASE_QUERY} WHERE ${where.join(' AND ')} ORDER BY e.fecha DESC, e.id_evidencia DESC`, params)
    res.json(rows)
  } catch (err) {
    responderError(res, err, 'evidencias.getAll', 'Error al obtener las fotos')
  }
}

// Adjuntar una foto a un proyecto y, opcionalmente, a una fase o actividad (RF-25)
export const create = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Adjunta una foto en el campo "foto"' })
  const extension = tipoImagen(req.file.buffer)
  if (!extension) return res.status(400).json({ message: 'Solo se permiten imágenes JPG, PNG o WEBP' })

  const id_proyecto = idOpcional(req.body.id_proyecto)
  let id_fase_proyecto = idOpcional(req.body.id_fase_proyecto)
  const id_programacion = idOpcional(req.body.id_programacion)
  if (!id_proyecto || Number.isNaN(id_fase_proyecto) || Number.isNaN(id_programacion)) {
    return res.status(400).json({ message: 'Proyecto, fase o actividad inválidos' })
  }
  const descripcion = req.body.descripcion?.trim() || null
  if (descripcion && descripcion.length > 255) {
    return res.status(400).json({ message: 'La descripción no puede superar 255 caracteres' })
  }

  try {
    const [[proyecto]] = await pool.query('SELECT id_proyecto FROM proyectos WHERE id_proyecto = ?', [id_proyecto])
    if (!proyecto) return res.status(404).json({ message: 'Proyecto no encontrado' })

    // La actividad debe ser del mismo proyecto; si no se indicó fase, se toma la de la actividad
    let turno = null
    if (id_programacion) {
      ;[[turno]] = await pool.query(
        `SELECT pp.id_operario, pp.id_fase_proyecto, COALESCE(pp.id_proyecto, fp.id_proyecto) AS id_proyecto
         FROM programacion_planta pp
         LEFT JOIN fases_proyecto fp ON fp.id_fase_proyecto = pp.id_fase_proyecto
         WHERE pp.id_programacion = ?`, [id_programacion])
      if (!turno || turno.id_proyecto !== id_proyecto) {
        return res.status(400).json({ message: 'La actividad no pertenece a este proyecto' })
      }
      if (id_fase_proyecto && turno.id_fase_proyecto && id_fase_proyecto !== turno.id_fase_proyecto) {
        return res.status(400).json({ message: 'La actividad no corresponde a esa fase' })
      }
      id_fase_proyecto = id_fase_proyecto ?? turno.id_fase_proyecto
    }

    let fase = null
    if (id_fase_proyecto) {
      ;[[fase]] = await pool.query(
        'SELECT id_usuario_asignado FROM fases_proyecto WHERE id_fase_proyecto = ? AND id_proyecto = ?',
        [id_fase_proyecto, id_proyecto])
      if (!fase) return res.status(400).json({ message: 'La fase no pertenece a este proyecto' })
    }

    // Pueden adjuntar: quien edita proyectos o programación, el operario de la actividad
    // y la persona asignada a la fase (Diseño, Compra) — igual que en updateFase.
    const permitido = turno?.id_operario === req.user.id
      || fase?.id_usuario_asignado === req.user.id
      || await tieneAccion(req.user.rol, 'proyectos', 'editar')
      || await tieneAccion(req.user.rol, 'programacion', 'editar')
    if (!permitido) return res.status(403).json({ message: 'No tienes permiso para adjuntar fotos a este proyecto' })

    // Nombre generado en el servidor: dos fotos "foto.jpg" no se pisan y no se
    // puede colar una ruta (../) desde el nombre original.
    const archivo = `${randomUUID()}.${extension}`
    await mkdir(DIR_EVIDENCIAS, { recursive: true })
    await writeFile(path.join(DIR_EVIDENCIAS, archivo), req.file.buffer)

    let insertId
    try {
      ;[{ insertId }] = await pool.query(
        `INSERT INTO evidencias_fotograficas
           (id_proyecto, id_fase_proyecto, id_programacion, archivo, nombre_original, descripcion, id_autor, fecha)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_proyecto, id_fase_proyecto, id_programacion, archivo,
          req.file.originalname?.slice(0, 255) || null, descripcion, req.user.id, new Date()])
    } catch (err) {
      await borrarArchivos([archivo]) // sin fila en la base, el archivo quedaría huérfano
      throw err
    }

    const [[evidencia]] = await pool.query(`${BASE_QUERY} WHERE e.id_evidencia = ?`, [insertId])
    res.status(201).json(evidencia)
  } catch (err) {
    responderError(res, err, 'evidencias.create', 'Error al guardar la foto')
  }
}

// Devuelve la imagen. No es un archivo público: exige el mismo token que el resto del API.
export const getArchivo = async (req, res) => {
  try {
    const [[evidencia]] = await pool.query(
      'SELECT archivo FROM evidencias_fotograficas WHERE id_evidencia = ?', [req.params.id])
    if (!evidencia) return res.status(404).json({ message: 'Foto no encontrada' })

    res.set('Cache-Control', 'private, max-age=86400')
    res.set('X-Content-Type-Options', 'nosniff')
    res.sendFile(evidencia.archivo, { root: DIR_EVIDENCIAS }, (err) => {
      if (err && !res.headersSent) res.status(404).json({ message: 'El archivo de la foto no existe en el servidor' })
    })
  } catch (err) {
    responderError(res, err, 'evidencias.getArchivo', 'Error al obtener la foto')
  }
}

// Elimina la foto: su autor o quien tenga "eliminar" en proyectos
export const remove = async (req, res) => {
  try {
    const [[evidencia]] = await pool.query(
      'SELECT archivo, id_autor FROM evidencias_fotograficas WHERE id_evidencia = ?', [req.params.id])
    if (!evidencia) return res.status(404).json({ message: 'Foto no encontrada' })

    if (evidencia.id_autor !== req.user.id && !await tieneAccion(req.user.rol, 'proyectos', 'eliminar')) {
      return res.status(403).json({ message: 'Solo el autor o quien puede eliminar proyectos puede borrar esta foto' })
    }

    await pool.query('DELETE FROM evidencias_fotograficas WHERE id_evidencia = ?', [req.params.id])
    await borrarArchivos([evidencia.archivo])
    res.json({ message: 'Foto eliminada' })
  } catch (err) {
    responderError(res, err, 'evidencias.remove', 'Error al eliminar la foto')
  }
}
