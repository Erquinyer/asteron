import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { create, getAll, getByMaquina, remove } from '../src/controllers/mantenimientos.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de prueba de la BD: cada test define qué responde cada consulta, en orden
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const usuario = { id: 5, rol: 'Coordinador de Planta' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// true si alguna consulta cambió el estado de la máquina
const cambioEstadoMaquina = () =>
  pool.query.mock.calls.some(([sql]) => sql.includes("SET estado = 'en_mantenimiento'"))

describe('mantenimientos.create', () => {
  it('debe pasar la máquina a "en mantenimiento" cuando el mantenimiento es correctivo', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([{ insertId: 40 }])                 // INSERT mantenimiento
      .mockResolvedValueOnce([[{ id_mantenimiento: 40 }]])       // registro creado
      .mockResolvedValueOnce([{}])                               // UPDATE máquina
    const body = { id_maquina: 3, fecha: '2026-10-21', tipo: 'correctivo' }
    const res = crearRes()

    // Act
    await create({ body, user: usuario }, res)

    // Assert
    expect(cambioEstadoMaquina()).toBe(true)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id_mantenimiento: 40 })
  })

  // Se prueban los dos tipos que no son correctivos (ENUM de la BD): con solo
  // "preventivo", el mutante  tipo !== 'preventivo'  sobrevivía.
  it.each(['preventivo', 'predictivo'])('no debe cambiar el estado de la máquina cuando el mantenimiento es %s', async (tipo) => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 41 }])
      .mockResolvedValueOnce([[{ id_mantenimiento: 41 }]])
    const body = { id_maquina: 3, fecha: '2026-10-21', tipo }

    await create({ body, user: usuario }, crearRes())

    expect(cambioEstadoMaquina()).toBe(false)
  })

  it('debe guardar quién registró el mantenimiento', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 42 }])
      .mockResolvedValueOnce([[{ id_mantenimiento: 42 }]])

    await create({ body: { id_maquina: 3, fecha: '2026-10-21', tipo: 'preventivo' }, user: usuario }, crearRes())

    expect(pool.query.mock.calls[0][1]).toEqual([3, '2026-10-21', 'preventivo', null, 5])
  })

  it.each([
    ['la máquina', { fecha: '2026-10-21', tipo: 'preventivo' }],
    ['la fecha', { id_maquina: 3, tipo: 'preventivo' }],
    ['el tipo', { id_maquina: 3, fecha: '2026-10-21' }],
  ])('debe responder 400 cuando falta %s', async (_campo, body) => {
    const res = crearRes()

    await create({ body, user: usuario }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('mantenimientos.getAll, getByMaquina y remove', () => {
  it('debe listar los mantenimientos de una máquina', async () => {
    pool.query.mockResolvedValueOnce([[{ id_mantenimiento: 1 }, { id_mantenimiento: 2 }]])
    const res = crearRes()

    await getByMaquina({ params: { id: 3 } }, res)

    expect(pool.query.mock.calls[0][1]).toEqual([3])
    expect(res.json).toHaveBeenCalledWith([{ id_mantenimiento: 1 }, { id_mantenimiento: 2 }])
  })

  it('debe responder 500 cuando la BD falla al listar', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const res = crearRes()

    await getAll({}, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('debe responder 404 al borrar un registro que no existe', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = crearRes()

    await remove({ params: { id: 999 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
