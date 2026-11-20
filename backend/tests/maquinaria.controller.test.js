import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { create, getAll, getOne, remove, update } from '../src/controllers/maquinaria.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de la BD: STUB (respuestas preparadas) y, donde importa qué se guarda,
// se revisan los parámetros de la consulta (comportamiento).
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('maquinaria.create', () => {
  it('debe guardar los valores por defecto cuando solo se envía el nombre', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([{ insertId: 41 }])
      .mockResolvedValueOnce([[{ id_maquina: 41, nombre: 'Taladro' }]])
    const res = crearRes()

    // Act
    await create({ body: { nombre: 'Taladro' } }, res)

    // Assert
    expect(pool.query.mock.calls[0][1]).toEqual(
      ['Taladro', null, 'maquinaria_pesada', null, null, null, null, null, 'activa', null])
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('no debe guardar nada cuando falta el nombre', async () => {
    const res = crearRes()

    await create({ body: { codigo: 'MAQ-99' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('maquinaria.getOne, update y remove', () => {
  it('debe devolver el equipo con su historial de mantenimientos', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_maquina: 3, nombre: 'Dobladora' }]])
      .mockResolvedValueOnce([[{ id_mantenimiento: 1, tipo: 'correctivo' }]])
    const res = crearRes()

    await getOne({ params: { id: 3 } }, res)

    expect(res.json).toHaveBeenCalledWith({
      id_maquina: 3, nombre: 'Dobladora', mantenimientos: [{ id_mantenimiento: 1, tipo: 'correctivo' }],
    })
  })

  it.each([
    ['consultar', (res) => getOne({ params: { id: 999 } }, res), [[]]],
    ['actualizar', (res) => update({ params: { id: 999 }, body: { nombre: 'X' } }, res), [{ affectedRows: 0 }]],
    ['eliminar', (res) => remove({ params: { id: 999 } }, res), [{ affectedRows: 0 }]],
  ])('debe responder 404 al %s un equipo que no existe', async (_accion, accion, respuestaBd) => {
    pool.query.mockResolvedValueOnce(respuestaBd)
    const res = crearRes()

    await accion(res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Equipo no encontrado' })
  })

  it('debe actualizar y devolver el equipo con su responsable', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_maquina: 3, responsable: 'Martín' }]])
    const res = crearRes()

    await update({ params: { id: 3 }, body: { nombre: 'Dobladora', id_responsable: 7, estado: 'en_mantenimiento' } }, res)

    expect(pool.query.mock.calls[0][1]).toEqual(
      ['Dobladora', null, 'maquinaria_pesada', null, null, null, null, null, 'en_mantenimiento', 7, 3])
    expect(res.json).toHaveBeenCalledWith({ id_maquina: 3, responsable: 'Martín' })
  })

  it('debe eliminar el equipo', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = crearRes()

    await remove({ params: { id: 3 } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Equipo eliminado' })
  })

  it.each([
    ['listar', (res) => getAll({}, res), 'Error al obtener maquinaria'],
    ['crear', (res) => create({ body: { nombre: 'X' } }, res), 'Error al crear equipo'],
    ['actualizar', (res) => update({ params: { id: 3 }, body: {} }, res), 'Error al actualizar equipo'],
    ['eliminar', (res) => remove({ params: { id: 3 } }, res), 'Error al eliminar equipo'],
  ])('debe responder 500 genérico cuando falla la BD al %s', async (_accion, accion, mensaje) => {
    pool.query.mockRejectedValueOnce(new Error('ER_LOCK_DEADLOCK'))
    const res = crearRes()

    await accion(res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
  })
})
