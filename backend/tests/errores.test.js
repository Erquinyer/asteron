import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorApp, responderError } from '../src/utils/errores.js'
import { crearRes } from './helpers/express.js'

// Manejo centralizado de errores (RNF-06): un solo lugar decide el código HTTP,
// el mensaje para el cliente y lo que queda en el log.

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('responderError: errores de negocio (ErrorApp)', () => {
  it('debe responder el código y el mensaje del ErrorApp sin escribir en el log', () => {
    // Arrange
    const res = crearRes()

    // Act
    responderError(res, new ErrorApp(409, 'La fase ya está completada'), 'prueba')

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: 'La fase ya está completada' })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('debe ser un Error normal, con nombre y código propios', () => {
    const err = new ErrorApp(400, 'Fecha inválida')

    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ErrorApp')
    expect(err.status).toBe(400)
  })
})

describe('responderError: errores de MySQL causados por los datos', () => {
  it.each([
    ['ER_DUP_ENTRY', 409, 'Ya existe un registro con esos datos'],
    ['ER_ROW_IS_REFERENCED_2', 409, 'No se puede eliminar: el registro está en uso'],
    ['ER_NO_REFERENCED_ROW_2', 400, 'Uno de los datos relacionados no existe'],
    ['ER_DATA_TOO_LONG', 400, 'Uno de los campos supera la longitud permitida'],
    ['ER_BAD_NULL_ERROR', 400, 'Falta un dato obligatorio'],
  ])('%s responde %i con un mensaje entendible', (code, estado, mensaje) => {
    const err = Object.assign(new Error(`${code}: Duplicate entry 'x' for key 'uq' en INSERT INTO ...`), { code })
    const res = crearRes()

    responderError(res, err, 'prueba', 'Error al guardar')

    expect(res.status).toHaveBeenCalledWith(estado)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
    // El texto original de MySQL (con el SQL) nunca llega al cliente
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/INSERT|Duplicate entry/)
  })
})

describe('responderError: errores inesperados (500)', () => {
  it('debe responder el mensaje genérico, sin detalles internos', () => {
    const err = new Error("ER_BAD_FIELD_ERROR: Unknown column 'x' in 'SELECT * FROM usuarios'")
    const res = crearRes()

    responderError(res, err, 'usuarios.getAll', 'Error al obtener usuarios')

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener usuarios' })
  })

  it('debe usar "Error interno del servidor" cuando no se indica mensaje', () => {
    const res = crearRes()

    responderError(res, new Error('x'), 'app')

    expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' })
  })

  it('debe dejar el error completo en el log con el mismo código de referencia que recibe el cliente', () => {
    // Arrange
    const err = new Error('ECONNREFUSED 127.0.0.1:3306')
    const res = crearRes()

    // Act
    responderError(res, err, 'clientes.getAll', 'Error al obtener clientes')

    // Assert: la referencia viaja en un encabezado y aparece en el log junto al error
    const [encabezado, referencia] = res.set.mock.calls[0]
    expect(encabezado).toBe('X-Error-Ref')
    expect(referencia).toMatch(/^[0-9a-f]{8}$/)
    expect(console.error).toHaveBeenCalledWith(`[clientes.getAll] ref=${referencia}`, err)
  })

  it('debe generar una referencia distinta para cada error', () => {
    const res1 = crearRes()
    const res2 = crearRes()

    responderError(res1, new Error('a'), 'x')
    responderError(res2, new Error('b'), 'x')

    expect(res1.set.mock.calls[0][1]).not.toBe(res2.set.mock.calls[0][1])
  })

  it('no debe intentar responder dos veces cuando la respuesta ya se envió', () => {
    const res = crearRes()
    res.headersSent = true

    responderError(res, new Error('falla a mitad de una descarga'), 'reportes.exportar')

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledOnce()
  })
})
