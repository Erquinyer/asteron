import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Capa API — ángulo: el recurso principal del módulo Programación, con
// toda su regla de negocio (validarTurnoInterno/crearTurnoInterno), la
// más densa del backend y la única sin ningún test todavía. BD aislada
// con un pool simulado (vi.mock): no necesita Docker ni MySQL real.
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn() } }))

// No depende de .env: en CI no existe, así que el secreto se fija aquí
// (mismo patrón que auth.controller.test.js y seguridad-y-errores.test.js).
process.env.JWT_SECRET = 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const tokenPlantScheduler = () => jwt.sign(
  { id: 1, correo: 'coordinador@macromet.com.co', rol: 'Coordinador de Planta' },
  process.env.JWT_SECRET
)

const mañana = () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

describe('POST /api/programacion — crea un turno (validarTurnoInterno)', () => {
  // Toda escritura pasa primero por requireAccion('programacion', ...): la primera consulta
  // es el permiso del rol (acciones_modulo). Las respuestas simuladas de cada test van después.
  beforeEach(() => {
    vi.resetAllMocks()
    pool.query.mockResolvedValueOnce([[{ permitido: 1 }]])
  })

  it('400 si falta fecha o id_operario', async () => {
    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ id_operario: 5 }) // sin fecha

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/fecha y operario/i)
    // Solo se consultó el permiso: la validación corta antes de tocar los datos
    expect(pool.query).toHaveBeenCalledOnce()
    expect(pool.query.mock.calls[0][0]).toContain('acciones_modulo')
  })

  it('400 si la fecha es anterior a hoy (no-backdating)', async () => {
    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: '2020-01-01', id_operario: 5, id_maquina: 10 })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/fecha pasada/i)
  })

  it('400 si hay id_proyecto pero no se indica la fase específica', async () => {
    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10, id_proyecto: 3 })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/fase específica/i)
  })

  it('404 si la fase indicada no existe', async () => {
    pool.query.mockResolvedValueOnce([[undefined]]) // SELECT fase

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10, id_proyecto: 3, id_fase_proyecto: 99 })

    expect(res.status).toBe(404)
  })

  it('400 si la fase no requiere turno (ej. Diseño o Compra de materiales)', async () => {
    pool.query.mockResolvedValueOnce([[{ estado: 'pendiente', requiere_turno: 0, categoria_equipo: null }]])

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_proyecto: 3, id_fase_proyecto: 7 })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/no se programa desde Programación/i)
  })

  it('409 si la fase ya está completada', async () => {
    pool.query.mockResolvedValueOnce([[{ estado: 'completada', requiere_turno: 1, categoria_equipo: 'equipo_mig' }]])

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10, id_proyecto: 3, id_fase_proyecto: 7 })

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/ya está completada/i)
  })

  it('400 si la fase requiere equipo (categoria_equipo no nulo) y no se envía id_maquina', async () => {
    pool.query.mockResolvedValueOnce([[{ estado: 'pendiente', requiere_turno: 1, categoria_equipo: 'equipo_mig' }]])

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_proyecto: 3, id_fase_proyecto: 7 }) // sin id_maquina

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/requiere seleccionar un equipo/i)
  })

  it('409 si el operario ya tiene una actividad asignada ese día', async () => {
    pool.query.mockResolvedValueOnce([[{ 1: 1 }]]) // SELECT 1 ... operario ocupado

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10 })

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/operario ya tiene/i)
  })

  it('409 si la máquina ya está reservada ese día en otra actividad', async () => {
    pool.query
      .mockResolvedValueOnce([[undefined]]) // operario libre
      .mockResolvedValueOnce([[{ 1: 1 }]])  // máquina ocupada

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10 })

    expect(res.status).toBe(409)
    expect(res.body.message).toMatch(/máquina ya está reservada/i)
  })

  it('201 caso feliz: crea el turno cuando no hay conflictos', async () => {
    pool.query
      .mockResolvedValueOnce([[undefined]])                 // operario libre
      .mockResolvedValueOnce([[undefined]])                 // máquina libre
      .mockResolvedValueOnce([{ insertId: 42 }])             // INSERT
      .mockResolvedValueOnce([[{ id_programacion: 42, estado: 'programado' }]]) // SELECT final

    const res = await request(app)
      .post('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: mañana(), id_operario: 5, id_maquina: 10 })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ id_programacion: 42, estado: 'programado' })
  })
})

