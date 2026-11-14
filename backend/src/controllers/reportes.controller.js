import pool from '../config/db.js'
import { hoyISO } from '../utils/dates.js'
import { enviarExcel, enviarPdf } from '../utils/exportarReporte.js'
import { ErrorHttp, responderError as responderErrorApi } from '../utils/errores.js'

// El costo de mano de obra revela lo que gana cada cargo: solo gerencia lo ve,
// aunque otros roles tengan acceso al módulo de reportes.
const ROLES_COSTOS = ['Gerente General', 'Administrador Sistema']
// Costo de mano de obra habilitado (RF-17): horas reales × valor hora del cargo.
// Un cargo sin valor hora se avisa como costo incompleto en vez de contarlo en cero.
const COSTOS_HABILITADOS = true
const puedeVerCostos = (req) => COSTOS_HABILITADOS && ROLES_COSTOS.includes(req.user?.rol)

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

// Por defecto, del primer día del mes en curso hasta hoy.
const leerRango = (query) => {
  const hoy = hoyISO()
  const desde = query.desde || `${hoy.slice(0, 7)}-01`
  const hasta = query.hasta || hoy
  if (!FECHA_ISO.test(desde) || !FECHA_ISO.test(hasta)) {
    throw new ErrorFiltro('Las fechas deben tener el formato AAAA-MM-DD')
  }
  if (desde > hasta) throw new ErrorFiltro('La fecha inicial no puede ser posterior a la final')
  return { desde, hasta }
}

// Un filtro inválido es un error del cliente (400), no del servidor
class ErrorFiltro extends ErrorHttp {
  constructor(message) { super(400, message) }
}

const responderError = (res, err, etiqueta, mensaje) =>
  responderErrorApi(res, err, { contexto: `reportes.${etiqueta}`, mensaje })

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d

// Costo de una actividad = horas reales × valor hora del cargo actual del operario.
// Sin tiempo real o sin valor hora queda en null: un costo de cero sería engañoso.
const costoActividad = (minutos, valorHora) =>
  minutos != null && valorHora != null ? redondear((minutos / 60) * valorHora) : null

const agrupar = (actividades, claveDe, etiquetaDe) => {
  const grupos = new Map()
  for (const a of actividades) {
    const clave = claveDe(a)
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        ...etiquetaDe(a), actividades: 0, sin_tiempo_real: 0, sin_valor_hora: 0,
        minutos_estimados: 0, minutos_reales: 0, minutos_estimados_con_real: 0, costo: 0,
      })
    }
    const g = grupos.get(clave)
    g.actividades++
    g.minutos_estimados += a.tiempo_estimado || 0
    if (a.tiempo_real == null) g.sin_tiempo_real++
    else {
      g.minutos_reales += a.tiempo_real
      g.minutos_estimados_con_real += a.tiempo_estimado || 0
      if (a.costo == null) g.sin_valor_hora++
      else g.costo = redondear(g.costo + a.costo)
    }
  }
  return [...grupos.values()].map(g => ({
    ...g,
    horas_estimadas: redondear(g.minutos_estimados / 60),
    horas_reales: redondear(g.minutos_reales / 60),
    // Solo compara actividades con tiempo real: incluir las aún sin terminar
    // haría parecer que la planta va por debajo de lo estimado.
    desviacion_horas: redondear((g.minutos_reales - g.minutos_estimados_con_real) / 60),
  })).sort((a, b) => b.minutos_reales - a.minutos_reales)
}

