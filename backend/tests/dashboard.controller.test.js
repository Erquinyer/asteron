import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { getCounts, getStats } from '../src/controllers/dashboard.controller.js'
import { crearRes } from './helpers/express.js'

// Dobles de esta prueba (semana 5, capa API: la dependencia es el RELOJ y la BD):
// - BD: STUB. pool.query responde según el texto del SQL (no según el orden de las
//   llamadas), así el test no se rompe si el controlador reordena sus consultas.
// - Reloj: FAKE (vi.useFakeTimers) con una fecha fija, para que la serie de 7 días
//   no dependa del día en que se corra el test.
// - console.error: SPY, para comprobar que el error se registra sin ensuciar la salida.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

// Datos por defecto: todo vacío. Cada test cambia solo lo que le interesa.
const datosBase = {
  produccion: [],            // filas de la serie por día
  vencidos: [],              // proyectos vencidos (alertas)
  porVencer: [],             // proyectos por vencer (alertas)
  sinOperario: [],           // turnos de hoy sin operario (alertas)
  estancados: [],            // pedidos pendientes hace más de 72 h (alertas)
  maquinas: { total: 0, activas: 0 },
  fallaEn: null,             // texto de SQL que debe fallar
}

const prepararBd = (cambios = {}) => {
  const d = { ...datosBase, ...cambios }
  pool.query.mockImplementation(async (sql) => {
    if (d.fallaEn && sql.includes(d.fallaEn)) throw new Error('BD caída')
    if (sql.includes('fecha_str')) return [d.produccion]
    if (sql.includes('AS avance_promedio')) return [[{ avance_promedio: 0 }]]
    if (sql.includes('subq')) return [[]]
    if (sql.includes('prog_actual')) return [[{}]]
    if (sql.includes('AS sin_operario')) return [[{ total: 0, en_curso: 0, sin_operario: 0 }]]
    if (sql.includes('AS vencidos')) return [[{ vencidos: 0, por_vencer: 0 }]]
    if (sql.includes('DATEDIFF')) return [d.porVencer]
    if (sql.includes('p.fecha_fin_estimada < CURDATE()')) return [d.vencidos]
    if (sql.includes('pp.id_operario IS NULL')) return [d.sinOperario]
    if (sql.includes('TIMESTAMPDIFF(HOUR')) return [d.estancados]
    if (sql.includes('FROM maquinaria')) return [[d.maquinas]]
    if (sql.includes('FROM programacion_planta')) return [[]]
    if (sql.includes('FROM proyectos p')) return [[]]
    return [[{ total: 0 }]]
  })
}

const consultar = async () => {
  const res = crearRes()
  await getStats({}, res)
  return res.json.mock.calls[0][0]
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getStats: serie de producción (dependencia del reloj)', () => {
  it('debe armar la serie de 7 días terminando hoy y poner en 0 los días sin datos', async () => {
    // Arrange: martes 17 de noviembre de 2026 (mediodía, lejos de cualquier cambio de día)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T12:00:00-05:00'))
    prepararBd({ produccion: [{ fecha_str: '2026-11-15', programado: '8.5', real_h: '6' }] })

    // Act
    const { charts } = await consultar()

    // Assert (estado): 7 días de miércoles 11 a martes 17, con datos solo el domingo 15
    expect(charts.produccion7dias.map(d => d.name)).toEqual(['Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun', 'Mar'])
    expect(charts.produccion7dias[4]).toEqual({ name: 'Dom', programado: 8.5, real: 6 })
    expect(charts.produccion7dias[6]).toEqual({ name: 'Mar', programado: 0, real: 0 })
    expect(charts.produccion14dias).toHaveLength(14)
  })

  it('debe cruzar el cambio de mes sin perder días (1 de diciembre)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-01T12:00:00-05:00'))
    prepararBd({ produccion: [{ fecha_str: '2026-11-30', programado: '4', real_h: '4' }] })

    const { charts } = await consultar()

    // El penúltimo día de la serie es el 30 de noviembre (lunes) y trae sus datos
    expect(charts.produccion7dias[5]).toEqual({ name: 'Lun', programado: 4, real: 4 })
  })
})

