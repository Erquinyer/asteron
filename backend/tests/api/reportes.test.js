import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Capa API — módulo Reportes (RF-16, RF-29, RF-30): agregación de horas, avance y
// mantenimientos, y exportación real a Excel/PDF (exceljs y pdfkit, sin simular).
// BD aislada con un pool simulado: no necesita Docker ni MySQL real.
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn() } }))

process.env.JWT_SECRET = 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = jwt.sign({ id: 3, correo: 'coordinador@macromet.com.co', rol: 'Coordinador de Planta' }, process.env.JWT_SECRET)
const consultar = (url) => request(app).get(url).set('Authorization', `Bearer ${token}`)

// Lee la descarga como Buffer para revisar la firma del archivo
const descargar = (url) => consultar(url).buffer(true).parse((res, fin) => {
  const partes = []
  res.on('data', p => partes.push(p))
  res.on('end', () => fin(null, Buffer.concat(partes)))
})

const actividad = (o) => ({
  id_programacion: 1, fecha: '2026-11-10', estado: 'completado', tiempo_estimado: 120, tiempo_real: 90,
  id_operario: 10, operario: 'Soldador 1', cargo: 'Operario', valor_hora: null,
  id_proyecto: 1, proyecto: 'Exhibidor Castrol', id_pedido: 12, fase: 'Soldadura MIG', item_producto: 'Exhibidor', ...o,
})

// Toda petición pasa primero por requireModulo('reportes')
beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  pool.query.mockResolvedValueOnce([[{ permitido: 1 }]])
})

describe('GET /api/reportes/horas', () => {
  it('debe agrupar las horas por trabajador, proyecto y OP, sin mostrar costos (fuera del MVP)', async () => {
    // Arrange: dos actividades del mismo operario; una sin terminar
    pool.query.mockResolvedValueOnce([[
      actividad({ id_programacion: 1, tiempo_estimado: 120, tiempo_real: 90 }),
      actividad({ id_programacion: 2, tiempo_estimado: 60, tiempo_real: null, estado: 'en_proceso' }),
    ]])

    // Act
    const res = await consultar('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30&id_proyecto=1&id_operario=10')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.ver_costos).toBe(false)
    expect(res.body.totales).toMatchObject({ actividades: 2, sin_tiempo_real: 1, horas_estimadas: 3, horas_reales: 1.5 })
    // La desviación solo compara actividades con tiempo real: 90 − 120 min = −0,5 h
    expect(res.body.totales.desviacion_horas).toBe(-0.5)
    expect(res.body.totales).not.toHaveProperty('costo')
    expect(res.body.por_trabajador[0]).toMatchObject({ operario: 'Soldador 1', cargo: 'Operario' })
    expect(res.body.por_pedido[0]).toMatchObject({ pedido: 'OP-12' })
    expect(res.body.actividades[0]).not.toHaveProperty('costo')
    // Los filtros llegan como parámetros, nunca concatenados en el SQL
    expect(pool.query.mock.calls[1][1]).toEqual(['2026-11-01', '2026-11-30', '1', '10'])
  })

  it('debe agrupar como "Sin operario" y "Sin proyecto" las actividades sin asignar', async () => {
    pool.query.mockResolvedValueOnce([[actividad({ id_operario: null, operario: null, cargo: null, id_proyecto: null, proyecto: null, id_pedido: null })]])

    const res = await consultar('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')

    expect(res.body.por_trabajador[0]).toMatchObject({ operario: 'Sin operario', cargo: '—' })
    expect(res.body.por_proyecto[0]).toMatchObject({ proyecto: 'Sin proyecto' })
    expect(res.body.por_pedido).toEqual([])
  })

  it('debe devolver totales en cero cuando no hay actividades en el periodo', async () => {
    pool.query.mockResolvedValueOnce([[]])

    const res = await consultar('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')

    expect(res.body.totales).toMatchObject({ actividades: 0, horas_reales: 0 })
  })

  it('debe usar del primer día del mes a hoy cuando no se indican fechas', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T10:00:00'))
    pool.query.mockResolvedValueOnce([[]])

    const res = await consultar('/api/reportes/horas')
    vi.useRealTimers()

    expect(res.body).toMatchObject({ desde: '2026-11-01', hasta: '2026-11-20' })
  })

  it.each([
    ['con una fecha mal escrita', '?desde=20-11-2026', 'Las fechas deben tener el formato AAAA-MM-DD'],
    ['con el rango invertido', '?desde=2026-12-01&hasta=2026-11-01', 'La fecha inicial no puede ser posterior a la final'],
  ])('debe responder 400 %s', async (_caso, query, mensaje) => {
    const res = await consultar(`/api/reportes/horas${query}`)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: mensaje })
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNRESET'))

    const res = await consultar('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error al generar el reporte de horas' })
  })
})