const datosHoras = async (query, verCostos) => {
  const { desde, hasta } = leerRango(query)
  const filtros = ['pp.fecha BETWEEN ? AND ?', "pp.estado != 'cancelado'"]
  const valores = [desde, hasta]
  if (query.id_proyecto) { filtros.push('pp.id_proyecto = ?'); valores.push(query.id_proyecto) }
  if (query.id_operario) { filtros.push('pp.id_operario = ?'); valores.push(query.id_operario) }

  const [filas] = await pool.query(`
    SELECT pp.id_programacion, DATE_FORMAT(pp.fecha, '%Y-%m-%d') AS fecha, pp.estado,
           pp.tiempo_estimado, pp.tiempo_real, pp.hora_inicio, pp.hora_fin,
           u.id_usuario AS id_operario, u.nombre AS operario, r.nombre AS cargo, r.valor_hora,
           pr.id_proyecto, pr.nombre AS proyecto, pr.id_pedido,
           fe.nombre AS fase, dp.producto AS item_producto
    FROM programacion_planta pp
    LEFT JOIN usuarios       u  ON u.id_usuario        = pp.id_operario
    LEFT JOIN roles          r  ON r.id_rol            = u.id_rol
    LEFT JOIN proyectos      pr ON pr.id_proyecto      = pp.id_proyecto
    LEFT JOIN fases_proyecto fp ON fp.id_fase_proyecto = pp.id_fase_proyecto
    LEFT JOIN fases_estandar fe ON fe.id_fase_estandar = fp.id_fase_estandar
    LEFT JOIN detalle_pedido dp ON dp.id_detalle       = fp.id_detalle_pedido
    WHERE ${filtros.join(' AND ')}
    ORDER BY pp.fecha DESC, pp.id_programacion DESC`, valores)

  const actividades = filas.map(({ valor_hora, ...f }) => ({
    ...f,
    horas_estimadas: f.tiempo_estimado != null ? redondear(f.tiempo_estimado / 60) : null,
    horas_reales: f.tiempo_real != null ? redondear(f.tiempo_real / 60) : null,
    costo: costoActividad(f.tiempo_real, valor_hora != null ? Number(valor_hora) : null),
  }))

  const porTrabajador = agrupar(actividades, a => a.id_operario ?? 'sin',
    a => ({ operario: a.operario || 'Sin operario', cargo: a.cargo || '—' }))
  const porProyecto = agrupar(actividades, a => a.id_proyecto ?? 'sin',
    a => ({ proyecto: a.proyecto || 'Sin proyecto' }))
  const porPedido = agrupar(actividades.filter(a => a.id_pedido), a => a.id_pedido,
    a => ({ pedido: `OP-${a.id_pedido}`, proyecto: a.proyecto }))
  const totales = agrupar(actividades, () => 'total', () => ({}))[0] ?? {
    actividades: 0, sin_tiempo_real: 0, sin_valor_hora: 0, horas_estimadas: 0, horas_reales: 0, desviacion_horas: 0, costo: 0,
  }

  const sinCostos = ({ costo, sin_valor_hora, ...resto }) => resto
  const limpiar = verCostos ? (x => x) : sinCostos
  return {
    desde, hasta, ver_costos: verCostos,
    totales: limpiar(totales),
    por_trabajador: porTrabajador.map(limpiar),
    por_proyecto: porProyecto.map(limpiar),
    por_pedido: porPedido.map(limpiar),
    actividades: actividades.map(a => { if (verCostos) return a; const { costo, ...r } = a; return r }),
  }
}

const datosAvance = async (query) => {
  const filtros = []
  const valores = []
  if (query.id_proyecto) { filtros.push('pr.id_proyecto = ?'); valores.push(query.id_proyecto) }
  const [filas] = await pool.query(`
    SELECT pr.id_proyecto, pr.nombre AS proyecto, pr.prioridad, pr.id_pedido, c.nombre AS cliente,
           DATE_FORMAT(pr.fecha_inicio, '%Y-%m-%d') AS fecha_inicio,
           DATE_FORMAT(pr.fecha_fin_estimada, '%Y-%m-%d') AS fecha_fin_estimada,
           COUNT(fp.id_fase_proyecto) AS total_fases,
           COALESCE(SUM(fp.estado = 'completada'), 0) AS fases_completadas,
           COALESCE(SUM(fp.estado = 'en_curso'), 0) AS fases_en_curso,
           COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance
    FROM proyectos pr
    LEFT JOIN pedidos        pe ON pe.id_pedido  = pr.id_pedido
    LEFT JOIN clientes       c  ON c.id_cliente  = pe.id_cliente
    LEFT JOIN fases_proyecto fp ON fp.id_proyecto = pr.id_proyecto
    ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
    GROUP BY pr.id_proyecto
    ORDER BY pr.fecha_fin_estimada IS NULL, pr.fecha_fin_estimada`, valores)

  const hoy = hoyISO()
  return {
    proyectos: filas.map(f => {
      const total = Number(f.total_fases)
      const completadas = Number(f.fases_completadas)
      const terminado = total > 0 && completadas === total
      return {
        ...f,
        total_fases: total, fases_completadas: completadas,
        fases_en_curso: Number(f.fases_en_curso), avance: Number(f.avance),
        estado: terminado ? 'completado' : (completadas || Number(f.fases_en_curso)) ? 'en_curso' : 'pendiente',
        vencido: !terminado && Boolean(f.fecha_fin_estimada) && f.fecha_fin_estimada < hoy,
      }
    }),
  }
}

