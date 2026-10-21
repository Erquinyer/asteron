import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { login } from '../src/controllers/auth.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de prueba de la BD: cada test define qué responde cada consulta
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const SECRETO = 'secreto-de-pruebas'
let usuarioActivo

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO
  usuarioActivo = {
    id_usuario: 1,
    nombre: 'Administrador Sistema',
    correo: 'admin@macromet.com.co',
    rol: 'Administrador Sistema',
    id_rol: 9,
    estado: 1,
    // Costo 4: el hash se calcula rápido y la prueba sigue siendo real
    password_hash: bcrypt.hashSync('admin2026', 4),
  }
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('login', () => {
  it('debe devolver el usuario con sus módulos, acciones y un token válido', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([[usuarioActivo]])                     // buscar usuario
      .mockResolvedValueOnce([{}])                                  // registrar último acceso
      .mockResolvedValueOnce([[{ modulo: 'proyectos' }, { modulo: 'pedidos' }]])
      .mockResolvedValueOnce([[
        { modulo: 'proyectos', accion: 'crear' },
        { modulo: 'proyectos', accion: 'editar' },
        { modulo: 'pedidos', accion: 'ver' },
      ]])
    const req = { body: { correo: 'admin@macromet.com.co', contrasena: 'admin2026' } }
    const res = crearRes()

    // Act
    await login(req, res)

    // Assert
    const { user } = res.json.mock.calls[0][0]
    expect(res.status).not.toHaveBeenCalled()
    expect(user).toMatchObject({
      id_usuario: 1,
      rol: 'Administrador Sistema',
      modulos: ['proyectos', 'pedidos'],
      acciones: { proyectos: ['crear', 'editar'], pedidos: ['ver'] },
    })
    expect(jwt.verify(user.token, SECRETO)).toMatchObject({ id: 1, rol: 'Administrador Sistema' })
  })

  it.each([
    ['falta el correo', { contrasena: 'admin2026' }],
    ['falta la contraseña', { correo: 'admin@macromet.com.co' }],
  ])('debe responder 400 sin consultar la BD cuando %s', async (_caso, body) => {
    const res = crearRes()

    await login({ body }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe responder 401 con el mismo mensaje cuando el correo no existe y cuando la contraseña es incorrecta', async () => {
    // Arrange: mismo mensaje en los dos casos para no revelar qué correos existen
    pool.query.mockResolvedValueOnce([[]])
    const resCorreo = crearRes()
    await login({ body: { correo: 'nadie@macromet.com.co', contrasena: 'x' } }, resCorreo)

    pool.query.mockResolvedValueOnce([[usuarioActivo]])
    const resClave = crearRes()

    // Act
    await login({ body: { correo: 'admin@macromet.com.co', contrasena: 'ClaveErronea' } }, resClave)

    // Assert
    expect(resCorreo.status).toHaveBeenCalledWith(401)
    expect(resClave.status).toHaveBeenCalledWith(401)
    expect(resCorreo.json.mock.calls[0][0]).toEqual(resClave.json.mock.calls[0][0])
  })

  it('debe responder 403 a un usuario inactivo aunque la contraseña sea correcta', async () => {
    pool.query.mockResolvedValueOnce([[{ ...usuarioActivo, estado: 0 }]])
    const res = crearRes()

    await login({ body: { correo: 'admin@macromet.com.co', contrasena: 'admin2026' } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario inactivo. Contacta al administrador.' })
  })

  it('debe responder 500 cuando la BD falla', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const res = crearRes()

    await login({ body: { correo: 'admin@macromet.com.co', contrasena: 'admin2026' } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
