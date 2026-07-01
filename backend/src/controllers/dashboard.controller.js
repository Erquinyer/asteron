import pool from '../config/db.js'

export const getStats = async (_req, res) => {
  try {
    const [[proy]]  = await pool.query(`SELECT COUNT(*) as total, SUM(prioridad='alta') as alta FROM proyectos`)
    const [[ped]]   = await pool.query(`SELECT COUNT(*) as total, SUM(estado='pendiente') as pendientes FROM pedidos`)
    const [[maq]]   = await pool.query(`SELECT COUNT(*) as total, SUM(estado='activa') as activas FROM maquinaria`)
    const [[usr]]   = await pool.query(`SELECT COUNT(*) as total, SUM(estado=1) as activos FROM usuarios`)

    // Proyectos recientes con cliente (via pedido) y avance medio de fases
    const [recientes] = await pool.query(`
      SELECT p.id_proyecto, p.nombre, p.prioridad, p.fecha_fin_estimada,
             c.nombre AS cliente,
             u.nombre AS responsable,
             COALESCE(ROUND(AVG(fp.porcentaje_avance)), 0) AS avance,
             CASE
               WHEN COUNT(fp.id_fase_proyecto) = 0 THEN 'pendiente'
               WHEN SUM(fp.estado = 'completada') = COUNT(fp.id_fase_proyecto) THEN 'completada'
               WHEN SUM(fp.estado = 'en_curso')   > 0 THEN 'en_curso'
               ELSE 'pendiente'
             END AS estado
      FROM proyectos p
      LEFT JOIN pedidos   pe ON p.id_pedido = pe.id_pedido
      LEFT JOIN clientes  c  ON pe.id_cliente = c.id_cliente
      LEFT JOIN usuarios  u  ON p.id_usuario_responsable = u.id_usuario
      LEFT JOIN fases_proyecto fp ON fp.id_proyecto = p.id_proyecto
      GROUP BY p.id_proyecto, p.nombre, p.prioridad, p.fecha_fin_estimada, c.nombre, u.nombre
      ORDER BY p.created_at DESC
      LIMIT 5`)

    // Programación de hoy
    const [planta] = await pool.query(`
      SELECT pp.id_programacion, pp.estado, pp.tiempo_estimado, pp.tiempo_real,
             u.nombre AS operario, m.nombre AS maquina, pr.nombre AS proyecto
      FROM programacion_planta pp
      LEFT JOIN usuarios   u  ON pp.id_operario  = u.id_usuario
      LEFT JOIN maquinaria m  ON pp.id_maquina   = m.id_maquina
      LEFT JOIN proyectos  pr ON pp.id_proyecto  = pr.id_proyecto
      WHERE pp.fecha = CURDATE()
      ORDER BY FIELD(pp.estado,'en_proceso','programado','completado','cancelado')`)

    // Carga de producción: horas estimadas vs. reales por día (últimos 7 días)
    const [produccionRaw] = await pool.query(`
      SELECT
        DATE_FORMAT(pp.fecha, '%Y-%m-%d')            AS fecha_str,
        ROUND(SUM(pp.tiempo_estimado) / 60, 1)       AS programado,
        ROUND(SUM(COALESCE(pp.tiempo_real, 0)) / 60, 1) AS real_h
      FROM programacion_planta pp
      WHERE pp.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        AND pp.fecha <= CURDATE()
      GROUP BY pp.fecha
      ORDER BY pp.fecha`)

    const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const produccion7dias = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const found = produccionRaw.find(r => r.fecha_str === ymd)
      produccion7dias.push({
        name:       DAYS[d.getDay()],
        programado: found ? Number(found.programado) : 0,
        real:       found ? Number(found.real_h)     : 0,
      })
    }

    // Proyectos por estado (computado desde fases)
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

    res.json({
      stats: {
        proyectos: { total: Number(proy.total), destacado: Number(proy.alta),       label: 'prioridad alta' },
        pedidos:   { total: Number(ped.total),  destacado: Number(ped.pendientes),  label: 'pendientes'     },
        maquinaria:{ total: Number(maq.total),  destacado: Number(maq.activas),     label: 'activas'        },
        usuarios:  { total: Number(usr.total),  destacado: Number(usr.activos),     label: 'activos'        },
      },
      recientes,
      planta,
      charts: { produccion7dias, porEstadoProyecto },
    })
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