const datosMantenimientos = async (query) => {
  const { desde, hasta } = leerRango(query)
  const filtrosEquipo = []
  const valoresEquipo = []
  if (query.id_maquina) { filtrosEquipo.push('mt.id_maquina = ?'); valoresEquipo.push(query.id_maquina) }
  if (query.tipo)       { filtrosEquipo.push('mt.tipo = ?');       valoresEquipo.push(query.tipo) }
  const filtros = ["mt.estado = 'realizado'", 'mt.fecha BETWEEN ? AND ?', ...filtrosEquipo]
  const valores = [desde, hasta, ...valoresEquipo]
  const [mantenimientos] = await pool.query(`
    SELECT mt.id_mantenimiento, DATE_FORMAT(mt.fecha, '%Y-%m-%d') AS fecha, mt.tipo, mt.descripcion,
           m.nombre AS maquina, m.codigo AS maquina_codigo, u.nombre AS tecnico
    FROM mantenimientos mt
    LEFT JOIN maquinaria m ON m.id_maquina = mt.id_maquina
    LEFT JOIN usuarios   u ON u.id_usuario = mt.realizado_por
    WHERE ${filtros.join(' AND ')}
    ORDER BY mt.fecha DESC`, valores)
  const por_tipo = { preventivo: 0, correctivo: 0, calibracion: 0, predictivo: 0 }
  for (const m of mantenimientos) por_tipo[m.tipo]++
  // Los programados no dependen del periodo: importa lo que está por venir o vencido.
  const [programados] = await pool.query(`
    SELECT mt.id_mantenimiento, DATE_FORMAT(mt.fecha, '%Y-%m-%d') AS fecha, mt.tipo, mt.descripcion,
           m.nombre AS maquina, m.codigo AS maquina_codigo
    FROM mantenimientos mt
    LEFT JOIN maquinaria m ON m.id_maquina = mt.id_maquina
    WHERE ${["mt.estado = 'programado'", ...filtrosEquipo].join(' AND ')}
    ORDER BY mt.fecha ASC`, valoresEquipo)
  const hoy = hoyISO()
  return {
    desde, hasta, total: mantenimientos.length, por_tipo, mantenimientos,
    programados: programados.map(p => ({ ...p, situacion: p.fecha < hoy ? 'Vencido' : 'Programado' })),
  }
}

export const getHoras = async (req, res) => {
  try { res.json(await datosHoras(req.query, puedeVerCostos(req))) }
  catch (err) { responderError(res, err, 'getHoras', 'Error al generar el reporte de horas') }
}

export const getAvance = async (req, res) => {
  try { res.json(await datosAvance(req.query)) }
  catch (err) { responderError(res, err, 'getAvance', 'Error al generar el reporte de avance') }
}

export const getMantenimientos = async (req, res) => {
  try { res.json(await datosMantenimientos(req.query)) }
  catch (err) { responderError(res, err, 'getMantenimientos', 'Error al generar el reporte de mantenimientos') }
}

// ── Exportación ──────────────────────────────────────────────────────────
const COLUMNAS_GRUPO = (verCostos) => [
  { clave: 'actividades',     titulo: 'Actividades', ancho: 11 },
  { clave: 'horas_estimadas', titulo: 'Horas est.',  ancho: 11 },
  { clave: 'horas_reales',    titulo: 'Horas reales', ancho: 12 },
  ...(verCostos ? [{ clave: 'costo', titulo: 'Costo (COP)', ancho: 15 }] : []),
]

