import bcrypt from 'bcryptjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { forgotPassword, resetPassword } from '../src/controllers/recovery.controller.js'
import { notificador } from '../src/services/notificador.js'
import { crearRes } from './helpers/express.js'

// Dobles de esta prueba:
// - BD: STUB. Solo devuelve respuestas preparadas; no se verifica cómo se llamó salvo
//   cuando importa lo que se guardó (el token).
// - Notificador: MOCK/SPY de la interfaz propia (src/services/notificador.js), no de
//   nodemailer. Se verifica si se llamó, cuántas veces y con qué datos.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))
vi.mock('../src/services/notificador.js', () => ({
  notificador: { enviarRecuperacionContrasena: vi.fn() },
}))

const MENSAJE_GENERICO = 'Si el correo está registrado recibirás un enlace en tu bandeja de entrada.'
const enviar = notificador.enviarRecuperacionContrasena

// Prepara el stub de la BD para un usuario activo que pide recuperar su contraseña
const prepararUsuarioActivo = () =>
  pool.query
    .mockResolvedValueOnce([[{ id_usuario: 7, nombre: 'Martín Pérez' }]]) // buscar usuario
    .mockResolvedValueOnce([{}])                                          // invalidar tokens anteriores
    .mockResolvedValueOnce([{}])                                          // guardar el token nuevo

// Token que quedó guardado en la BD (tercera consulta: INSERT)
const tokenGuardado = () => pool.query.mock.calls[2][1][1]

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('forgotPassword: envío del correo de recuperación', () => {
  it('debe enviar un solo correo a la persona, con un enlace que lleva el mismo token que se guardó', async () => {
    // Arrange
    prepararUsuarioActivo()
    enviar.mockResolvedValueOnce({ accepted: ['martin@macromet.com.co'] })
    const res = crearRes()

    // Act
    await forgotPassword({ body: { correo: 'martin@macromet.com.co' } }, res)

    // Assert (comportamiento): se llamó una vez y con los datos correctos
    expect(enviar).toHaveBeenCalledOnce()
    const datos = enviar.mock.calls[0][0]
    expect(datos).toMatchObject({ correo: 'martin@macromet.com.co', nombre: 'Martín Pérez', minutosVigencia: 30 })
    expect(datos.enlace).toBe(`http://localhost:5173/reset-password?token=${tokenGuardado()}`)
    expect(tokenGuardado()).toMatch(/^[0-9a-f]{64}$/)
    expect(res.json).toHaveBeenCalledWith({ message: MENSAJE_GENERICO })
  })

  it('no debe enviar ningún correo cuando el correo no está registrado, y debe responder lo mismo', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    // Act
    await forgotPassword({ body: { correo: 'nadie@macromet.com.co' } }, res)

    // Assert: no se llama al notificador y la respuesta no revela que el correo no existe
    expect(enviar).not.toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ message: MENSAJE_GENERICO })
  })

  it('no debe consultar la BD ni enviar correo cuando falta el correo', async () => {
    const res = crearRes()

    await forgotPassword({ body: {} }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('debe resistir la caída del servicio de correo: guarda el token, registra el error y responde lo mismo', async () => {
    // Arrange: el notificador falla (STUB que lanza error)
    prepararUsuarioActivo()
    enviar.mockRejectedValueOnce(new Error('Invalid login: 535 Username and Password not accepted'))
    const res = crearRes()

    // Act
    await forgotPassword({ body: { correo: 'martin@macromet.com.co' } }, res)

    // Assert (estado): la respuesta es la misma que si todo hubiera salido bien
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ message: MENSAJE_GENERICO })
    expect(tokenGuardado()).toMatch(/^[0-9a-f]{64}$/)
    expect(console.error).toHaveBeenCalledWith(
      '[recovery.forgotPassword] no se pudo enviar el correo',
      'Invalid login: 535 Username and Password not accepted')
  })

  it('debe invalidar los enlaces anteriores antes de crear uno nuevo', async () => {
    prepararUsuarioActivo()
    enviar.mockResolvedValueOnce({})

    await forgotPassword({ body: { correo: 'martin@macromet.com.co' } }, crearRes())

    const [sqlInvalidar, paramsInvalidar] = pool.query.mock.calls[1]
    const [sqlGuardar] = pool.query.mock.calls[2]
    expect(sqlInvalidar).toContain('SET usado = 1')
    expect(paramsInvalidar).toEqual([7])
    expect(sqlGuardar).toContain('INSERT INTO password_reset_tokens')
  })

  it('debe crear un token distinto en cada solicitud', async () => {
    prepararUsuarioActivo()
    await forgotPassword({ body: { correo: 'martin@macromet.com.co' } }, crearRes())
    const primero = tokenGuardado()

    vi.resetAllMocks()
    prepararUsuarioActivo()
    await forgotPassword({ body: { correo: 'martin@macromet.com.co' } }, crearRes())

    expect(tokenGuardado()).not.toBe(primero)
  })
})

