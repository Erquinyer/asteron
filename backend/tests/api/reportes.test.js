import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Capa API — Reportes (RF-16, RF-17, RF-29, RF-30): horas y costo de mano de obra,
// avance de proyectos, mantenimientos y exportación a Excel y PDF.
// BD: FAKE que responde según la consulta (no depende del orden de las llamadas).
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn() } }))
process.env.JWT_SECRET = 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = (rol) => jwt.sign({ id: 1, correo: 'x@macromet.com.co', rol }, process.env.JWT_SECRET)
const GERENCIA = 'Gerente General'          // ve costos
const PLANTA   = 'Coordinador de Planta'    // ve reportes, pero no costos

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACTIVIDADES = [
  { id_programacion: 1, fecha: '2026-11-10', estado: 'completado', tiempo_estimado: 120, tiempo_real: 90,
    id_operario: 5, operario: 'Angie', cargo: 'Operario', valor_hora: '10500.00',
    id_proyecto: 1, proyecto: 'Góndolas Postobón', id_pedido: 30, fase: 'Corte', item_producto: 'Góndola' },
  { id_programacion: 2, fecha: '2026-11-11', estado: 'en_proceso', tiempo_estimado: 60, tiempo_real: null,
    id_operario: 5, operario: 'Angie', cargo: 'Operario', valor_hora: '10500.00',
    id_proyecto: 1, proyecto: 'Góndolas Postobón', id_pedido: 30, fase: 'Soldadura', item_producto: 'Góndola' },
  { id_programacion: 3, fecha: '2026-11-12', estado: 'completado', tiempo_estimado: 30, tiempo_real: 45,
    id_operario: 6, operario: 'Martín', cargo: 'Coordinador de Planta', valor_hora: null,
    id_proyecto: 2, proyecto: 'Rack Alpina', id_pedido: null, fase: 'Pintura', item_producto: null },
]

const PROYECTOS = [
  { id_proyecto: 1, proyecto: 'Góndolas', total_fases: 4, fases_completadas: '4', fases_en_curso: '0', avance: '100', fecha_fin_estimada: '2020-01-01' },
  { id_proyecto: 2, proyecto: 'Rack', total_fases: 4, fases_completadas: '1', fases_en_curso: '1', avance: '40', fecha_fin_estimada: '2999-01-01' },
  { id_proyecto: 3, proyecto: 'Exhibidor', total_fases: 4, fases_completadas: '0', fases_en_curso: '0', avance: '0', fecha_fin_estimada: '2020-06-01' },
]

const REALIZADOS = [
  { id_mantenimiento: 1, fecha: '2026-11-02', tipo: 'preventivo', maquina: 'Dobladora', maquina_codigo: 'MAQ-03', tecnico: 'Martín' },
  { id_mantenimiento: 2, fecha: '2026-11-05', tipo: 'correctivo', maquina: 'Pulidora', maquina_codigo: null, tecnico: 'Martín' },
  { id_mantenimiento: 3, fecha: '2026-11-06', tipo: 'preventivo', maquina: 'Cortadora', maquina_codigo: 'MAQ-07', tecnico: null },
]
const PROGRAMADOS = [
  { id_mantenimiento: 8, fecha: '2020-01-10', tipo: 'calibracion', maquina: 'Soldadora MIG' },
  { id_mantenimiento: 9, fecha: '2999-12-01', tipo: 'preventivo', maquina: 'Dobladora' },
]

const bdFalsa = (sql) => {
  if (sql.includes('roles_permisos')) return [[{ permitido: 1 }]]                 // requireModulo('reportes')
  if (sql.includes('FROM programacion_planta pp')) return [ACTIVIDADES]
  if (sql.includes('FROM proyectos pr')) return [PROYECTOS]
  if (sql.includes("mt.estado = 'realizado'")) return [REALIZADOS]
  if (sql.includes("mt.estado = 'programado'")) return [PROGRAMADOS]
  throw new Error(`Consulta no esperada en la prueba: ${sql.slice(0, 60)}`)
}

const binario = (res, cb) => {
  const partes = []
  res.on('data', (c) => partes.push(c))
  res.on('end', () => cb(null, Buffer.concat(partes)))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  pool.query.mockImplementation(async (sql) => bdFalsa(sql))
})