describe('GET /api/reportes/avance', () => {
  it('debe calcular el estado y si está vencido cada proyecto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T10:00:00'))
    pool.query.mockResolvedValueOnce([[
      { id_proyecto: 1, proyecto: 'Terminado', total_fases: 4, fases_completadas: 4, fases_en_curso: 0, avance: '100', fecha_fin_estimada: '2026-10-01' },
      { id_proyecto: 2, proyecto: 'Atrasado', total_fases: 4, fases_completadas: 1, fases_en_curso: 1, avance: '40', fecha_fin_estimada: '2026-11-01' },
      { id_proyecto: 3, proyecto: 'Sin empezar', total_fases: 4, fases_completadas: 0, fases_en_curso: 0, avance: '0', fecha_fin_estimada: null },
    ]])

    const res = await consultar('/api/reportes/avance?id_proyecto=2')
    vi.useRealTimers()

    const [terminado, atrasado, sinEmpezar] = res.body.proyectos
    expect(terminado).toMatchObject({ estado: 'completado', vencido: false, avance: 100 })
    expect(atrasado).toMatchObject({ estado: 'en_curso', vencido: true })
    expect(sinEmpezar).toMatchObject({ estado: 'pendiente', vencido: false })
    expect(pool.query.mock.calls[1][1]).toEqual(['2'])
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'))

    const res = await consultar('/api/reportes/avance')

    expect(res.body).toEqual({ message: 'Error al generar el reporte de avance' })
  })
})

describe('GET /api/reportes/mantenimientos', () => {
  it('debe contar los realizados por tipo y marcar como vencidos los programados ya pasados', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-20T10:00:00'))
    pool.query
      .mockResolvedValueOnce([[{ tipo: 'preventivo' }, { tipo: 'preventivo' }, { tipo: 'correctivo' }]])
      .mockResolvedValueOnce([[{ id_mantenimiento: 8, fecha: '2026-11-10' }, { id_mantenimiento: 9, fecha: '2026-12-01' }]])

    const res = await consultar('/api/reportes/mantenimientos?desde=2026-11-01&hasta=2026-11-30&id_maquina=3&tipo=preventivo')
    vi.useRealTimers()

    expect(res.body.total).toBe(3)
    expect(res.body.por_tipo).toEqual({ preventivo: 2, correctivo: 1, calibracion: 0, predictivo: 0 })
    expect(res.body.programados.map(p => p.situacion)).toEqual(['Vencido', 'Programado'])
    // Los programados usan los filtros de equipo y tipo, pero no el periodo
    expect(pool.query.mock.calls[2][1]).toEqual(['3', 'preventivo'])
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('x'))

    const res = await consultar('/api/reportes/mantenimientos?desde=2026-11-01&hasta=2026-11-30')

    expect(res.body).toEqual({ message: 'Error al generar el reporte de mantenimientos' })
  })
})

describe('GET /api/reportes/:tipo/exportar', () => {
  it('debe descargar un Excel válido del reporte de horas', async () => {
    pool.query.mockResolvedValueOnce([[actividad({})]])

    const res = await descargar('/api/reportes/horas/exportar?formato=xlsx&desde=2026-11-01&hasta=2026-11-30')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml')
    expect(res.headers['content-disposition']).toMatch(/reporte_horas_\d{4}-\d{2}-\d{2}\.xlsx/)
    expect(res.body.subarray(0, 2).toString()).toBe('PK') // un .xlsx es un ZIP
  })

  it('debe descargar un PDF válido del reporte de mantenimientos, incluso con secciones vacías', async () => {
    pool.query
      .mockResolvedValueOnce([[{ fecha: '2026-11-05', tipo: 'correctivo', maquina: 'Dobladora', maquina_codigo: null, tecnico: null, descripcion: 'Cambio de rodamiento' }]])
      .mockResolvedValueOnce([[]])

    const res = await descargar('/api/reportes/mantenimientos/exportar?formato=pdf&desde=2026-11-01&hasta=2026-11-30')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('application/pdf')
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('debe paginar el PDF cuando hay muchas filas', async () => {
    const proyectos = Array.from({ length: 60 }, (_, i) => ({
      id_proyecto: i, proyecto: `Proyecto ${i}`, cliente: 'Postobón', total_fases: 4, fases_completadas: 1,
      fases_en_curso: 1, avance: '30', fecha_fin_estimada: '2999-01-01',
    }))
    pool.query.mockResolvedValueOnce([proyectos])

    const res = await descargar('/api/reportes/avance/exportar?formato=pdf')

    expect(res.status).toBe(200)
    expect(res.body.toString('latin1')).toMatch(/\/Count [2-9]/) // más de una página
  })

  it('debe responder 404 a un reporte que no existe y 400 a un formato no soportado', async () => {
    const noExiste = await consultar('/api/reportes/costos/exportar?formato=xlsx')
    pool.query.mockResolvedValueOnce([[{ permitido: 1 }]])
    const formatoMalo = await consultar('/api/reportes/horas/exportar?formato=csv')

    expect(noExiste.status).toBe(404)
    expect(formatoMalo.status).toBe(400)
    expect(formatoMalo.body).toEqual({ message: 'Formato no válido' })
  })

  it('debe responder el error del filtro en JSON antes de empezar la descarga', async () => {
    const res = await consultar('/api/reportes/horas/exportar?formato=xlsx&desde=2026-12-01&hasta=2026-01-01')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'La fecha inicial no puede ser posterior a la final' })
  })
})
