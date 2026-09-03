import pool from '../config/db.js'

// Ejecuta un bloque de la respuesta de forma aislada: si falla, el resto del
// dashboard sigue funcionando y esa tarjeta específica llega en null.
const safeBlock = async (fn, label) => {
  try {
    return await fn()
  } catch (err) {
    console.error(`[dashboard.getStats:${label}]`, err)
    return null
  }
}

export const getStats = async (_req, res) => {
  try {
    const stats = await safeBlock(async () => {
      const [[proy]] = await pool.query(`SELECT COUNT(*) as total, SUM(prioridad='alta') as alta FROM proyectos`)
      const [[ped]]  = await pool.query(`SELECT COUNT(*) as total, SUM(estado='pendiente') as pendientes FROM pedidos`)
      const [[maq]]  = await pool.query(`SELECT COUNT(*) as total, SUM(estado='activa') as activas FROM maquinaria`)
      const [[usr]]  = await pool.query(`SELECT COUNT(*) as total, SUM(estado=1) as activos FROM usuarios`)
      return {
        proyectos:  { total: Number(proy.total), destacado: Number(proy.alta),      label: 'prioridad alta' },
        pedidos:    { total: Number(ped.total),  destacado: Number(ped.pendientes), label: 'pendientes'     },
        maquinaria: { total: Number(maq.total),  destacado: Number(maq.activas),    label: 'activas'        },
        usuarios:   { total: Number(usr.total),  destacado: Number(usr.activos),    label: 'activos'        },
      }
    }, 'stats')

    // Proyectos en curso: responsable, fase actual y fecha límite primero
    const recientes = await safeBlock(async () => {
      const [rows] = await pool.query(`
        SELECT p.id_proyecto, p.nombre, p.prioridad, p.fecha_fin_estimada,
               c.nombre AS cliente,
               u.nombre AS responsable,
               COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance,
               CASE
                 WHEN COUNT(fp.id_fase_proyecto) = 0 THEN 'pendiente'
                 WHEN SUM(fp.estado = 'completada') = COUNT(fp.id_fase_proyecto) THEN 'completada'
                 WHEN SUM(fp.estado = 'en_curso')   > 0 THEN 'en_curso'
                 ELSE 'pendiente'
               END AS estado,
               (SELECT fe.nombre FROM fases_proyecto fp2
                JOIN fases_estandar fe ON fe.id_fase_estandar = fp2.id_fase_estandar
                WHERE fp2.id_proyecto = p.id_proyecto AND fp2.estado = 'en_curso'
                ORDER BY fe.orden ASC LIMIT 1) AS fase_actual
        FROM proyectos p
        LEFT JOIN pedidos   pe ON p.id_pedido = pe.id_pedido
        LEFT JOIN clientes  c  ON pe.id_cliente = c.id_cliente
        LEFT JOIN usuarios  u  ON p.id_usuario_responsable = u.id_usuario
        LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
        GROUP BY p.id_proyecto, p.nombre, p.prioridad, p.fecha_fin_estimada, c.nombre, u.nombre
        ORDER BY p.fecha_fin_estimada ASC
        LIMIT 6`)
      return rows
    }, 'recientes')

    // Programación de hoy (operario puede ser null: turno sin asignar)
    const planta = await safeBlock(async () => {
      const [rows] = await pool.query(`
        SELECT pp.id_programacion, pp.estado, pp.tiempo_estimado, pp.tiempo_real, pp.updated_at,
               pp.observaciones,
               u.nombre AS operario, m.nombre AS maquina, m.codigo AS maquina_codigo, pr.nombre AS proyecto,
               fe.nombre AS fase_nombre, dp.producto AS item_producto
        FROM programacion_planta pp
        LEFT JOIN usuarios       u  ON pp.id_operario      = u.id_usuario
        LEFT JOIN maquinaria     m  ON pp.id_maquina       = m.id_maquina
        LEFT JOIN proyectos      pr ON pp.id_proyecto      = pr.id_proyecto
        LEFT JOIN fases_proyecto fp ON pp.id_fase_proyecto = fp.id_fase_proyecto
        LEFT JOIN fases_estandar fe ON fp.id_fase_estandar = fe.id_fase_estandar
        LEFT JOIN detalle_pedido dp ON fp.id_detalle_pedido = dp.id_detalle
        WHERE pp.fecha = CURDATE()
        ORDER BY FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`)
      return rows
    }, 'planta')

    const charts = await safeBlock(async () => {
      // 14 días de historial: alcanza para armar tanto la serie de 7 días como la de 2 semanas
      const [produccionRaw] = await pool.query(`
        SELECT
          DATE_FORMAT(pp.fecha, '%Y-%m-%d')               AS fecha_str,
          ROUND(SUM(pp.tiempo_estimado) / 60, 1)          AS programado,
          ROUND(SUM(COALESCE(pp.tiempo_real, 0)) / 60, 1) AS real_h
        FROM programacion_planta pp
        WHERE pp.fecha >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
          AND pp.fecha <= CURDATE()
        GROUP BY pp.fecha
        ORDER BY pp.fecha`)

      const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const buildSerie = (dias) => {
        const serie = []
        for (let i = dias - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const found = produccionRaw.find(r => r.fecha_str === ymd)
          serie.push({
            name:       DAYS[d.getDay()],
            programado: found ? Number(found.programado) : 0,
            real:       found ? Number(found.real_h)     : 0,
          })
        }
        return serie
      }
      const produccion7dias  = buildSerie(7)
      const produccion14dias = buildSerie(14)

      const [porEstadoProyecto] = await pool.query(`
        SELECT estado AS name, COUNT(*) AS value FROM (
          SELECT p.id_proyecto,
            CASE
              WHEN SUM(fp.estado = 'en_curso')   > 0                                            THEN 'en_proceso'
              WHEN COUNT(fp.id_fase_proyecto)    > 0
                AND SUM(fp.estado = 'completada') = COUNT(fp.id_fase_proyecto)                  THEN 'completado'
              ELSE 'pendiente'
            END AS estado
          FROM proyectos p
          LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
          GROUP BY p.id_proyecto
        ) subq
        GROUP BY estado`)

      const [[{ avance_promedio }]] = await pool.query(`
        SELECT ROUND(AVG(avance)) AS avance_promedio FROM (
          SELECT p.id_proyecto, COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance
          FROM proyectos p
          LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
          GROUP BY p.id_proyecto
        ) proy`)

      return {
        produccion7dias, produccion14dias, porEstadoProyecto,
        avancePromedio: Number(avance_promedio) || 0,
      }
    }, 'charts')

    // KPIs accionables de la tira superior
    const kpis = await safeBlock(async () => {
      const [[turnos]] = await pool.query(`
        SELECT COUNT(*) AS total,
               SUM(estado = 'en_proceso') AS en_curso,
               SUM(id_operario IS NULL)   AS sin_operario
        FROM programacion_planta
        WHERE fecha = CURDATE()`)

      const [[carga]] = await pool.query(`
        SELECT
          ROUND(SUM(CASE WHEN fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            THEN tiempo_estimado ELSE 0 END) / 60, 1) AS prog_actual,
          ROUND(SUM(CASE WHEN fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            THEN tiempo_real ELSE 0 END) / 60, 1) AS real_actual,
          ROUND(SUM(CASE WHEN fecha BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            THEN tiempo_estimado ELSE 0 END) / 60, 1) AS prog_anterior,
          ROUND(SUM(CASE WHEN fecha BETWEEN DATE_SUB(CURDATE(), INTERVAL 13 DAY) AND DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            THEN tiempo_real ELSE 0 END) / 60, 1) AS real_anterior
        FROM programacion_planta
        WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)`)

      const progActual   = Number(carga.prog_actual)   || 0
      const progAnterior = Number(carga.prog_anterior) || 0
      const pctActual    = progActual   > 0 ? Math.round((Number(carga.real_actual)   / progActual)   * 100) : 0
      const pctAnterior  = progAnterior > 0 ? Math.round((Number(carga.real_anterior) / progAnterior) * 100) : 0

      const [[riesgo]] = await pool.query(`
        SELECT
          SUM(fecha_fin_estimada < CURDATE() AND avance < 100) AS vencidos,
          SUM(fecha_fin_estimada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY) AND avance < 90) AS por_vencer
        FROM (
          SELECT p.id_proyecto, p.fecha_fin_estimada,
                 COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance
          FROM proyectos p
          LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
          WHERE p.fecha_fin_estimada IS NOT NULL
          GROUP BY p.id_proyecto, p.fecha_fin_estimada
        ) proy`)

      const [[maq]] = await pool.query(`SELECT COUNT(*) AS total, SUM(estado = 'activa') AS activas FROM maquinaria`)
      const maqTotal   = Number(maq.total) || 0
      const maqActivas = Number(maq.activas) || 0

      return {
        turnosHoy: {
          total: Number(turnos.total), enCurso: Number(turnos.en_curso), sinOperario: Number(turnos.sin_operario),
        },
        cumplimiento: {
          pct: pctActual, horasReales: Number(carga.real_actual) || 0, horasProgramadas: progActual,
          deltaPct: pctActual - pctAnterior,
        },
        riesgo: {
          total:     (Number(riesgo.vencidos) || 0) + (Number(riesgo.por_vencer) || 0),
          vencidos:  Number(riesgo.vencidos) || 0,
          porVencer: Number(riesgo.por_vencer) || 0,
        },
        capacidad: {
          activos: maqActivas, total: maqTotal,
          pct: maqTotal > 0 ? Math.round((maqActivas / maqTotal) * 100) : 0,
        },
      }
    }, 'kpis')

    // Requiere atención: alertas derivadas de datos existentes, sin endpoints nuevos
    const alertas = await safeBlock(async () => {
      const items = []

      const [vencidos] = await pool.query(`
        SELECT p.id_proyecto, p.nombre, p.fecha_fin_estimada,
               COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance
        FROM proyectos p
        LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
        WHERE p.fecha_fin_estimada < CURDATE()
        GROUP BY p.id_proyecto, p.nombre, p.fecha_fin_estimada
        HAVING avance < 100
        ORDER BY p.fecha_fin_estimada ASC
        LIMIT 5`)
      vencidos.forEach(p => items.push({
        tipo: 'proyecto_vencido', severidad: 'error',
        titulo: `${p.nombre} vencido`,
        meta:   `Entrega estimada ${new Date(p.fecha_fin_estimada).toLocaleDateString('es-CO')} · ${p.avance}% de avance`,
        ruta:   `/proyectos/${p.id_proyecto}`,
      }))

      const [porVencer] = await pool.query(`
        SELECT p.id_proyecto, p.nombre, p.fecha_fin_estimada,
               COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance,
               DATEDIFF(p.fecha_fin_estimada, CURDATE()) AS dias
        FROM proyectos p
        LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
        WHERE p.fecha_fin_estimada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
        GROUP BY p.id_proyecto, p.nombre, p.fecha_fin_estimada
        HAVING avance < 90
        ORDER BY p.fecha_fin_estimada ASC
        LIMIT 5`)
      porVencer.forEach(p => items.push({
        tipo: 'proyecto_por_vencer', severidad: 'warning',
        titulo: `${p.nombre} vence en ${p.dias} día${p.dias !== 1 ? 's' : ''}`,
        meta:   `${p.avance}% de avance`,
        ruta:   `/proyectos/${p.id_proyecto}`,
      }))

      const [sinOperario] = await pool.query(`
        SELECT pp.id_programacion, m.nombre AS maquina, pr.nombre AS proyecto
        FROM programacion_planta pp
        LEFT JOIN maquinaria m  ON pp.id_maquina  = m.id_maquina
        LEFT JOIN proyectos  pr ON pp.id_proyecto = pr.id_proyecto
        WHERE pp.fecha = CURDATE() AND pp.id_operario IS NULL AND pp.estado != 'cancelado'
        LIMIT 5`)
      sinOperario.forEach(t => items.push({
        tipo: 'turno_sin_operario', severidad: 'error',
        titulo: 'Turno sin operario asignado',
        meta:   `${t.maquina || 'Máquina sin asignar'}${t.proyecto ? ` · ${t.proyecto}` : ''}`,
        ruta:   '/programacion',
      }))

      const [pedidosEstancados] = await pool.query(`
        SELECT id_pedido, TIMESTAMPDIFF(HOUR, created_at, NOW()) AS horas
        FROM pedidos
        WHERE estado = 'pendiente' AND TIMESTAMPDIFF(HOUR, created_at, NOW()) > 72
        ORDER BY created_at ASC
        LIMIT 5`)
      pedidosEstancados.forEach(p => {
        const dias = Math.floor(p.horas / 24)
        items.push({
          tipo: 'pedido_estancado', severidad: 'warning',
          titulo: `Pedido #${p.id_pedido} sin avance`,
          meta:   `Pendiente hace ${dias} día${dias !== 1 ? 's' : ''}`,
          ruta:   '/pedidos',
        })
      })

      const [[maqTotales]] = await pool.query(`SELECT COUNT(*) AS total, SUM(estado = 'activa') AS activas FROM maquinaria`)
      const total   = Number(maqTotales.total) || 0
      const activas = Number(maqTotales.activas) || 0
      if (total > 0) {
        const pctInactivos = Math.round(((total - activas) / total) * 100)
        if (pctInactivos > 20) {
          items.push({
            tipo: 'equipos_inactivos', severidad: 'info',
            titulo: `${pctInactivos}% de los equipos están inactivos`,
            meta:   `${total - activas} de ${total} equipos`,
            ruta:   '/maquinaria',
          })
        }
      }

      const orden = { error: 0, warning: 1, info: 2 }
      items.sort((a, b) => orden[a.severidad] - orden[b.severidad])
      return items
    }, 'alertas')

    res.json({ stats, recientes, planta, charts, kpis, alertas })
  } catch (err) {
    console.error('[dashboard.getStats]', err)
    res.status(500).json({ message: 'Error al obtener estadísticas' })
  }
}

export const getCounts = async (_req, res) => {
  try {
    const [[r]] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM proyectos)                          AS proyectos,
        (SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente') AS pedidos
    `)
    res.json({ proyectos: Number(r.proyectos), pedidos: Number(r.pedidos) })
  } catch (err) {
    console.error('[dashboard.getCounts]', err)
    res.status(500).json({ message: 'Error' })
  }
}