describe('PUT /api/programacion/:id — regla "la fecha solo se revalida si cambió"', () => {
  // Toda escritura pasa primero por requireAccion('programacion', ...): la primera consulta
  // es el permiso del rol (acciones_modulo). Las respuestas simuladas de cada test van después.
  beforeEach(() => {
    vi.resetAllMocks()
    pool.query.mockResolvedValueOnce([[{ permitido: 1 }]])
  })

  it('200: no bloquea editar otros campos de un turno cuya fecha ya quedó en el pasado, si la fecha no cambia', async () => {
    const fechaAntigua = new Date('2020-01-01T00:00:00')
    pool.query
      .mockResolvedValueOnce([[{ estado: 'programado', fecha: fechaAntigua, id_fase_proyecto: null }]]) // SELECT actual
      .mockResolvedValueOnce([[undefined]]) // operario libre
      .mockResolvedValueOnce([[undefined]]) // máquina libre
      .mockResolvedValueOnce([{ affectedRows: 1 }])          // UPDATE
      .mockResolvedValueOnce([[{ id_programacion: 1, observaciones: 'actualizado' }]]) // SELECT final

    const res = await request(app)
      .put('/api/programacion/1')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      // Misma fecha que ya tenía guardada (2020-01-01, en el pasado) — solo cambia observaciones.
      .send({ fecha: '2020-01-01', id_operario: 5, id_maquina: 10, observaciones: 'actualizado' })

    expect(res.status).toBe(200)
  })

  it('400: si la fecha SÍ cambia a una fecha pasada, lo rechaza', async () => {
    const fechaAnterior = new Date('2026-01-01T00:00:00')
    pool.query.mockResolvedValueOnce([[{ estado: 'programado', fecha: fechaAnterior, id_fase_proyecto: null }]])

    const res = await request(app)
      .put('/api/programacion/1')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)
      .send({ fecha: '2020-01-01', id_operario: 5, id_maquina: 10 }) // cambia a una fecha distinta y pasada

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/fecha pasada/i)
  })
})

describe('GET /api/programacion — filtros de la vista', () => {
  // La primera consulta es el permiso de lectura (roles_permisos); se responde
  // por texto de SQL para que el orden de las consultas no importe.
  beforeEach(() => {
    vi.resetAllMocks()
    pool.query.mockImplementation(async (sql) =>
      sql.includes('roles_permisos') ? [[{ permitido: 1 }]] : [[]])
  })
  const consultaTurnos = () => pool.query.mock.calls.find(([sql]) => sql.includes('FROM programacion_planta'))

  it('sin parámetros filtra por el día de hoy', async () => {
    const res = await request(app).get('/api/programacion')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)

    expect(res.status).toBe(200)
    const [sql, valores] = consultaTurnos()
    expect(sql).toContain('pp.fecha BETWEEN ? AND ?')
    expect(valores).toHaveLength(2)
  })

  it('?pendientes=1 trae lo programado o en curso de cualquier fecha', async () => {
    const res = await request(app).get('/api/programacion?pendientes=1')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)

    expect(res.status).toBe(200)
    const [sql, valores] = consultaTurnos()
    expect(sql).not.toContain('pp.fecha BETWEEN')
    expect(sql).toContain("pp.estado IN ('programado','en_proceso')")
    expect(valores).toEqual([])
  })

  it('?proyecto=X trae los turnos de ese proyecto de cualquier fecha', async () => {
    const res = await request(app).get('/api/programacion?proyecto=7')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)

    expect(res.status).toBe(200)
    const [sql, valores] = consultaTurnos()
    expect(sql).not.toContain('pp.fecha BETWEEN')
    expect(sql).toContain('pp.id_proyecto = ?')
    expect(valores).toEqual([7])
  })

  it('?proyecto=X con un rango respeta las fechas', async () => {
    await request(app).get('/api/programacion?proyecto=7&desde=2026-10-01&hasta=2026-10-31')
      .set('Authorization', `Bearer ${tokenPlantScheduler()}`)

    expect(consultaTurnos()[1]).toEqual(['2026-10-01', '2026-10-31', 7])
  })
})
