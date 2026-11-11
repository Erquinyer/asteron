import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { create, remove, update } from '../src/controllers/pedidos.controller.js'
import { crearRes, FECHA_FUTURA, FECHA_PASADA } from './helpers/express.js'

// Doble de prueba de la BD. Los pedidos usan una conexión con transacción (conn)
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))

let conn

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  conn = {
    query: vi.fn(),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    release: vi.fn(),
  }
  pool.getConnection.mockResolvedValue(conn)
})

describe('pedidos.create', () => {
  it('debe guardar solo los ítems con producto y confirmar la transacción', async () => {
    // Arrange
    conn.query
      .mockResolvedValueOnce([{ insertId: 30 }])   // INSERT pedido
      .mockResolvedValue([{}])                     // INSERT de cada ítem
    pool.query.mockResolvedValueOnce([[{ id_pedido: 30, total_items: 1 }]])
    const items = [
      { producto: 'Góndola', fecha_entrega_estimada: FECHA_FUTURA },
      { producto: '   ' },                          // sin producto: se ignora
    ]
    const res = crearRes()

    // Act
    await create({ body: { id_cliente: 4, items } }, res)

    // Assert
    const insertsDeItems = conn.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO detalle_pedido'))
    expect(insertsDeItems).toHaveLength(1)
    expect(insertsDeItems[0][1]).toEqual([30, 'Góndola', 1, null, 'pendiente', FECHA_FUTURA])
    expect(conn.commit).toHaveBeenCalledOnce()
    expect(conn.release).toHaveBeenCalledOnce()
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it.each([
    ['no tiene cliente', { items: [] }, 'El cliente es requerido'],
    ['un ítem tiene fecha de entrega pasada', { id_cliente: 4, items: [{ producto: 'Rack', fecha_entrega_estimada: FECHA_PASADA }] },
      'La fecha de entrega estimada de un ítem no puede ser anterior a hoy'],
  ])('debe responder 400 sin abrir conexión cuando el pedido %s', async (_caso, body, mensaje) => {
    const res = crearRes()

    await create({ body }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
    expect(pool.getConnection).not.toHaveBeenCalled()
  })

  it('debe deshacer la transacción y liberar la conexión cuando falla un INSERT', async () => {
    conn.query.mockRejectedValueOnce(new Error('ER_NO_REFERENCED_ROW'))
    const res = crearRes()

    await create({ body: { id_cliente: 999, items: [] } }, res)

    expect(conn.rollback).toHaveBeenCalledOnce()
    expect(conn.commit).not.toHaveBeenCalled()
    expect(conn.release).toHaveBeenCalledOnce()
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('pedidos.update', () => {
  it('no debe revalidar la fecha de un ítem que ya existía aunque esté vencida', async () => {
    // Arrange: el ítem 8 ya existía con fecha pasada; solo se cambia la descripción
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])     // UPDATE pedido
      .mockResolvedValueOnce([[{ id_detalle: 8 }]])     // ítems actuales
      .mockResolvedValue([{}])                          // DELETE y UPDATE del ítem
    pool.query.mockResolvedValueOnce([[{ id_pedido: 30 }]])
    const items = [{ id_detalle: 8, producto: 'Góndola', fecha_entrega_estimada: FECHA_PASADA }]
    const res = crearRes()

    // Act
    await update({ params: { id: 30 }, body: { id_cliente: 4, descripcion: 'Urgente', items } }, res)

    // Assert
    expect(res.status).not.toHaveBeenCalled()
    expect(conn.commit).toHaveBeenCalledOnce()
  })

  it('debe rechazar un ítem nuevo con fecha de entrega pasada', async () => {
    const items = [{ producto: 'Rack nuevo', fecha_entrega_estimada: FECHA_PASADA }]
    const res = crearRes()

    await update({ params: { id: 30 }, body: { id_cliente: 4, items } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.getConnection).not.toHaveBeenCalled()
  })

  it('debe conservar el ítem existente, borrar los quitados y crear las fases del ítem nuevo si hay proyecto', async () => {
    // Arrange: había ítems 8 y 9; se conserva el 8, se quita el 9 y se agrega uno nuevo
    conn.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])                   // UPDATE pedido
      .mockResolvedValueOnce([[{ id_detalle: 8 }, { id_detalle: 9 }]]) // ítems actuales
      .mockResolvedValueOnce([{}])                                    // DELETE de los quitados
      .mockResolvedValueOnce([{}])                                    // UPDATE ítem 8
      .mockResolvedValueOnce([{ insertId: 10 }])                      // INSERT ítem nuevo
      .mockResolvedValueOnce([[{ id_proyecto: 77 }]])                 // proyecto del pedido
      .mockResolvedValueOnce([[{ id_fase_estandar: 3 }]])             // fases por ítem
      .mockResolvedValueOnce([{}])                                    // INSERT fases del ítem 10
    pool.query.mockResolvedValueOnce([[{ id_pedido: 30 }]])
    const items = [
      { id_detalle: 8, producto: 'Góndola' },
      { producto: 'Rack', fecha_entrega_estimada: FECHA_FUTURA },
    ]
    const res = crearRes()

    // Act
    await update({ params: { id: 30 }, body: { id_cliente: 4, items } }, res)

    // Assert
    const [sqlDelete, paramsDelete] = conn.query.mock.calls[2]
    expect(sqlDelete).toContain('NOT IN (?)')
    expect(paramsDelete).toEqual([30, 8])
    const [, [filasFases]] = conn.query.mock.calls[7]
    expect(filasFases).toEqual([[77, 3, 10, null, 'pendiente', 0]])
    expect(conn.commit).toHaveBeenCalledOnce()
  })

  it('debe responder 404 y deshacer la transacción cuando el pedido no existe', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = crearRes()

    await update({ params: { id: 999 }, body: { id_cliente: 4 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(conn.rollback).toHaveBeenCalledOnce()
  })
})

describe('pedidos.remove', () => {
  it('debe impedir borrar un pedido con un proyecto asociado', async () => {
    pool.query.mockResolvedValueOnce([[{ total_proyectos: 1 }]])
    const res = crearRes()

    await remove({ params: { id: 30 } }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].message).toContain('tiene 1 proyecto asociado.')
  })

  it('debe responder 404 cuando el pedido no existe', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total_proyectos: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = crearRes()

    await remove({ params: { id: 999 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
