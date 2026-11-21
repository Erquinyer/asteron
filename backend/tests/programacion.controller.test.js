import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import {
  corregirTiempos, getByFase, getCorrecciones, getOcupados, recomputeFase,
  remove, updateAvance, updateEstado,
} from '../src/controllers/programacion.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de prueba de la BD. Cada test declara qué responde cada consulta según
// un fragmento de su SQL (no por orden de llamada), así agregar una consulta al
// controlador no desalinea las demás respuestas.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))

const responder = (reglas) => async (sql) => {
  const regla = reglas.find(([fragmento]) => sql.includes(fragmento))
  return regla ? regla[1] : [[]]
}
const llamadas = (fragmento) => pool.query.mock.calls.filter(([sql]) => sql.includes(fragmento))

const usuario = { id: 3, rol: 'Coordinador de Planta' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.useRealTimers())

describe('programacion.recomputeFase', () => {
  it('no toca la fase si no tiene actividades activas (queda en control manual)', async () => {
    // Arrange
    pool.query.mockImplementation(responder([['FROM programacion_planta', [[]]]]))
    // Act
    await recomputeFase(70)
    // Assert
    expect(llamadas('UPDATE fases_proyecto')).toHaveLength(0)
  })

  it('marca la fase completada con el promedio de avance cuando todas sus actividades terminaron', async () => {
    pool.query.mockImplementation(responder([
      ['FROM programacion_planta', [[{ estado: 'completado', porcentaje_avance: 100 }, { estado: 'completado', porcentaje_avance: 100 }]]],
      ['FROM fases_proyecto', [[{ estado: 'en_curso', porcentaje_avance: 50 }]]],
    ]))

    await recomputeFase(70)

    expect(llamadas('UPDATE fases_proyecto')[0][1]).toEqual(['completada', 100, 70])
    // Cada cambio automático queda en el historial de la fase
    expect(llamadas('INSERT INTO historial_fases')[0][1]).toEqual(
      [70, 'en_curso', 'completada', 100, expect.stringContaining('Programación')])
  })

  it('deja la fase en curso si hay actividades mezcladas', async () => {
    pool.query.mockImplementation(responder([
      ['FROM programacion_planta', [[{ estado: 'en_proceso', porcentaje_avance: 40 }, { estado: 'programado', porcentaje_avance: 0 }]]],
      ['FROM fases_proyecto', [[{ estado: 'pendiente', porcentaje_avance: 0 }]]],
    ]))

    await recomputeFase(70)

    expect(llamadas('UPDATE fases_proyecto')[0][1]).toEqual(['en_curso', 20, 70])
  })

  it('no escribe nada si la fase ya tiene ese estado y avance', async () => {
    pool.query.mockImplementation(responder([
      ['FROM programacion_planta', [[{ estado: 'programado', porcentaje_avance: 0 }]]],
      ['FROM fases_proyecto', [[{ estado: 'pendiente', porcentaje_avance: 0 }]]],
    ]))

    await recomputeFase(70)

    expect(llamadas('UPDATE fases_proyecto')).toHaveLength(0)
    expect(llamadas('INSERT INTO historial_fases')).toHaveLength(0)
  })
})

