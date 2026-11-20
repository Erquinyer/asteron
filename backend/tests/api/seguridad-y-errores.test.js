import jwt from 'jsonwebtoken'
import request from 'supertest'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../../src/config/db.js'
import app from '../../src/app.js'

// Se prueba la app real de Express (rutas, middlewares y manejador de errores)
// con supertest, sin levantar el servidor. Lo único reemplazado es la BD:
// un doble de prueba para que los tests no necesiten MySQL ni Docker.
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))

const SECRETO = 'secreto-de-pruebas'
const tokenDe = (rol, opciones = {}) => jwt.sign({ id: 1, correo: 'x@macromet.com.co', rol }, SECRETO, opciones)
const conToken = (peticion, rol) => peticion.set('Authorization', `Bearer ${tokenDe(rol)}`)

// Busca entre las consultas hechas a la BD si alguna inserta usuarios
const seInsertoUnUsuario = () => pool.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO usuarios'))

beforeAll(() => {
  process.env.JWT_SECRET = SECRETO
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('Autenticación: rutas protegidas sin un token válido (401)', () => {
  it('debe responder 401 en JSON cuando no se envía token', async () => {
    // Act
    const res = await request(app).get('/api/proyectos')

    // Assert: código, tipo de contenido y cuerpo
    expect(res.status).toBe(401)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toEqual({ message: 'Acceso denegado: token requerido' })
    expect(pool.query).not.toHaveBeenCalled()
  })

  it.each([
    ['firmado con otro secreto', () => jwt.sign({ id: 1, rol: 'Gerente General' }, 'otro-secreto')],
    ['expirado', () => tokenDe('Gerente General', { expiresIn: -60 })],
    ['que no es un JWT', () => 'esto-no-es-un-token'],
  ])('debe responder 401 con un token %s', async (_caso, crearToken) => {
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${crearToken()}`)

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ message: 'Token inválido o expirado' })
  })

  it('debe responder 200 con un token válido', async () => {
    pool.query.mockResolvedValueOnce([[{ id_cliente: 1, nombre: 'Postobón' }]])

    const res = await conToken(request(app).get('/api/clientes'), 'Ejecutivo Comercial')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id_cliente: 1, nombre: 'Postobón' }])
  })
})

describe('Autorización por rol (403 frente a autorizado)', () => {
  it('debe responder 403 a un Operario en el panel de administración', async () => {
    const res = await conToken(request(app).get('/api/admin/roles'), 'Operario')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'Acceso reservado para Administrador Sistema' })
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe permitir al Administrador Sistema el panel de administración', async () => {
    pool.query.mockResolvedValueOnce([[{ id_rol: 9, nombre: 'Administrador Sistema', total_usuarios: 1 }]])

    const res = await conToken(request(app).get('/api/admin/roles'), 'Administrador Sistema')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
  })

  it('debe responder 403 a un Operario que intenta programar un turno de planta', async () => {
    const res = await conToken(request(app).post('/api/programacion').send({ fecha: '2999-01-01' }), 'Operario')

    expect(res.status).toBe(403)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('Hallazgo de seguridad: gestión de usuarios (/api/usuarios)', () => {
  const nuevoUsuario = { nombre: 'Intruso', correo: 'intruso@macromet.com.co', password: 'Clave1234', id_rol: 9 }

  it('debe responder 403 a un rol sin el permiso "usuarios" y no crear el usuario', async () => {
    // Arrange: el rol Operario no tiene el módulo "usuarios" en roles_permisos
    pool.query.mockResolvedValueOnce([[]])

    // Act: un operario intenta crearse una cuenta de administrador
    const res = await conToken(request(app).post('/api/usuarios').send(nuevoUsuario), 'Operario')

    // Assert
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ message: 'No tienes permiso para realizar esta acción' })
    expect(seInsertoUnUsuario()).toBe(false)
  })

  it.each([
    ['cambiar el rol de otro usuario', (req) => req.put('/api/usuarios/2').send({ nombre: 'X', correo: 'x@x.co', id_rol: 9 })],
    ['desactivar a otro usuario', (req) => req.patch('/api/usuarios/2/estado')],
  ])('debe responder 403 a un Operario que intenta %s', async (_caso, peticion) => {
    pool.query.mockResolvedValueOnce([[]])

    const res = await conToken(peticion(request(app)), 'Operario')

    expect(res.status).toBe(403)
    expect(pool.query).toHaveBeenCalledOnce() // solo la consulta del permiso
  })

  it('debe permitir crear usuarios a un rol que tiene el permiso "usuarios"', async () => {
    // Arrange: el rol Administrativo sí tiene el módulo "usuarios"
    pool.query
      .mockResolvedValueOnce([[{ permitido: 1 }]])                          // permiso del rol
      .mockResolvedValueOnce([[{ codigo_empleado: 'EMP-012' }]])            // último código
      .mockResolvedValueOnce([{ insertId: 14 }])                            // INSERT
      .mockResolvedValueOnce([[{ id_usuario: 14, codigo_empleado: 'EMP-013', nombre: 'Intruso' }]])

    // Act
    const res = await conToken(request(app).post('/api/usuarios').send(nuevoUsuario), 'Administrativo')

    // Assert
    expect(res.status).toBe(201)
    expect(res.body.codigo_empleado).toBe('EMP-013')
    expect(seInsertoUnUsuario()).toBe(true)
  })

  it('debe permitir al Administrador Sistema sin consultar permisos', async () => {
    pool.query
      .mockResolvedValueOnce([[]])                                         // no hay códigos previos
      .mockResolvedValueOnce([{ insertId: 1 }])
      .mockResolvedValueOnce([[{ id_usuario: 1, codigo_empleado: 'EMP-001' }]])

    const res = await conToken(request(app).post('/api/usuarios').send(nuevoUsuario), 'Administrador Sistema')

    expect(res.status).toBe(201)
    expect(pool.query.mock.calls[0][0]).not.toContain('roles_permisos')
  })

  it('debe seguir permitiendo listar usuarios a cualquier rol autenticado (se usa en formularios)', async () => {
    pool.query.mockResolvedValueOnce([[{ id_usuario: 1, nombre: 'Martín' }]])

    const res = await conToken(request(app).get('/api/usuarios'), 'Operario')

    expect(res.status).toBe(200)
  })
})

describe('Contrato de errores: siempre JSON y sin información interna', () => {
  it('debe responder 400 en JSON, sin stack trace, cuando el cuerpo no es un JSON válido', async () => {
    // Act
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"correo":')

    // Assert
    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toEqual({ message: 'El cuerpo de la petición no es un JSON válido' })
    expect(res.text).not.toMatch(/node_modules|at \w+ \(|<html/i)
  })

  it('debe responder 404 en JSON a una ruta del API que no existe', async () => {
    const res = await request(app).get('/api/no-existe')

    expect(res.status).toBe(404)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toEqual({ message: 'Recurso no encontrado' })
  })

  it('debe responder 500 con un mensaje genérico, sin el SQL, cuando falla la BD', async () => {
    // Arrange: un error de MySQL trae la consulta en su mensaje
    pool.query.mockRejectedValueOnce(new Error("ER_BAD_FIELD_ERROR: Unknown column 'x' in 'SELECT c.* FROM clientes c'"))

    // Act
    const res = await conToken(request(app).get('/api/clientes'), 'Ejecutivo Comercial')

    // Assert
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error al obtener clientes' })
    expect(res.text).not.toMatch(/SELECT|ER_BAD_FIELD_ERROR/)
  })

  it('debe responder 500 genérico cuando falla la consulta de permisos', async () => {
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:3306'))

    const res = await conToken(request(app).post('/api/usuarios').send({}), 'Operario')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error interno del servidor' })
    expect(res.text).not.toContain('ECONNREFUSED')
  })

  it('debe responder 400 en JSON cuando al login le faltan datos', async () => {
    const res = await request(app).post('/api/auth/login').send({ correo: 'admin@macromet.com.co' })

    expect(res.status).toBe(400)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.body).toEqual({ message: 'Correo y contraseña son requeridos' })
  })

  it('debe responder el estado del sistema en /api/health sin autenticación', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', sistema: 'Asteron' })
  })
})

describe('Hallazgo de contrato: cambio de contraseña (/api/perfil/password)', () => {
  // bcrypt real con costo bajo: el hash se calcula rápido y la comparación es la de verdad
  let hashActual
  beforeAll(async () => {
    const bcrypt = (await import('bcryptjs')).default
    hashActual = bcrypt.hashSync('ClaveActual1', 4)
  })

  it('debe responder 400 (no 401) cuando la contraseña actual es incorrecta, para no cerrar la sesión', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce([[{ password_hash: hashActual }]])

    // Act
    const res = await conToken(
      request(app).patch('/api/perfil/password').send({ actual: 'Equivocada', nueva: 'NuevaClave1' }),
      'Operario')

    // Assert
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'La contraseña actual es incorrecta' })
    expect(pool.query).toHaveBeenCalledOnce() // no se actualizó nada
  })

  it.each([
    ['5 caracteres (valor límite inválido)', '12345', 400],
    ['6 caracteres (valor límite válido)', '123456', 200],
  ])('con una contraseña nueva de %s (%s) responde %i', async (_caso, nueva, estado) => {
    pool.query
      .mockResolvedValueOnce([[{ password_hash: hashActual }]])
      .mockResolvedValueOnce([{}])

    const res = await conToken(
      request(app).patch('/api/perfil/password').send({ actual: 'ClaveActual1', nueva }),
      'Operario')

    expect(res.status).toBe(estado)
  })

  it('debe responder 400 cuando el nombre del perfil queda vacío', async () => {
    const res = await conToken(request(app).put('/api/perfil').send({ nombre: '   ' }), 'Operario')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'El nombre es requerido' })
  })
})

describe('Contrato de errores: validación y límites de tamaño', () => {
  it('debe responder 400 cuando faltan los datos obligatorios de un usuario nuevo', async () => {
    const res = await conToken(request(app).post('/api/usuarios').send({ nombre: 'Sin correo' }), 'Administrador Sistema')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Nombre, correo y contraseña son requeridos' })
  })

  it('debe responder 409 cuando el correo del usuario ya está registrado', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockRejectedValueOnce(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }))

    const res = await conToken(
      request(app).post('/api/usuarios').send({ nombre: 'Ana', correo: 'ana@macromet.com.co', password: 'Clave1234' }),
      'Administrador Sistema')

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ message: 'El correo o código ya está registrado' })
  })

  it('debe responder 413 en JSON cuando el cuerpo supera el límite de express.json()', async () => {
    const enorme = JSON.stringify({ correo: 'a'.repeat(200 * 1024), contrasena: 'x' })

    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send(enorme)

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ message: 'El cuerpo de la petición es demasiado grande' })
  })

  it('debe responder 413 en JSON cuando el archivo a importar supera los 2 MB', async () => {
    const archivo = Buffer.alloc(2 * 1024 * 1024 + 1, 'a')

    const res = await conToken(
      request(app).post('/api/programacion/importar/preview').attach('archivo', archivo, 'turnos.csv'),
      'Coordinador de Planta')

    expect(res.status).toBe(413)
    expect(res.body).toEqual({ message: 'El archivo supera el tamaño máximo permitido (2 MB)' })
  })
})

describe('Casos autorizados de usuarios y perfil', () => {
  it('debe actualizar un usuario sin tocar la contraseña cuando no se envía una nueva', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([{}])                                                 // UPDATE
      .mockResolvedValueOnce([[{ id_usuario: 2, nombre: 'Martín', rol: 'Operario' }]])

    // Act
    const res = await conToken(
      request(app).put('/api/usuarios/2').send({ nombre: 'Martín', correo: 'martin@macromet.com.co', id_rol: 8 }),
      'Administrador Sistema')

    // Assert
    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[0][0]).not.toContain('password_hash')
  })

  it('debe guardar la contraseña cifrada cuando se envía una nueva', async () => {
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_usuario: 2 }]])

    await conToken(
      request(app).put('/api/usuarios/2').send({ nombre: 'Martín', correo: 'm@m.co', password: 'Nueva1234' }),
      'Administrador Sistema')

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toContain('password_hash')
    expect(params).not.toContain('Nueva1234') // nunca en texto plano
  })

  it('debe responder 404 al actualizar un usuario que no existe', async () => {
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[]])

    const res = await conToken(request(app).put('/api/usuarios/999').send({ nombre: 'X', correo: 'x@x.co' }), 'Administrador Sistema')

    expect(res.status).toBe(404)
  })

  it('debe activar o desactivar un usuario y devolver su estado nuevo', async () => {
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_usuario: 2, estado: 0 }]])

    const res = await conToken(request(app).patch('/api/usuarios/2/estado'), 'Administrador Sistema')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id_usuario: 2, estado: 0 })
  })

  it('debe devolver el perfil de la persona autenticada y nunca el de otra', async () => {
    pool.query.mockResolvedValueOnce([[{ id_usuario: 1, nombre: 'Ana' }]])

    const res = await conToken(request(app).get('/api/perfil'), 'Operario')

    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[0][1]).toEqual([1]) // id tomado del token
  })

  it('debe actualizar el nombre del perfil quitando los espacios sobrantes', async () => {
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_usuario: 1, nombre: 'Ana María' }]])

    const res = await conToken(request(app).put('/api/perfil').send({ nombre: '  Ana María  ' }), 'Operario')

    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[0][1]).toEqual(['Ana María', 1])
  })

  it('debe listar los roles disponibles para los formularios', async () => {
    pool.query.mockResolvedValueOnce([[{ id_rol: 8, nombre: 'Operario' }]])

    const res = await conToken(request(app).get('/api/usuarios/roles'), 'Administrativo')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ id_rol: 8, nombre: 'Operario' }])
  })
})

describe('Errores de perfil y usuarios: códigos correctos y mensajes sin detalles internos', () => {
  it('debe responder 404 cuando el usuario del token ya no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])

    const res = await conToken(request(app).get('/api/perfil'), 'Operario')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ message: 'Usuario no encontrado' })
  })

  it('debe responder 400 cuando no se envían la contraseña actual y la nueva', async () => {
    const res = await conToken(request(app).patch('/api/perfil/password').send({}), 'Operario')

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ message: 'Contraseña actual y nueva son requeridas' })
  })

  it.each([
    ['obtener el perfil', (req) => req.get('/api/perfil'), 'Error al obtener perfil'],
    ['actualizar el perfil', (req) => req.put('/api/perfil').send({ nombre: 'Ana' }), 'Error al actualizar perfil'],
    ['cambiar la contraseña', (req) => req.patch('/api/perfil/password').send({ actual: 'a', nueva: '123456' }), 'Error al cambiar contraseña'],
    ['listar usuarios', (req) => req.get('/api/usuarios'), 'Error al obtener usuarios'],
    ['listar roles', (req) => req.get('/api/usuarios/roles'), 'Error al obtener roles'],
    ['crear un usuario', (req) => req.post('/api/usuarios').send({ nombre: 'A', correo: 'a@a.co', password: 'Clave1234' }), 'Error al crear usuario'],
    ['actualizar un usuario', (req) => req.put('/api/usuarios/2').send({ nombre: 'A', correo: 'a@a.co' }), 'Error al actualizar usuario'],
    ['cambiar el estado de un usuario', (req) => req.patch('/api/usuarios/2/estado'), 'Error al cambiar estado'],
  ])('debe responder 500 con un mensaje genérico cuando falla la BD al %s', async (_caso, peticion, mensaje) => {
    pool.query.mockRejectedValue(new Error('ER_ACCESS_DENIED_ERROR: Access denied for user root'))

    const res = await conToken(peticion(request(app)), 'Administrador Sistema')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: mensaje })
    expect(res.text).not.toContain('ER_ACCESS_DENIED_ERROR')
  })
})