describe('GET /api/reportes/horas', () => {
  it('debe sumar horas y costo de mano de obra para gerencia (horas reales × valor hora)', async () => {
    const res = await request(app).get('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')
      .set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(200)
    expect(res.body.ver_costos).toBe(true)
    expect(res.body.totales).toMatchObject({
      actividades: 3, sin_tiempo_real: 1, sin_valor_hora: 1,
      horas_estimadas: 3.5, horas_reales: 2.25,
      // solo compara lo terminado: 135 min reales contra 150 estimados
      desviacion_horas: -0.25,
      costo: 15750,            // 1,5 h × $10.500; Martín no tiene valor hora
    })
  })

  it('debe ordenar a los trabajadores por horas reales y agrupar por OP solo las actividades con pedido', async () => {
    const res = await request(app).get('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')
      .set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.body.por_trabajador.map(t => t.operario)).toEqual(['Angie', 'Martín'])
    expect(res.body.por_pedido).toHaveLength(1)
    expect(res.body.por_pedido[0]).toMatchObject({ pedido: 'OP-30', actividades: 2 })
    expect(res.body.actividades[0]).toMatchObject({ horas_estimadas: 2, horas_reales: 1.5, costo: 15750 })
  })

  it('no debe mostrar costos a roles que no son de gerencia', async () => {
    const res = await request(app).get('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30')
      .set('Authorization', `Bearer ${token(PLANTA)}`)

    expect(res.status).toBe(200)
    expect(res.body.ver_costos).toBe(false)
    expect(res.body.totales).not.toHaveProperty('costo')
    expect(res.body.actividades[0]).not.toHaveProperty('costo')
  })

  it('debe pasar los filtros de proyecto y operario a la consulta', async () => {
    await request(app).get('/api/reportes/horas?desde=2026-11-01&hasta=2026-11-30&id_proyecto=1&id_operario=5')
      .set('Authorization', `Bearer ${token(GERENCIA)}`)

    const [sql, valores] = pool.query.mock.calls.find(([s]) => s.includes('FROM programacion_planta pp'))
    expect(sql).toContain('pp.id_proyecto = ?')
    expect(valores).toEqual(['2026-11-01', '2026-11-30', '1', '5'])
  })

  it.each([
    ['desde=2026-13&hasta=2026-11-30', 'Las fechas deben tener el formato AAAA-MM-DD'],
    ['desde=2026-11-30&hasta=2026-11-01', 'La fecha inicial no puede ser posterior a la final'],
  ])('debe responder 400 con un periodo inválido (%s)', async (filtro, mensaje) => {
    const res = await request(app).get(`/api/reportes/horas?${filtro}`).set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: mensaje })
  })

  it('debe responder 500 genérico, sin SQL, cuando falla la BD', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('roles_permisos')) return [[{ permitido: 1 }]]
      throw new Error('ER_BAD_FIELD_ERROR: SELECT pp.* FROM programacion_planta')
    })

    const res = await request(app).get('/api/reportes/horas').set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error al generar el reporte de horas' })
  })
})

describe('GET /api/reportes/avance', () => {
  it('debe calcular el estado de cada proyecto y marcar los vencidos sin terminar', async () => {
    const res = await request(app).get('/api/reportes/avance').set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(200)
    const porNombre = Object.fromEntries(res.body.proyectos.map(p => [p.proyecto, p]))
    // Terminado aunque la fecha ya pasó: no cuenta como vencido
    expect(porNombre['Góndolas']).toMatchObject({ estado: 'completado', vencido: false, avance: 100 })
    expect(porNombre.Rack).toMatchObject({ estado: 'en_curso', vencido: false })
    expect(porNombre.Exhibidor).toMatchObject({ estado: 'pendiente', vencido: true })
  })
})

describe('GET /api/reportes/mantenimientos', () => {
  it('debe contar los realizados por tipo y marcar los programados vencidos', async () => {
    const res = await request(app).get('/api/reportes/mantenimientos?desde=2026-11-01&hasta=2026-11-30&tipo=preventivo')
      .set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(3)
    expect(res.body.por_tipo).toEqual({ preventivo: 2, correctivo: 1, calibracion: 0, predictivo: 0 })
    expect(res.body.programados.map(p => p.situacion)).toEqual(['Vencido', 'Programado'])
  })
})

describe('GET /api/reportes/:tipo/exportar', () => {
  it.each([
    ['horas', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'PK'],
    ['avance', 'xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'PK'],
    ['mantenimientos', 'pdf', 'application/pdf', '%PDF'],
    ['horas', 'pdf', 'application/pdf', '%PDF'],
  ])('debe generar el reporte de %s en %s', async (tipo, formato, contentType, firma) => {
    const res = await request(app).get(`/api/reportes/${tipo}/exportar?formato=${formato}&desde=2026-11-01&hasta=2026-11-30`)
      .set('Authorization', `Bearer ${token(GERENCIA)}`)
      .buffer(true).parse(binario)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain(contentType)
    expect(res.headers['content-disposition']).toContain(`reporte_${tipo}_${hoy()}.${formato}`)
    expect(res.body.subarray(0, firma.length).toString()).toBe(firma)
  })

  it('debe generar el PDF aunque una sección no tenga datos', async () => {
    pool.query.mockImplementation(async (sql) => (sql.includes('roles_permisos') ? [[{ permitido: 1 }]] : [[]]))

    const res = await request(app).get('/api/reportes/mantenimientos/exportar?formato=pdf')
      .set('Authorization', `Bearer ${token(GERENCIA)}`)
      .buffer(true).parse(binario)

    expect(res.status).toBe(200)
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('debe responder 404 a un tipo de reporte que no existe', async () => {
    const res = await request(app).get('/api/reportes/ventas/exportar?formato=pdf').set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(404)
  })

  it('debe responder 400 a un formato distinto de xlsx o pdf', async () => {
    const res = await request(app).get('/api/reportes/horas/exportar?formato=csv').set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Formato no válido' })
  })

  it('debe responder 500 genérico si falla la consulta antes de generar el archivo', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('roles_permisos')) return [[{ permitido: 1 }]]
      throw new Error('ER_LOCK_WAIT_TIMEOUT')
    })

    const res = await request(app).get('/api/reportes/avance/exportar?formato=xlsx').set('Authorization', `Bearer ${token(GERENCIA)}`)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error al exportar el reporte' })
  })
})
