import { Readable } from 'node:stream'
import ExcelJS from 'exceljs'
import pool from '../config/db.js'

const norm = (s) => String(s ?? '').trim().toLowerCase()

// Acepta una fecha real de Excel (Date) o texto "AAAA-MM-DD". Usa componentes
// locales (no toISOString) para no desfasar el día por conversión a UTC.
export function celdaFecha(value) {
  if (value instanceof Date) {
    const y = value.getFullYear(), m = String(value.getMonth() + 1).padStart(2, '0'), d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

const COLUMNAS_REQUERIDAS = ['Fecha', 'Operario', 'Maquina']
export const COLUMNAS_PLANTILLA = ['Fecha', 'Operario', 'Maquina', 'Proyecto', 'Item', 'Fase', 'TiempoEstimado', 'Observaciones']

// Lee la primera hoja de un .xlsx o .csv y la convierte en { columnas, filas }.
// filas: [{ __fila, <encabezado>: valor }] — __fila es el número de fila real
// del archivo (para reportar errores legibles). Lanza un error legible si el
// archivo no tiene la estructura mínima esperada (evita un error por fila
// cuando en realidad el problema es que subieron el archivo equivocado).
export async function leerFilas(buffer, nombreArchivo) {
  const workbook = new ExcelJS.Workbook()
  if (/\.csv$/i.test(nombreArchivo || '')) {
    await workbook.csv.read(Readable.from(buffer))
  } else {
    await workbook.xlsx.load(buffer)
  }

  const hoja = workbook.worksheets[0]
  if (!hoja) return { columnas: [], filas: [] }

  const columnasPorIndice = {} // número de columna -> nombre de encabezado
  hoja.getRow(1).eachCell((cell, colNumber) => {
    columnasPorIndice[colNumber] = String(cell.value ?? '').trim()
  })
  const columnas = Object.values(columnasPorIndice).filter(Boolean)

  const faltantes = COLUMNAS_REQUERIDAS.filter(req =>
    !columnas.some(c => norm(c) === norm(req)))
  if (faltantes.length > 0) {
    throw new Error(
      `El archivo no tiene las columnas requeridas: ${faltantes.join(', ')}. Descarga la plantilla e intenta de nuevo.`)
  }

  const filas = []
  hoja.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj = {}
    let tieneDatos = false
    for (const [colNumber, nombre] of Object.entries(columnasPorIndice)) {
      if (!nombre) continue
      const valor = row.getCell(Number(colNumber)).value
      obj[nombre] = valor
      if (valor !== null && valor !== undefined && valor !== '') tieneDatos = true
    }
    if (tieneDatos) filas.push({ __fila: rowNumber, ...obj })
  })
  return { columnas, filas }
}

// Representación en texto plano de una fila cruda, lista para pintar en una
// tabla de previsualización (las fechas de Excel llegan como Date).
export function valoresParaMostrar(row) {
  const out = {}
  for (const col of COLUMNAS_PLANTILLA) {
    const valor = row[col]
    const texto = valor === null || valor === undefined ? '' : String(valor)
    out[col] = col === 'Fecha' ? (celdaFecha(valor) ?? texto) : texto
  }
  return out
}

// ── Detección de conflictos DENTRO del propio archivo (previsualización) ──
// Dos filas del mismo archivo pueden reservar el mismo operario/máquina el
// mismo día sin que ninguna exista aún en la BD — la validación por BD sola
// (validarTurnoInterno) no lo detecta porque ninguna se ha insertado todavía.
export const crearRegistroSimulado = () => ({ operarios: new Set(), maquinas: new Set() })
const claveSimulado = (id, fecha) => `${id}|${fecha}`
export const estaOcupadoSimulado = (sim, tipo, id, fecha) => sim[tipo].has(claveSimulado(id, fecha))
export const marcarOcupadoSimulado = (sim, tipo, id, fecha) => sim[tipo].add(claveSimulado(id, fecha))