describe('programacion.getOcupados', () => {
  it('con ?fecha= suma los ocupados ese día y devuelve ids sin repetir ni nulos', async () => {
    pool.query.mockResolvedValueOnce([[
      { id_operario: 5, id_maquina: 9 }, { id_operario: 5, id_maquina: null }, { id_operario: 6, id_maquina: 9 },
    ]])
    const res = crearRes()

    await getOcupados({ query: { fecha: '2999-03-10' } }, res)

    expect(pool.query.mock.calls[0][0]).toContain('fecha = ?')
    expect(pool.query.mock.calls[0][1]).toEqual(['2999-03-10'])
    expect(res.json).toHaveBeenCalledWith({ operarios: [5, 6], maquinas: [9] })
  })

  it('sin fecha solo bloquea a quien tiene una actividad en curso ahora', async () => {
    pool.query.mockResolvedValueOnce([[]])

    await getOcupados({ query: {} }, crearRes())

    expect(pool.query.mock.calls[0][0]).not.toContain('fecha = ?')
  })

  it('responde 500 genérico si falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('conexión perdida'))
    const res = crearRes()

    await getOcupados({ query: {} }, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('programacion.updateEstado', () => {
  const req = (estado, extra = {}) => ({ params: { id: '50' }, body: { estado, ...extra }, user: usuario })

  it('400 si el estado no existe', async () => {
    const res = crearRes()

    await updateEstado(req('terminado-a-medias'), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('404 si la actividad no existe', async () => {
    pool.query.mockImplementation(responder([]))
    const res = crearRes()

    await updateEstado(req('en_proceso'), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('409 al iniciar si el operario ya tiene otra actividad en curso', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: 70, id_operario: 5, id_maquina: 9, hora_inicio: null }]]],
      ['WHERE id_operario=? AND estado=\'en_proceso\'', [[{ 1: 1 }]]],
    ]))
    const res = crearRes()

    await updateEstado(req('en_proceso'), res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].message).toMatch(/operario/)
    expect(llamadas('UPDATE programacion_planta')).toHaveLength(0)
  })

  it('409 al iniciar si la máquina está en uso en otra actividad', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: 70, id_operario: 5, id_maquina: 9, hora_inicio: null }]]],
      ['WHERE id_maquina=? AND estado=\'en_proceso\'', [[{ 1: 1 }]]],
    ]))
    const res = crearRes()

    await updateEstado(req('en_proceso'), res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].message).toMatch(/máquina/)
  })

  it('al iniciar, el servidor fija la hora de inicio (no el cliente)', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-20T08:00:00') })
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: null, id_operario: 5, id_maquina: 9, hora_inicio: null }]]],
    ]))
    const res = crearRes()

    await updateEstado(req('en_proceso'), res)

    const [, valores] = llamadas('UPDATE programacion_planta')[0]
    expect(valores[0]).toBe('en_proceso')
    expect(valores[1]).toEqual(new Date('2026-11-20T08:00:00'))
    expect(res.json).toHaveBeenCalledWith({ message: 'Estado actualizado' })
  })

  it('al completar calcula el tiempo real con las horas registradas e ignora el enviado', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-20T10:30:00') })
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: null, id_operario: 5, id_maquina: 9, hora_inicio: new Date('2026-11-20T08:00:00') }]]],
    ]))

    await updateEstado(req('completado', { tiempo_real: 5 }), crearRes())

    const [sql, valores] = llamadas('UPDATE programacion_planta')[0]
    expect(sql).toContain('porcentaje_avance=?')
    // estado, hora_inicio, hora_fin, tiempo_real (150 min, no los 5 enviados), avance 100, id
    expect(valores[3]).toBe(150)
    expect(valores[4]).toBe(100)
  })

  it('al completar una actividad que nunca se inició usa el tiempo real enviado', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: null, id_operario: 5, id_maquina: null, hora_inicio: null }]]],
    ]))

    await updateEstado(req('completado', { tiempo_real: '45' }), crearRes())

    expect(llamadas('UPDATE programacion_planta')[0][1][3]).toBe(45)
  })

  it('recalcula la fase vinculada después de cambiar el estado', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto, id_operario', [[{ id_fase_proyecto: 70, id_operario: 5, id_maquina: null, hora_inicio: null }]]],
    ]))

    await updateEstado(req('cancelado'), crearRes())

    expect(llamadas('WHERE id_fase_proyecto = ? AND estado != \'cancelado\'')).toHaveLength(1)
  })
})

