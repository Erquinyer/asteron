import pool from '../config/db.js'
import { hoyISO } from '../utils/dates.js'
import { ROLES_PROGRAMACION } from '../middlewares/requirePlantScheduler.js'
import { responderError } from '../utils/errores.js'

// Solo alertas accionables derivadas del estado real de los datos (nada de
// "log de actividad" tipo turno/proyecto creado, que no requiere acción y
// solo llenaba el panel de ruido). Cada una se recalcula en cada request y lleva
// el módulo del que depende: solo la ve quien tiene acceso a ese módulo. La tabla
// notificaciones_atendidas guarda las claves que cada usuario ya atendió.
const ORDEN_TIPO = { error: 0, warning: 1, info: 2 }

const MAX_NOTIFICACIONES = 30
const CLAVE_VALIDA = /^[a-z0-9-]{1,60}$/

const modulosDelRol = async (rol) => {
  const [rows] = await pool.query(
    `SELECT p.nombre FROM roles_permisos rp
     JOIN roles r ON r.id_rol = rp.id_rol
     JOIN permisos p ON p.id_permiso = rp.id_permiso
     WHERE r.nombre = ?`, [rol])
  return new Set(rows.map(r => r.nombre))
}

export const getNotificaciones = async (req, res) => {
  try {
    const notifs = []
    // Fecha local. Antes se usaba toISOString(), que convierte a UTC: en Colombia,
    // desde las 7 p. m. ya era "mañana" y los proyectos que vencían ese mismo día
    // aparecían como vencidos durante la noche.
    const hoy = hoyISO()

    // 1. Proyectos con fecha vencida que aún no están completados
    const [vencidos] = await pool.query(`
      SELECT p.id_proyecto, p.nombre, p.fecha_fin_estimada
      FROM proyectos p
      WHERE p.fecha_fin_estimada < ?
        AND EXISTS (
          SELECT 1 FROM fases_proyecto fp
          WHERE fp.id_proyecto = p.id_proyecto AND fp.estado != 'completada'
        )
      ORDER BY p.fecha_fin_estimada ASC`, [hoy])

    vencidos.forEach(p => notifs.push({
      id:     `proj-venc-${p.id_proyecto}`,
      modulo: 'proyectos',
      tipo:   'error',
      titulo: 'Proyecto vencido',
      mensaje: `"${p.nombre}" tenía entrega el ${new Date(p.fecha_fin_estimada).toLocaleDateString('es-CO')}`,
      link:   `/proyectos/${p.id_proyecto}`,
    }))

    // 2. Proyectos que vencen en los próximos 7 días
    const [proximos] = await pool.query(`
      SELECT p.id_proyecto, p.nombre, p.fecha_fin_estimada,
             DATEDIFF(p.fecha_fin_estimada, CURDATE()) AS dias_restantes
      FROM proyectos p
      WHERE p.fecha_fin_estimada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        AND EXISTS (
          SELECT 1 FROM fases_proyecto fp
          WHERE fp.id_proyecto = p.id_proyecto AND fp.estado != 'completada'
        )
      ORDER BY p.fecha_fin_estimada ASC`, [])

    proximos.forEach(p => notifs.push({
      id:      `proj-prox-${p.id_proyecto}`,
      modulo:  'proyectos',
      tipo:    'warning',
      titulo:  'Entrega próxima',
      mensaje: `"${p.nombre}" vence en ${p.dias_restantes} día${p.dias_restantes !== 1 ? 's' : ''}`,
      link:    `/proyectos/${p.id_proyecto}`,
    }))

    // 3. Máquinas en mantenimiento
    const [enMantto] = await pool.query(`
      SELECT id_maquina, nombre, codigo FROM maquinaria
      WHERE estado = 'en_mantenimiento'`)

    enMantto.forEach(m => notifs.push({
      id:      `maq-mantto-${m.id_maquina}`,
      modulo:  'maquinaria',
      tipo:    'warning',
      titulo:  'Equipo en mantenimiento',
      mensaje: `${m.codigo ? `[${m.codigo}] ` : ''}${m.nombre} fuera de servicio`,
      link:    '/maquinaria',
    }))

    // 4. Pedidos pendientes sin proyecto asignado
    const [[{ sin_proyecto }]] = await pool.query(`
      SELECT COUNT(*) AS sin_proyecto
      FROM pedidos p
      WHERE p.estado IN ('pendiente','en_proceso')
        AND NOT EXISTS (
          SELECT 1 FROM proyectos pr WHERE pr.id_pedido = p.id_pedido
        )`)

    if (sin_proyecto > 0) notifs.push({
      // La cantidad va en la clave: si aparece otro pedido, la alerta vuelve a mostrarse
      id:      `pedidos-sin-proyecto-${sin_proyecto}`,
      modulo:  'pedidos',
      tipo:    'info',
      titulo:  'Pedidos sin proyecto',
      mensaje: `${sin_proyecto} pedido${sin_proyecto > 1 ? 's' : ''} activo${sin_proyecto > 1 ? 's' : ''} sin proyecto asignado`,
      link:    '/pedidos',
    })

    // 5. Actividades en proceso que ya superaron su tiempo estimado. Quien no gestiona
    // la planta solo ve las suyas.
    const gestionaPlanta = ROLES_PROGRAMACION.includes(req.user.rol)
    const [enProceso] = await pool.query(`
      SELECT pp.id_programacion, pp.id_proyecto, pp.hora_inicio, pp.tiempo_estimado,
             u.nombre AS operario, pr.nombre AS proyecto
      FROM programacion_planta pp
      LEFT JOIN usuarios  u  ON u.id_usuario   = pp.id_operario
      LEFT JOIN proyectos pr ON pr.id_proyecto = pp.id_proyecto
      WHERE pp.estado = 'en_proceso' AND pp.hora_inicio IS NOT NULL AND pp.tiempo_estimado IS NOT NULL
        ${gestionaPlanta ? '' : 'AND pp.id_operario = ?'}`, gestionaPlanta ? [] : [req.user.id])

    const ahora = Date.now()
    enProceso.forEach(t => {
      const exceso = Math.round((ahora - new Date(t.hora_inicio).getTime()) / 60000) - t.tiempo_estimado
      if (exceso <= 0) return
      notifs.push({
        id:      `turno-excedido-${t.id_programacion}`,
        modulo:  'programacion',
        tipo:    'warning',
        titulo:  'Tiempo excedido',
        mensaje: `${t.operario || 'Sin operario'} · ${t.proyecto || 'Sin proyecto'}: ${exceso} min sobre lo estimado`,
        link:    t.id_proyecto ? `/programacion?proyecto=${t.id_proyecto}` : '/programacion',
      })
    })

    // 6. Fases que pasaron su fecha de fin sin completarse
    const [fasesRetrasadas] = await pool.query(`
      SELECT fp.id_fase_proyecto, fp.id_proyecto, fp.fecha_fin, fe.nombre AS fase,
             pr.nombre AS proyecto, dp.producto
      FROM fases_proyecto fp
      JOIN proyectos pr ON pr.id_proyecto = fp.id_proyecto
      LEFT JOIN fases_estandar fe ON fe.id_fase_estandar = fp.id_fase_estandar
      LEFT JOIN detalle_pedido dp ON dp.id_detalle = fp.id_detalle_pedido
      WHERE fp.fecha_fin < ? AND fp.estado != 'completada'
      ORDER BY fp.fecha_fin ASC`, [hoy])

    fasesRetrasadas.forEach(f => notifs.push({
      id:      `fase-retrasada-${f.id_fase_proyecto}`,
      modulo:  'proyectos',
      tipo:    'warning',
      titulo:  'Fase retrasada',
      mensaje: `${f.fase}${f.producto ? ` (${f.producto})` : ''} de "${f.proyecto}" debía terminar el ${new Date(f.fecha_fin).toLocaleDateString('es-CO')}`,
      link:    `/proyectos/${f.id_proyecto}`,
    }))

    // 7. Mantenimientos programados vencidos o que vencen en los próximos 7 días
    const [mantenimientos] = await pool.query(`
      SELECT mt.id_mantenimiento, mt.tipo, DATE_FORMAT(mt.fecha, '%Y-%m-%d') AS fecha,
             DATEDIFF(mt.fecha, ?) AS dias, m.nombre, m.codigo
      FROM mantenimientos mt
      JOIN maquinaria m ON m.id_maquina = mt.id_maquina
      WHERE mt.estado = 'programado' AND DATEDIFF(mt.fecha, ?) <= 7
      ORDER BY mt.fecha ASC`, [hoy, hoy])

    mantenimientos.forEach(m => {
      const equipo = `${m.codigo ? `[${m.codigo}] ` : ''}${m.nombre}`
      const vencido = m.dias < 0
      notifs.push({
        id:      `mantto-${vencido ? 'vencido' : 'proximo'}-${m.id_mantenimiento}`,
        modulo:  'mantenimientos',
        tipo:    vencido ? 'error' : 'warning',
        titulo:  vencido ? 'Mantenimiento vencido' : 'Mantenimiento próximo',
        mensaje: vencido
          ? `${equipo}: debió hacerse hace ${-m.dias} día${m.dias !== -1 ? 's' : ''}`
          : m.dias === 0 ? `${equipo}: programado para hoy`
          : `${equipo}: en ${m.dias} día${m.dias !== 1 ? 's' : ''}`,
        link:    '/mantenimientos',
      })
    })

    const modulos = req.user.rol === 'Administrador Sistema' ? null : await modulosDelRol(req.user.rol)
    const visibles = notifs.filter(n => !modulos || modulos.has(n.modulo))

    const [atendidas] = await pool.query(
      'SELECT clave FROM notificaciones_atendidas WHERE id_usuario = ?', [req.user.id])
    const clavesAtendidas = new Set(atendidas.map(a => a.clave))

    // Si una alerta atendida ya no aplica se olvida: si el problema reaparece
    // (ej. la máquina vuelve a mantenimiento), debe avisar de nuevo.
    const clavesActivas = visibles.map(n => n.id)
    const obsoletas = [...clavesAtendidas].filter(c => !clavesActivas.includes(c))
    if (obsoletas.length > 0) {
      await pool.query(
        'DELETE FROM notificaciones_atendidas WHERE id_usuario = ? AND clave IN (?)', [req.user.id, obsoletas])
    }

    const items = visibles
      .filter(n => !clavesAtendidas.has(n.id))
      .sort((a, b) => ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo])

    res.json({ total: items.length, items: items.slice(0, MAX_NOTIFICACIONES) })
  } catch (err) {
    responderError(res, err, { contexto: 'notificaciones.get', mensaje: 'Error al obtener notificaciones' })
  }
}

// POST /:clave/atender — el usuario deja de ver esta alerta
export const atenderNotificacion = async (req, res) => {
  const { clave } = req.params
  if (!CLAVE_VALIDA.test(clave)) return res.status(400).json({ message: 'Alerta no válida' })
  try {
    await pool.query(
      'INSERT IGNORE INTO notificaciones_atendidas (id_usuario, clave) VALUES (?,?)', [req.user.id, clave])
    res.json({ message: 'Alerta atendida' })
  } catch (err) {
    responderError(res, err, { contexto: 'notificaciones.atender', mensaje: 'Error al marcar la alerta' })
  }
}