const seccionesHoras = (d) => {
  const grupo = COLUMNAS_GRUPO(d.ver_costos)
  return [
    { titulo: 'Por trabajador', filas: d.por_trabajador, columnas: [
      { clave: 'operario', titulo: 'Trabajador', ancho: 26 }, { clave: 'cargo', titulo: 'Cargo', ancho: 24 }, ...grupo] },
    { titulo: 'Por OP', filas: d.por_pedido, columnas: [
      { clave: 'pedido', titulo: 'OP', ancho: 10 }, { clave: 'proyecto', titulo: 'Proyecto', ancho: 36 }, ...grupo] },
    { titulo: 'Por proyecto', filas: d.por_proyecto, columnas: [
      { clave: 'proyecto', titulo: 'Proyecto', ancho: 40 }, ...grupo] },
    { titulo: 'Por actividad', filas: d.actividades, columnas: [
      { clave: 'fecha', titulo: 'Fecha', ancho: 11 }, { clave: 'operario', titulo: 'Trabajador', ancho: 22 },
      { clave: 'proyecto', titulo: 'Proyecto', ancho: 26 }, { clave: 'fase', titulo: 'Fase', ancho: 20 },
      { clave: 'item_producto', titulo: 'Ítem', ancho: 22 }, { clave: 'estado', titulo: 'Estado', ancho: 11 },
      { clave: 'horas_estimadas', titulo: 'Horas est.', ancho: 9 }, { clave: 'horas_reales', titulo: 'Horas reales', ancho: 9 },
      ...(d.ver_costos ? [{ clave: 'costo', titulo: 'Costo (COP)', ancho: 12 }] : [])] },
  ]
}

const REPORTES = {
  horas: {
    titulo: 'Reporte de horas de mano de obra',
    obtener: (req) => datosHoras(req.query, puedeVerCostos(req)),
    secciones: seccionesHoras,
    periodo: (d) => `Periodo: ${d.desde} a ${d.hasta}`,
  },
  avance: {
    titulo: 'Reporte de avance de proyectos',
    obtener: (req) => datosAvance(req.query),
    secciones: (d) => [{ titulo: 'Proyectos', filas: d.proyectos, columnas: [
      { clave: 'proyecto', titulo: 'Proyecto', ancho: 34 }, { clave: 'cliente', titulo: 'Cliente', ancho: 24 },
      { clave: 'prioridad', titulo: 'Prioridad', ancho: 10 }, { clave: 'estado', titulo: 'Estado', ancho: 12 },
      { clave: 'avance', titulo: 'Avance %', ancho: 10 }, { clave: 'fases_completadas', titulo: 'Fases compl.', ancho: 11 },
      { clave: 'total_fases', titulo: 'Fases', ancho: 8 }, { clave: 'fecha_fin_estimada', titulo: 'Entrega est.', ancho: 12 },
    ] }],
    periodo: () => `Corte: ${hoyISO()}`,
  },
  mantenimientos: {
    titulo: 'Reporte de mantenimientos',
    obtener: (req) => datosMantenimientos(req.query),
    secciones: (d) => [
      { titulo: 'Realizados', filas: d.mantenimientos, columnas: [
        { clave: 'fecha', titulo: 'Fecha', ancho: 12 }, { clave: 'maquina_codigo', titulo: 'Código', ancho: 10 },
        { clave: 'maquina', titulo: 'Equipo', ancho: 30 }, { clave: 'tipo', titulo: 'Tipo', ancho: 12 },
        { clave: 'tecnico', titulo: 'Técnico', ancho: 24 }, { clave: 'descripcion', titulo: 'Descripción', ancho: 44 },
      ] },
      { titulo: 'Programados', filas: d.programados, columnas: [
        { clave: 'fecha', titulo: 'Fecha prevista', ancho: 13 }, { clave: 'situacion', titulo: 'Situación', ancho: 12 },
        { clave: 'maquina_codigo', titulo: 'Código', ancho: 10 }, { clave: 'maquina', titulo: 'Equipo', ancho: 30 },
        { clave: 'tipo', titulo: 'Tipo', ancho: 12 }, { clave: 'descripcion', titulo: 'Descripción', ancho: 44 },
      ] },
    ],
    periodo: (d) => `Periodo: ${d.desde} a ${d.hasta}`,
  },
}

export const exportar = async (req, res) => {
  const reporte = REPORTES[req.params.tipo]
  const formato = req.query.formato
  if (!reporte) return res.status(404).json({ message: 'Reporte no encontrado' })
  if (!['xlsx', 'pdf'].includes(formato)) return res.status(400).json({ message: 'Formato no válido' })
  try {
    const datos = await reporte.obtener(req)
    const contenido = {
      titulo: reporte.titulo,
      periodo: reporte.periodo(datos),
      secciones: reporte.secciones(datos),
      archivo: `reporte_${req.params.tipo}_${hoyISO()}`,
    }
    await (formato === 'xlsx' ? enviarExcel : enviarPdf)(res, contenido)
  } catch (err) {
    if (res.headersSent) { console.error('[reportes.exportar]', err); return res.end() }
    responderError(res, err, 'exportar', 'Error al exportar el reporte')
  }
}