describe('resetPassword: vigencia del enlace (doble del reloj)', () => {
  // FAKE del reloj: vi.useFakeTimers reemplaza la fecha del sistema para que el test
  // no dependa de la hora real (FIRST: Repeatable)
  const vence = new Date('2026-11-03T20:30:00')

  afterEach(() => {
    vi.useRealTimers()
  })

  const prepararToken = (registro) =>
    pool.query
      .mockResolvedValueOnce([[{ id: 3, id_usuario: 7, expires_at: vence, usado: 0, ...registro }]])
      .mockResolvedValueOnce([{}])   // UPDATE usuarios
      .mockResolvedValueOnce([{}])   // marcar token como usado

  it('debe aceptar el enlace en el último instante de su vigencia (valor límite)', async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(vence)
    prepararToken()
    const res = crearRes()

    // Act
    await resetPassword({ body: { token: 'abc', nuevaContrasena: 'Nueva123' } }, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña actualizada correctamente' })
  })

  it('debe rechazar el enlace un instante después de vencer', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(vence.getTime() + 1))
    prepararToken()
    const res = crearRes()

    await resetPassword({ body: { token: 'abc', nuevaContrasena: 'Nueva123' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'El enlace ha expirado. Solicita uno nuevo.' })
    expect(pool.query).toHaveBeenCalledOnce() // no se cambió la contraseña
  })

  it('debe guardar la contraseña cifrada y marcar el enlace como usado', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-03T20:00:00'))
    prepararToken()

    await resetPassword({ body: { token: 'abc', nuevaContrasena: 'Nueva123' } }, crearRes())

    const [, [hash, idUsuario]] = pool.query.mock.calls[1]
    expect(idUsuario).toBe(7)
    expect(bcrypt.compareSync('Nueva123', hash)).toBe(true)
    expect(pool.query.mock.calls[2][1]).toEqual([3])
  })

  it.each([
    ['ya fue utilizado', [[{ id: 3, id_usuario: 7, expires_at: vence, usado: 1 }]], 'Este enlace ya fue utilizado'],
    ['no existe', [[]], 'Enlace inválido o expirado'],
  ])('debe rechazar un enlace que %s', async (_caso, respuestaBd, mensaje) => {
    pool.query.mockResolvedValueOnce(respuestaBd)
    const res = crearRes()

    await resetPassword({ body: { token: 'abc', nuevaContrasena: 'Nueva123' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
  })

  it.each([
    ['5 caracteres (valor límite inválido)', '12345', 'La contraseña debe tener al menos 6 caracteres'],
    ['vacía', '', 'Token y nueva contraseña son requeridos'],
  ])('debe rechazar una contraseña nueva de %s sin consultar la BD', async (_caso, nuevaContrasena, mensaje) => {
    const res = crearRes()

    await resetPassword({ body: { token: 'abc', nuevaContrasena } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    const res = crearRes()

    await resetPassword({ body: { token: 'abc', nuevaContrasena: 'Nueva123' } }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al restablecer la contraseña' })
  })
})