describe('programacion.updateAvance', () => {
  const req = (porcentaje_avance) => ({ params: { id: '50' }, body: { porcentaje_avance } })

  it('limita el avance a 99 % (el 100 % se reserva para "Completar")', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT estado, id_fase_proyecto', [[{ estado: 'en_proceso', id_fase_proyecto: null }]]],
    ]))
    const res = crearRes()

    await updateAvance(req(150), res)

    expect(llamadas('UPDATE programacion_planta')[0][1]).toEqual([99, '50'])
    expect(res.json).toHaveBeenCalledWith({ message: 'Avance actualizado', porcentaje_avance: 99 })
  })

  it('400 si la actividad no está en proceso', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT estado, id_fase_proyecto', [[{ estado: 'programado', id_fase_proyecto: null }]]],
    ]))
    const res = crearRes()

    await updateAvance(req(30), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(llamadas('UPDATE programacion_planta')).toHaveLength(0)
  })

  it('404 si la actividad no existe', async () => {
    pool.query.mockImplementation(responder([]))
    const res = crearRes()

    await updateAvance(req(30), res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('programacion.remove', () => {
  it('404 si no había nada que eliminar', async () => {
    pool.query.mockImplementation(responder([['DELETE FROM programacion_planta', [{ affectedRows: 0 }]]]))
    const res = crearRes()

    await remove({ params: { id: '50' } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('elimina y recalcula la fase que tenía vinculada', async () => {
    pool.query.mockImplementation(responder([
      ['SELECT id_fase_proyecto FROM programacion_planta', [[{ id_fase_proyecto: 70 }]]],
      ['DELETE FROM programacion_planta', [{ affectedRows: 1 }]],
    ]))
    const res = crearRes()

    await remove({ params: { id: '50' } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Registro eliminado' })
    expect(llamadas('WHERE id_fase_proyecto = ? AND estado != \'cancelado\'')).toHaveLength(1)
  })
})

describe('programacion.corregirTiempos', () => {
  let conn
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-11-20T18:00:00') })
    conn = {
      query: vi.fn(), beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn(),
    }
    pool.getConnection.mockResolvedValue(conn)
  })
  const req = (body) => ({
    params: { id: '50' }, user: usuario,
    body: { motivo: 'El operario olvidó finalizar', hora_inicio: '2026-11-20T08:00:00', hora_fin: '2026-11-20T09:30:00', ...body },
  })
  const completada = { estado: 'completado', id_operario: 5, hora_inicio: new Date('2026-11-20T08:00:00'), hora_fin: new Date('2026-11-20T12:00:00'), tiempo_real: 240 }

  it.each([
    ['sin motivo', { motivo: '  ' }, /motivo/],
    ['sin horas', { hora_inicio: 'no-es-fecha' }, /requeridas/],
    ['con el fin antes del inicio', { hora_fin: '2026-11-20T07:00:00' }, /posterior/],
    ['con el fin en el futuro', { hora_fin: '2026-11-20T19:00:00' }, /futuro/],
  ])('400 %s', async (_caso, body, mensaje) => {
    const res = crearRes()

    await corregirTiempos(req(body), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json.mock.calls[0][0].message).toMatch(mensaje)
    expect(pool.getConnection).not.toHaveBeenCalled()
  })

  it('400 si la actividad no está completada', async () => {
    conn.query.mockResolvedValueOnce([[{ ...completada, estado: 'en_proceso' }]])
    const res = crearRes()

    await corregirTiempos(req(), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(conn.release).toHaveBeenCalled()
  })

  it('409 si las horas nuevas se cruzan con otra actividad del mismo operario', async () => {
    conn.query
      .mockResolvedValueOnce([[completada]])
      .mockResolvedValueOnce([[{ id_programacion: 51 }]])
    const res = crearRes()

    await corregirTiempos(req(), res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(conn.beginTransaction).not.toHaveBeenCalled()
  })

  it('corrige las horas y deja la corrección registrada con el valor anterior y el motivo', async () => {
    conn.query
      .mockResolvedValueOnce([[completada]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValue([{}])
    const res = crearRes()

    await corregirTiempos(req(), res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Tiempos corregidos', tiempo_real: 90 })
    const [, registro] = conn.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO correcciones_tiempo'))
    expect(registro[3]).toBe(240) // tiempo real anterior
    expect(registro[6]).toBe(90)  // tiempo real nuevo
    expect(registro[7]).toBe('El operario olvidó finalizar')
    expect(registro[8]).toBe(usuario.id)
    expect(conn.commit).toHaveBeenCalled()
  })

  it('deshace la transacción y responde 500 si falla al guardar', async () => {
    conn.query
      .mockResolvedValueOnce([[completada]])
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(new Error('disco lleno'))
    const res = crearRes()

    await corregirTiempos(req(), res)

    expect(conn.rollback).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(conn.release).toHaveBeenCalled()
  })
})

describe('programacion — consultas de solo lectura', () => {
  it('getByFase lista las actividades de esa fase', async () => {
    pool.query.mockResolvedValueOnce([[{ id_programacion: 1 }]])
    const res = crearRes()

    await getByFase({ params: { idFase: '70' } }, res)

    expect(pool.query.mock.calls[0][1]).toEqual(['70'])
    expect(res.json).toHaveBeenCalledWith([{ id_programacion: 1 }])
  })

  it('getCorrecciones lista el historial de correcciones de la actividad', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, motivo: 'x' }]])
    const res = crearRes()

    await getCorrecciones({ params: { id: '50' } }, res)

    expect(pool.query.mock.calls[0][1]).toEqual(['50'])
    expect(res.json).toHaveBeenCalledWith([{ id: 1, motivo: 'x' }])
  })
})
