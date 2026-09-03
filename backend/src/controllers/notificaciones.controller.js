import pool from '../config/db.js'

// Solo alertas accionables derivadas del estado real de los datos (nada de
// "log de actividad" tipo turno/proyecto creado, que no requiere acción y
// solo llenaba el panel de ruido) — sin tabla de notificaciones ni estado
// leído/no leído, cada una se recalcula en cada request.
const ORDEN_TIPO = { error: 0, warning: 1, info: 2 }

export const getNotificaciones = async (_req, res) => {
  try {
    const notifs = []
    const hoy = new Date().toISOString().split('T')[0]

    // 1. Proyectos con fecha vencida que aún no están completados
    const [vencidos] = await pool.query(`
      SELECT p.id_proyecto, p.nombre, p.fecha_fin_estimada
      FROM proyectos p
      WHERE p.fecha_fin_estimada < ?
        AND EXISTS (
          SELECT 1 FROM fases_proyecto fp
          WHERE fp.id_proyecto = p.id_proyecto AND fp.estado != 'completada'
        )
      ORDER BY p.fecha_fin_estimada ASC
      LIMIT 5`, [hoy])

    vencidos.forEach(p => notifs.push({
      id:     `proj-venc-${p.id_proyecto}`,
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
      ORDER BY p.fecha_fin_estimada ASC
      LIMIT 5`, [])

    proximos.forEach(p => notifs.push({
      id:      `proj-prox-${p.id_proyecto}`,
      tipo:    'warning',
      titulo:  'Entrega próxima',
      mensaje: `"${p.nombre}" vence en ${p.dias_restantes} día${p.dias_restantes !== 1 ? 's' : ''}`,
      link:    `/proyectos/${p.id_proyecto}`,
    }))

    // 3. Máquinas en mantenimiento
    const [enMantto] = await pool.query(`
      SELECT id_maquina, nombre, codigo FROM maquinaria
      WHERE estado = 'en_mantenimiento'
      LIMIT 5`)

    enMantto.forEach(m => notifs.push({
      id:      `maq-mantto-${m.id_maquina}`,
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
      id:      'pedidos-sin-proyecto',
      tipo:    'info',
      titulo:  'Pedidos sin proyecto',
      mensaje: `${sin_proyecto} pedido${sin_proyecto > 1 ? 's' : ''} activo${sin_proyecto > 1 ? 's' : ''} sin proyecto asignado`,
      link:    '/pedidos',
    })

    notifs.sort((a, b) => ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo])

    res.json({ total: notifs.length, items: notifs })
  } catch (err) {
    console.error('[notificaciones.get]', err)
    res.status(500).json({ message: 'Error al obtener notificaciones' })
  }
}
