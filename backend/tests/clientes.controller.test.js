import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { create, getOne, remove, update } from '../src/controllers/clientes.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de prueba de la BD: cada test define qué responde cada consulta, en orden
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// Busca el INSERT de direcciones entre las consultas hechas a la BD
const filasDirecciones = () => {
  const llamada = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO direcciones_cliente'))
  return llamada?.[1][0]
}

describe('clientes.create', () => {
  it('debe numerar las direcciones sin etiqueta, ignorar las vacías y marcar la primera como principal', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([{ insertId: 20 }])     // INSERT cliente
      .mockResolvedValueOnce([{}])                   // DELETE direcciones anteriores
      .mockResolvedValueOnce([{}])                   // INSERT direcciones
      .mockResolvedValueOnce([[{ id_cliente: 20 }]]) // cliente creado
    const direcciones = [
      { direccion: '  Calle 10 # 5-20  ' },
      { direccion: '   ' },
      { etiqueta: 'Bodega', direccion: 'Carrera 7 # 80-12' },
    ]
    const res = crearRes()

    // Act
    await create({ body: { nombre: 'Postobón', direcciones } }, res)

    // Assert
    expect(filasDirecciones()).toEqual([
      [20, 'Dirección 1', 'Calle 10 # 5-20', 1],
      [20, 'Bodega', 'Carrera 7 # 80-12', 0],
    ])
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('no debe insertar direcciones cuando el cliente no tiene ninguna', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 22 }])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_cliente: 22 }]])

    await create({ body: { nombre: 'Sin dirección' } }, crearRes())

    expect(filasDirecciones()).toBeUndefined()
  })

  it('debe responder 400 cuando falta el nombre', async () => {
    const res = crearRes()

    await create({ body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe responder 409 cuando el código de cliente ya existe', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' }))
    const res = crearRes()

    await create({ body: { nombre: 'Postobón', codigo_cliente: 'CLI-001' } }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: 'El código de cliente ya existe' })
  })
})

describe('clientes.update', () => {
  it('no debe tocar las direcciones cuando el formulario no las envía', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_cliente: 20 }]])
    const res = crearRes()

    await update({ params: { id: 20 }, body: { nombre: 'Postobón S.A.' } }, res)

    expect(pool.query).toHaveBeenCalledTimes(2)
    expect(res.json).toHaveBeenCalledWith({ id_cliente: 20 })
  })

  it('debe responder 404 cuando el cliente no existe', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = crearRes()

    await update({ params: { id: 999 }, body: { nombre: 'X', direcciones: [] } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('clientes.getOne y remove', () => {
  it('debe devolver el cliente con sus direcciones y pedidos', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_cliente: 20, nombre: 'Postobón' }]])
      .mockResolvedValueOnce([[{ id_direccion: 1, direccion: 'Calle 10' }]])
      .mockResolvedValueOnce([[{ id_pedido: 30 }]])
    const res = crearRes()

    await getOne({ params: { id: 20 } }, res)

    expect(res.json).toHaveBeenCalledWith({
      id_cliente: 20,
      nombre: 'Postobón',
      direcciones: [{ id_direccion: 1, direccion: 'Calle 10' }],
      pedidos: [{ id_pedido: 30 }],
    })
  })

  it('debe responder 404 al buscar o borrar un cliente que no existe', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ affectedRows: 0 }])
    const resBuscar = crearRes()
    const resBorrar = crearRes()

    await getOne({ params: { id: 999 } }, resBuscar)
    await remove({ params: { id: 999 } }, resBorrar)

    expect(resBuscar.status).toHaveBeenCalledWith(404)
    expect(resBorrar.status).toHaveBeenCalledWith(404)
  })
})
