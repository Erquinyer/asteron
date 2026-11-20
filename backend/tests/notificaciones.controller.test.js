import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { getNotificaciones } from '../src/controllers/notificaciones.controller.js'
import { crearRes } from './helpers/express.js'

// Dobles de esta prueba:
// - BD: STUB con respuestas preparadas para cada una de las 4 consultas del panel.
// - Reloj: FAKE (vi.useFakeTimers) con la zona horaria de Colombia, para reproducir
//   la hora exacta en la que aparecía el defecto, sin depender de la hora real.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const zonaOriginal = process.env.TZ

// Respuestas de la BD en el orden en que el controlador consulta
const prepararBd = ({ vencidos = [], proximos = [], enMantenimiento = [], sinProyecto = 0 } = {}) =>
  pool.query
    .mockResolvedValueOnce([vencidos])
    .mockResolvedValueOnce([proximos])
    .mockResolvedValueOnce([enMantenimiento])
    .mockResolvedValueOnce([[{ sin_proyecto: sinProyecto }]])

const consultar = async () => {
  const res = crearRes()
  await getNotificaciones({}, res)
  return res
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.TZ = 'America/Bogota'
})

afterEach(() => {
  vi.useRealTimers()
  process.env.TZ = zonaOriginal
})

describe('getNotificaciones: dependencia del reloj', () => {
  it('debe usar la fecha de Colombia a las 9 p. m. y no la de UTC (que ya es el día siguiente)', async () => {
    // Arrange: 3 de noviembre, 9 p. m. en Bogotá = 4 de noviembre, 2 a. m. en UTC
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T21:00:00-05:00'))
    prepararBd()

    // Act
    await consultar()

    // Assert: la consulta de "vencidos" compara contra el 3 y no contra el 4
    expect(pool.query.mock.calls[0][1]).toEqual(['2026-11-03'])
  })

  it('debe usar la misma fecha a las 8 a. m. (cuando UTC y Colombia coinciden en el día)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T08:00:00-05:00'))
    prepararBd()

    await consultar()

    expect(pool.query.mock.calls[0][1]).toEqual(['2026-11-03'])
  })
})

describe('getNotificaciones: alertas a partir de los datos', () => {
  it('debe ordenar primero los errores, luego las advertencias y al final la información', async () => {
    // Arrange
    prepararBd({
      proximos: [{ id_proyecto: 2, nombre: 'Rack', dias_restantes: 3 }],
      vencidos: [{ id_proyecto: 1, nombre: 'Góndola', fecha_fin_estimada: new Date(2026, 9, 30) }],
      sinProyecto: 2,
    })

    // Act
    const res = await consultar()

    // Assert (estado): la lista que recibe el frontend
    const { total, items } = res.json.mock.calls[0][0]
    expect(total).toBe(3)
    expect(items.map(n => n.tipo)).toEqual(['error', 'warning', 'info'])
    expect(items[0]).toMatchObject({ titulo: 'Proyecto vencido', link: '/proyectos/1' })
  })

  it.each([
    [1, 'vence en 1 día'],
    [0, 'vence en 0 días'],
    [2, 'vence en 2 días'],
  ])('debe escribir "%i día(s)" en singular o plural', async (dias, texto) => {
    prepararBd({ proximos: [{ id_proyecto: 2, nombre: 'Rack', dias_restantes: dias }] })

    const res = await consultar()

    expect(res.json.mock.calls[0][0].items[0].mensaje).toBe(`"Rack" ${texto}`)
  })

  it.each([
    [1, '1 pedido activo sin proyecto asignado'],
    [3, '3 pedidos activos sin proyecto asignado'],
  ])('con %i pedido(s) sin proyecto muestra "%s"', async (cantidad, mensaje) => {
    prepararBd({ sinProyecto: cantidad })

    const res = await consultar()

    expect(res.json.mock.calls[0][0].items).toEqual([expect.objectContaining({ tipo: 'info', mensaje })])
  })

  it('no debe crear la alerta de pedidos cuando todos tienen proyecto (valor límite: 0)', async () => {
    prepararBd({ sinProyecto: 0 })

    const res = await consultar()

    expect(res.json).toHaveBeenCalledWith({ total: 0, items: [] })
  })

  it('debe mostrar el código del equipo en mantenimiento solo cuando lo tiene', async () => {
    prepararBd({
      enMantenimiento: [
        { id_maquina: 3, nombre: 'Dobladora', codigo: 'MAQ-03' },
        { id_maquina: 4, nombre: 'Pulidora', codigo: null },
      ],
    })

    const res = await consultar()

    const mensajes = res.json.mock.calls[0][0].items.map(n => n.mensaje)
    expect(mensajes).toEqual(['[MAQ-03] Dobladora fuera de servicio', 'Pulidora fuera de servicio'])
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await consultar()

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener notificaciones' })
  })
})