// Carga una sola vez, antes de procesar el archivo, los catálogos necesarios
// para resolver nombres/códigos a IDs (evita una consulta por fila).
export async function cargarContexto() {
  const [operarios] = await pool.query(
    `SELECT u.id_usuario, u.codigo_empleado, u.nombre
     FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
     WHERE r.nombre = 'Operario' AND u.estado = 1`)
  const [maquinas] = await pool.query(
    `SELECT id_maquina, codigo, nombre FROM maquinaria WHERE estado IN ('activa','sin_asignar')`)
  const [proyectos] = await pool.query('SELECT id_proyecto, nombre FROM proyectos')
  return { operarios, maquinas, proyectos }
}

async function cargarFasesProyecto(id_proyecto) {
  const [fases] = await pool.query(`
    SELECT fp.id_fase_proyecto, fe.nombre AS fase_nombre, dp.producto AS item_producto
    FROM fases_proyecto fp
    JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
    LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
    WHERE fp.id_proyecto = ?`, [id_proyecto])
  return fases
}

// Resuelve una fila cruda del archivo a un payload para crearTurnoInterno.
// `fasesCache` (Map) se comparte entre todas las filas de un mismo import para
// no repetir la consulta de fases del mismo proyecto.
export async function resolverFila(row, ctx, fasesCache) {
  const fecha = celdaFecha(row.Fecha)
  if (!fecha) return { error: 'Fecha inválida o vacía (formato esperado: AAAA-MM-DD)' }

  const operarioTxt = norm(row.Operario)
  if (!operarioTxt) return { error: 'Falta el operario' }
  const operario = ctx.operarios.find(u =>
    norm(u.codigo_empleado) === operarioTxt || norm(u.nombre) === operarioTxt)
  if (!operario) return { error: `Operario "${row.Operario}" no encontrado (debe ser un operario activo)` }

  const maquinaTxt = norm(row.Maquina)
  if (!maquinaTxt) return { error: 'Falta la máquina' }
  const maquina = ctx.maquinas.find(m => norm(m.codigo) === maquinaTxt || norm(m.nombre) === maquinaTxt)
  if (!maquina) return { error: `Máquina "${row.Maquina}" no encontrada (debe estar activa)` }

  let id_proyecto = null
  let id_fase_proyecto = null
  const proyectoTxt = norm(row.Proyecto)
  if (proyectoTxt) {
    const proyecto = ctx.proyectos.find(p => norm(p.nombre) === proyectoTxt)
    if (!proyecto) return { error: `Proyecto "${row.Proyecto}" no encontrado` }
    id_proyecto = proyecto.id_proyecto

    const faseTxt = norm(row.Fase)
    if (faseTxt) {
      if (!fasesCache.has(id_proyecto)) fasesCache.set(id_proyecto, await cargarFasesProyecto(id_proyecto))
      const fases = fasesCache.get(id_proyecto)
      const itemTxt = norm(row.Item)
      const candidatas = fases.filter(f => norm(f.fase_nombre) === faseTxt &&
        (itemTxt ? norm(f.item_producto) === itemTxt : true))
      if (candidatas.length === 0) {
        return { error: `Fase "${row.Fase}" no encontrada en el proyecto "${row.Proyecto}"${itemTxt ? ` para el ítem "${row.Item}"` : ''}` }
      }
      if (candidatas.length > 1) {
        return { error: `Fase "${row.Fase}" es ambigua en "${row.Proyecto}" (existe en varios ítems) — especifica la columna Item` }
      }
      id_fase_proyecto = candidatas[0].id_fase_proyecto
    }
  }

  const tiempoNum = parseInt(row.TiempoEstimado, 10)
  const tiempo_estimado = Number.isFinite(tiempoNum) && tiempoNum > 0 ? tiempoNum : 480

  return {
    payload: {
      fecha,
      id_operario: operario.id_usuario,
      id_maquina: maquina.id_maquina,
      id_proyecto,
      id_fase_proyecto,
      tiempo_estimado,
      observaciones: row.Observaciones ? String(row.Observaciones).trim() : null,
    },
  }
}
