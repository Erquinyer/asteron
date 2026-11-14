import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { getCounts, getStats } from '../src/controllers/dashboard.controller.js'
import { crearRes } from './helpers/express.js'

// Unidad — Dashboard (RF-31): indicadores, gráficas y alertas del panel principal.
// BD: FAKE que responde según la consulta, para no depender del orden de las 15 consultas.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Cada entrada: [fragmento de la consulta, filas]. Se revisan en orden: lo más específico primero.
const respuestas = () => [
  ["prioridad='alta'", [[{ total: 5, alta: 2 }]]],
  ["SUM(estado='pendiente') as pendientes", [[{ total: 4, pendientes: 1 }]]],
  ['SUM(estado=1) as activos', [[{ total: 13, activos: 12 }]]],
  ['FROM maquinaria', [[{ total: 10, activas: 7 }]]],
  ['LIMIT 6', [[{ id_proyecto: 1, nombre: 'Góndolas', avance: 40, estado: 'en_curso' }]]],
  ['ORDER BY FIELD(pp.estado', [[{ id_programacion: 4, estado: 'en_proceso', operario: 'Angie' }]]],
  ['AS fecha_str', [[{ fecha_str: hoy(), programado: '8.0', real_h: '6.5' }]]],
  ['AS name, COUNT(*) AS value', [[{ name: 'en_proceso', value: 2 }]]],
  ['AS avance_promedio', [[{ avance_promedio: '45' }]]],
  ['AS sin_operario', [[{ total: 3, en_curso: 1, sin_operario: 1 }]]],
  ['AS prog_actual', [[{ prog_actual: '40', real_actual: '30', prog_anterior: '20', real_anterior: '10' }]]],
  ['AS vencidos', [[{ vencidos: '1', por_vencer: '2' }]]],
  ['HAVING avance < 100', [[{ id_proyecto: 9, nombre: 'Rack', fecha_fin_estimada: '2026-11-01T05:00:00.000Z', avance: 40 }]]],
  ['HAVING avance < 90', [[{ id_proyecto: 8, nombre: 'Exhibidor', avance: 10, dias: 1 }]]],
  ['pp.id_operario IS NULL AND', [[{ id_programacion: 4, maquina: null, proyecto: 'Rack' }]]],
  ['TIMESTAMPDIFF', [[{ id_pedido: 12, horas: 100 }]]],
]

const bdFalsa = (tabla) => async (sql) => {
  const encontrada = tabla.find(([fragmento]) => sql.includes(fragmento))
  if (!encontrada) throw new Error(`Consulta no esperada: ${sql.slice(0, 60)}`)
  return encontrada[1]
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('dashboard.getStats', () => {
  it('debe armar las tarjetas de resumen con los conteos', async () => {
    pool.query.mockImplementation(bdFalsa(respuestas()))
    const res = crearRes()

    await getStats({}, res)

    const { stats } = res.json.mock.calls[0][0]
    expect(stats.proyectos).toEqual({ total: 5, destacado: 2, label: 'prioridad alta' })
    expect(stats.usuarios).toEqual({ total: 13, destacado: 12, label: 'activos' })
  })

  it('debe calcular cumplimiento y su variación frente a la semana anterior', async () => {
    pool.query.mockImplementation(bdFalsa(respuestas()))
    const res = crearRes()

    await getStats({}, res)

    const { kpis } = res.json.mock.calls[0][0]
    // 30 h reales / 40 programadas = 75 %; la semana anterior 10 / 20 = 50 %
    expect(kpis.cumplimiento).toEqual({ pct: 75, horasReales: 30, horasProgramadas: 40, deltaPct: 25 })
    expect(kpis.riesgo).toEqual({ total: 3, vencidos: 1, porVencer: 2 })
    expect(kpis.capacidad).toEqual({ activos: 7, total: 10, pct: 70 })
    expect(kpis.turnosHoy).toEqual({ total: 3, enCurso: 1, sinOperario: 1 })
  })

  it('debe armar la serie de producción de 7 y 14 días con el día de hoy al final', async () => {
    pool.query.mockImplementation(bdFalsa(respuestas()))
    const res = crearRes()

    await getStats({}, res)

    const { charts } = res.json.mock.calls[0][0]
    expect(charts.produccion7dias).toHaveLength(7)
    expect(charts.produccion14dias).toHaveLength(14)
    expect(charts.produccion7dias.at(-1)).toMatchObject({ programado: 8, real: 6.5 })
    expect(charts.produccion7dias[0]).toMatchObject({ programado: 0, real: 0 })
    expect(charts.avancePromedio).toBe(45)
  })

  it('debe ordenar las alertas: errores, luego advertencias y al final información', async () => {
    pool.query.mockImplementation(bdFalsa(respuestas()))
    const res = crearRes()

    await getStats({}, res)

    const { alertas } = res.json.mock.calls[0][0]
    expect(alertas.map(a => a.tipo)).toEqual([
      'proyecto_vencido', 'turno_sin_operario', 'proyecto_por_vencer', 'pedido_estancado', 'equipos_inactivos',
    ])
    expect(alertas.find(a => a.tipo === 'proyecto_por_vencer').titulo).toBe('Exhibidor vence en 1 día')
    expect(alertas.find(a => a.tipo === 'pedido_estancado').meta).toBe('Pendiente hace 4 días')
    expect(alertas.find(a => a.tipo === 'equipos_inactivos').titulo).toBe('30% de los equipos están inactivos')
  })

  it('si un bloque falla, ese bloque llega en null y el resto del panel sigue funcionando', async () => {
    const tabla = respuestas().map(([f, filas]) => (f === 'LIMIT 6' ? [f, Promise.reject(new Error('timeout'))] : [f, filas]))
    pool.query.mockImplementation(async (sql) => {
      const r = tabla.find(([f]) => sql.includes(f))
      return r[1]
    })
    const res = crearRes()

    await getStats({}, res)

    const cuerpo = res.json.mock.calls[0][0]
    expect(cuerpo.recientes).toBeNull()
    expect(cuerpo.stats).not.toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('con cero máquinas y cero horas no debe dividir entre cero', async () => {
    const tabla = respuestas().map(([f, filas]) => {
      if (f === 'FROM maquinaria') return [f, [[{ total: 0, activas: 0 }]]]
      if (f === 'AS prog_actual') return [f, [[{ prog_actual: null, real_actual: null, prog_anterior: null, real_anterior: null }]]]
      return [f, filas]
    })
    pool.query.mockImplementation(bdFalsa(tabla))
    const res = crearRes()

    await getStats({}, res)

    const { kpis, alertas } = res.json.mock.calls[0][0]
    expect(kpis.capacidad.pct).toBe(0)
    expect(kpis.cumplimiento.pct).toBe(0)
    expect(alertas.some(a => a.tipo === 'equipos_inactivos')).toBe(false)
  })
})

describe('dashboard.getCounts', () => {
  it('debe devolver los conteos del menú lateral como números', async () => {
    pool.query.mockResolvedValueOnce([[{ proyectos: '7', pedidos: '3' }]])
    const res = crearRes()

    await getCounts({}, res)

    expect(res.json).toHaveBeenCalledWith({ proyectos: 7, pedidos: 3 })
  })

  it('debe responder 500 cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ER_CON_COUNT_ERROR'))
    const res = crearRes()

    await getCounts({}, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
