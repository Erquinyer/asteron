import jwt from 'jsonwebtoken'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { verifyToken } from '../src/middlewares/auth.middleware.js'
import { requireAdmin } from '../src/middlewares/requireAdmin.js'
import { requirePlantScheduler } from '../src/middlewares/requirePlantScheduler.js'

// Respuesta de Express mínima: guarda el estado y el cuerpo para revisarlos en el Assert
const crearRes = () => {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('requirePlantScheduler', () => {
  it.each([
    'Coordinador de Planta',
    'Coordinador de Producción',
    'Gerente General',
    'Administrador Sistema',
  ])('debe dejar pasar al rol %s', (rol) => {
    // Arrange
    const req = { user: { rol } }
    const res = crearRes()
    const next = vi.fn()

    // Act
    requirePlantScheduler(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it.each([
    ['un operario', { rol: 'Operario' }],
    ['un usuario sin rol', {}],
    ['una petición sin usuario', undefined],
  ])('debe responder 403 a %s', (_caso, user) => {
    const req = { user }
    const res = crearRes()
    const next = vi.fn()

    requirePlantScheduler(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('requireAdmin', () => {
  it('debe dejar pasar solo al Administrador Sistema', () => {
    const next = vi.fn()

    requireAdmin({ user: { rol: 'Administrador Sistema' } }, crearRes(), next)

    expect(next).toHaveBeenCalledOnce()
  })

  it('debe responder 403 al Gerente General', () => {
    const res = crearRes()
    const next = vi.fn()

    requireAdmin({ user: { rol: 'Gerente General' } }, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})

describe('verifyToken', () => {
  const secreto = 'secreto-de-pruebas'

  beforeAll(() => {
    process.env.JWT_SECRET = secreto
  })

  it('debe aceptar un token válido y dejar los datos del usuario en req.user', () => {
    // Arrange
    const token = jwt.sign({ id: 1, rol: 'Gerente General' }, secreto)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = crearRes()
    const next = vi.fn()

    // Act
    verifyToken(req, res, next)

    // Assert
    expect(next).toHaveBeenCalledOnce()
    expect(req.user).toMatchObject({ id: 1, rol: 'Gerente General' })
  })

  it.each([
    ['no envía el encabezado', undefined],
    ['no usa el prefijo Bearer', 'Token abc'],
  ])('debe responder 401 cuando la petición %s', (_caso, authorization) => {
    const req = { headers: { authorization } }
    const res = crearRes()
    const next = vi.fn()

    verifyToken(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Acceso denegado: token requerido' })
  })

  it('debe responder 401 cuando el token está firmado con otro secreto', () => {
    const token = jwt.sign({ id: 1 }, 'otro-secreto')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = crearRes()

    verifyToken(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' })
  })

  it('debe responder 401 cuando el token ya expiró', () => {
    const token = jwt.sign({ id: 1, exp: Math.floor(Date.now() / 1000) - 60 }, secreto)
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = crearRes()

    verifyToken(req, res, vi.fn())

    expect(res.status).toHaveBeenCalledWith(401)
  })
})
