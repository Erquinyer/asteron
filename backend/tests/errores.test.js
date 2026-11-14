import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorHttp, manejadorErrores, responderError } from '../src/utils/errores.js'
import { crearRes } from './helpers/express.js'

// Unidad — manejo centralizado de errores (RNF-06): un solo módulo decide el
// código y el mensaje, y nunca expone SQL ni stack trace al cliente.
beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('responderError', () => {
  it('debe responder el código y el mensaje de un ErrorHttp sin registrarlo como falla del servidor', () => {
    const res = crearRes()

    responderError(res, new ErrorHttp(404, 'Cliente no encontrado'))

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Cliente no encontrado' })
    expect(console.error).not.toHaveBeenCalled()
  })

  it.each([
    ['ER_DUP_ENTRY', 409, 'Ya existe un registro con esos datos'],
    ['ER_ROW_IS_REFERENCED_2', 409, 'No se puede eliminar porque otros registros dependen de este'],
    ['ER_NO_REFERENCED_ROW_2', 400, 'Uno de los registros relacionados no existe'],
    ['ER_DATA_TOO_LONG', 400, 'Uno de los campos supera la longitud permitida'],
  ])('debe traducir el error de MySQL %s a %i con un mensaje claro', (code, status, message) => {
    const err = Object.assign(new Error(`${code}: Cannot delete or update a parent row (SELECT ...)`), { code })
    const res = crearRes()

    responderError(res, err, { contexto: 'clientes.remove', mensaje: 'Error al eliminar cliente' })

    expect(res.status).toHaveBeenCalledWith(status)
    expect(res.json).toHaveBeenCalledWith({ message })
  })

  it('debe registrar en el servidor un error inesperado y responder 500 con el mensaje dado, sin detalles', () => {
    // Arrange
    const err = new Error("ER_BAD_FIELD_ERROR: Unknown column 'x' in 'SELECT * FROM clientes'")
    const res = crearRes()

    // Act
    responderError(res, err, { contexto: 'clientes.getAll', mensaje: 'Error al obtener clientes' })

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener clientes' })
    expect(console.error).toHaveBeenCalledWith('[clientes.getAll]', err)
  })

  it('debe usar el mensaje genérico cuando no se indica uno', () => {
    const res = crearRes()

    responderError(res, new Error('falla'))

    expect(res.json).toHaveBeenCalledWith({ message: 'Error interno del servidor' })
  })
})

describe('manejadorErrores (middleware global)', () => {
  it.each([
    [{ type: 'entity.parse.failed' }, 400, 'El cuerpo de la petición no es un JSON válido'],
    [{ type: 'entity.too.large' }, 413, 'El cuerpo de la petición es demasiado grande'],
    [{ code: 'LIMIT_FILE_SIZE' }, 413, 'El archivo supera el tamaño máximo permitido (2 MB)'],
    [new ErrorHttp(403, 'No tienes permiso'), 403, 'No tienes permiso'],
    [new Error('stack interno'), 500, 'Error interno del servidor'],
  ])('debe responder %o con %i', (err, status, message) => {
    const res = crearRes()

    manejadorErrores(err, {}, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(status)
    expect(res.json).toHaveBeenCalledWith({ message })
  })
})