describe('getStats: alertas', () => {
  it('debe ordenar primero los errores, luego las advertencias y al final la información', async () => {
    // Arrange: una alerta de cada severidad, entregadas en desorden por la BD
    prepararBd({
      maquinas: { total: 10, activas: 5 },                                                  // info
      porVencer: [{ id_proyecto: 2, nombre: 'Rack', dias: 2, avance: 50 }],                 // warning
      vencidos: [{ id_proyecto: 1, nombre: 'Góndola', fecha_fin_estimada: new Date(2026, 9, 30), avance: 40 }], // error
    })

    // Act
    const { alertas } = await consultar()

    // Assert (estado)
    expect(alertas.map(a => a.severidad)).toEqual(['error', 'warning', 'info'])
    expect(alertas[0]).toMatchObject({ tipo: 'proyecto_vencido', ruta: '/proyectos/1' })
  })

  it.each([
    [1, 'Rack vence en 1 día'],
    [0, 'Rack vence en 0 días'],
    [3, 'Rack vence en 3 días'],
  ])('con %i día(s) restantes debe escribir "%s" (singular y plural)', async (dias, titulo) => {
    prepararBd({ porVencer: [{ id_proyecto: 2, nombre: 'Rack', dias, avance: 50 }] })

    const { alertas } = await consultar()

    expect(alertas[0].titulo).toBe(titulo)
  })

  it.each([
    [10, 2, true],   // 80 % inactivo, supera el 20 %
    [10, 8, false],  // exactamente 20 % inactivo: valor límite, NO alerta
    [10, 7, true],   // 30 % inactivo
    [0, 0, false],   // sin máquinas no se divide entre cero
  ])('con %i máquinas y %i activas, alerta de equipos inactivos: %s', async (total, activas, hayAlerta) => {
    prepararBd({ maquinas: { total, activas } })

    const { alertas } = await consultar()

    expect(alertas.some(a => a.tipo === 'equipos_inactivos')).toBe(hayAlerta)
  })

  it('debe calcular los días de un pedido estancado a partir de las horas (72 h = 3 días)', async () => {
    prepararBd({ estancados: [{ id_pedido: 9, horas: 75 }, { id_pedido: 10, horas: 24 }] })

    const { alertas } = await consultar()

    expect(alertas.map(a => a.meta)).toEqual(['Pendiente hace 3 días', 'Pendiente hace 1 día'])
  })
})

describe('getStats: resistencia cuando falla la BD', () => {
  it('debe entregar null solo en el bloque que falló y seguir con los demás', async () => {
    // Arrange: la consulta de la serie de producción lanza un error
    prepararBd({ fallaEn: 'fecha_str' })

    // Act
    const respuesta = await consultar()

    // Assert (estado): el bloque "charts" es null y el resto del dashboard llega
    expect(respuesta.charts).toBeNull()
    expect(respuesta.alertas).toEqual([])
    expect(respuesta.stats).not.toBeNull()
  })

  it('debe registrar el error con la etiqueta del bloque que falló', async () => {
    prepararBd({ fallaEn: 'fecha_str' })

    await consultar()

    // Assert (comportamiento, con el SPY): qué se registró y con qué
    expect(console.error).toHaveBeenCalledWith('[dashboard.getStats:charts]', expect.any(Error))
  })
})

describe('getCounts', () => {
  it('debe devolver los contadores como números', async () => {
    pool.query.mockResolvedValueOnce([[{ proyectos: '4', pedidos: '2' }]])
    const res = crearRes()

    await getCounts({}, res)

    expect(res.json).toHaveBeenCalledWith({ proyectos: 4, pedidos: 2 })
  })

  it('debe responder 500 cuando la BD falla', async () => {
    pool.query.mockRejectedValueOnce(new Error('BD caída'))
    const res = crearRes()

    await getCounts({}, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error' })
  })
})