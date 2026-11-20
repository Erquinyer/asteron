import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Endurecimiento para producción (Fase 1 del despliegue): límites de intentos,
// cabeceras de seguridad, CORS por entorno, health con base de datos y Swagger
// opcional. Cada test carga la app de nuevo (vi.resetModules) con sus variables
// de entorno y un contador de intentos limpio. BD simulada: no necesita MySQL.
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn(), getConnection: vi.fn() } }))

const cargarApp = async (entorno = {}) => {
  for (const [clave, valor] of Object.entries(entorno)) vi.stubEnv(clave, valor)
  vi.resetModules()
  const { default: app } = await import('../../src/app.js')
  const { default: pool } = await import('../../src/config/db.js')
  return { app, pool }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('Límite de intentos de inicio de sesión', () => {
  it('debe bloquear con 429 en JSON después de 10 intentos fallidos desde la misma IP', async () => {
    // Arrange: el usuario no existe, cada intento falla con 401
    const { app, pool } = await cargarApp()
    pool.query.mockResolvedValue([[]])
    const intentar = () => request(app).post('/api/auth/login').send({ correo: 'x@macromet.com.co', contrasena: 'mala' })

    // Act
    for (let i = 0; i < 10; i++) expect((await intentar()).status).toBe(401)
    const bloqueado = await intentar()

    // Assert
    expect(bloqueado.status).toBe(429)
    expect(bloqueado.body).toEqual({ message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos e intenta de nuevo.' })
    expect(bloqueado.headers.ratelimit).toBeDefined() // le dice al cliente cuánto esperar
  })

  it('no debe contar los inicios de sesión exitosos (varias personas detrás de la misma IP de la planta)', async () => {
    // Arrange: credenciales correctas
    const { app, pool } = await cargarApp({ JWT_SECRET: 'secreto-de-pruebas' })
    const bcrypt = (await import('bcryptjs')).default
    const hash = bcrypt.hashSync('Correcta1234', 4)
    pool.query.mockImplementation(async (sql) =>
      sql.includes('FROM usuarios')
        ? [[{ id_usuario: 1, nombre: 'Ana', correo: 'ana@macromet.com.co', estado: 1, password_hash: hash, rol: 'Operario', id_rol: 8 }]]
        : [[]])

    // Act / Assert: 12 inicios de sesión correctos seguidos (más que el límite de 10)
    for (let i = 0; i < 12; i++) {
      const res = await request(app).post('/api/auth/login').send({ correo: 'ana@macromet.com.co', contrasena: 'Correcta1234' })
      expect(res.status).toBe(200)
    }
  })
})

describe('Límite de solicitudes de recuperación de contraseña', () => {
  it('debe bloquear con 429 la sexta solicitud en una hora', async () => {
    const { app, pool } = await cargarApp()
    pool.query.mockResolvedValue([[]]) // el correo no existe: responde 200 sin enviar nada
    const pedir = () => request(app).post('/api/auth/forgot-password').send({ correo: 'x@macromet.com.co' })

    for (let i = 0; i < 5; i++) expect((await pedir()).status).toBe(200)
    const bloqueado = await pedir()

    expect(bloqueado.status).toBe(429)
    expect(bloqueado.body.message).toMatch(/Espera una hora/)
  })
})

describe('Cabeceras de seguridad (helmet)', () => {
  it('debe enviar nosniff y no revelar que el servidor usa Express', async () => {
    const { app, pool } = await cargarApp()
    pool.query.mockResolvedValue([[]])

    const res = await request(app).get('/api/health')

    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-powered-by']).toBeUndefined()
    expect(res.headers['strict-transport-security']).toMatch(/max-age=/)
  })
})

describe('CSP del API según el entorno', () => {
  it.each([
    ['production', true],
    ['development', false],
  ])('con NODE_ENV=%s, upgrade-insecure-requests presente: %s', async (entorno, presente) => {
    const { app, pool } = await cargarApp({ NODE_ENV: entorno })
    pool.query.mockResolvedValue([[]])

    const res = await request(app).get('/api/health')

    expect(res.headers['content-security-policy'].includes('upgrade-insecure-requests')).toBe(presente)
  })
})

describe('GET /api/health comprueba la base de datos', () => {
  it('debe responder 200 cuando la base responde', async () => {
    const { app, pool } = await cargarApp()
    pool.query.mockResolvedValueOnce([[{ 1: 1 }]])

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(pool.query).toHaveBeenCalledWith('SELECT 1')
  })

  it('debe responder 503 cuando la base no responde, para que el monitor marque el sistema caído', async () => {
    const { app, pool } = await cargarApp()
    pool.query.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'error', sistema: 'Asteron', message: 'La base de datos no responde' })
    expect(res.text).not.toContain('ECONNREFUSED')
  })
})

describe('CORS según el entorno', () => {
  const origenPermitido = async (app, origen) =>
    (await request(app).options('/api/health').set('Origin', origen).set('Access-Control-Request-Method', 'GET'))
      .headers['access-control-allow-origin']

  it('en producción debe aceptar solo los orígenes de CORS_ORIGINS', async () => {
    const { app } = await cargarApp({
      NODE_ENV: 'production', CORS_ORIGINS: 'https://asteron.ejemplo.com, capacitor://localhost',
    })

    expect(await origenPermitido(app, 'https://asteron.ejemplo.com')).toBe('https://asteron.ejemplo.com')
    expect(await origenPermitido(app, 'capacitor://localhost')).toBe('capacitor://localhost')
    expect(await origenPermitido(app, 'http://localhost:5173')).toBeUndefined()
    expect(await origenPermitido(app, 'https://sitio-malicioso.com')).toBeUndefined()
  })

  it('en producción sin CORS_ORIGINS debe aceptar solo FRONTEND_URL', async () => {
    const { app } = await cargarApp({ NODE_ENV: 'production', CORS_ORIGINS: '', FRONTEND_URL: 'https://asteron.ejemplo.com' })

    expect(await origenPermitido(app, 'https://asteron.ejemplo.com')).toBe('https://asteron.ejemplo.com')
    expect(await origenPermitido(app, 'http://localhost:5173')).toBeUndefined()
  })

  it('en desarrollo debe aceptar el frontend local', async () => {
    const { app } = await cargarApp({ NODE_ENV: 'development', CORS_ORIGINS: '' })

    expect(await origenPermitido(app, 'http://localhost:5173')).toBe('http://localhost:5173')
  })
})

describe('Detrás de un proxy (TRUST_PROXY)', () => {
  it('debe contar los intentos por la IP real del cliente y no por la del proxy', async () => {
    // Arrange: dos clientes distintos llegan a través del mismo proxy
    const { app, pool } = await cargarApp({ TRUST_PROXY: '1' })
    pool.query.mockResolvedValue([[]])
    const intentar = (ip) => request(app).post('/api/auth/login')
      .set('X-Forwarded-For', ip).send({ correo: 'x@macromet.com.co', contrasena: 'mala' })

    // Act: el cliente A agota sus intentos
    for (let i = 0; i < 10; i++) await intentar('203.0.113.10')

    // Assert: A queda bloqueado, B no
    expect((await intentar('203.0.113.10')).status).toBe(429)
    expect((await intentar('198.51.100.20')).status).toBe(401)
  })
})

describe('Swagger opcional', () => {
  it('debe ocultar la documentación con DOCS_HABILITADOS=false', async () => {
    const { app } = await cargarApp({ DOCS_HABILITADOS: 'false' })

    expect((await request(app).get('/api/docs.json')).status).toBe(404)
  })

  it('debe publicarla por defecto', async () => {
    const { app } = await cargarApp()

    const res = await request(app).get('/api/docs.json')

    expect(res.status).toBe(200)
    expect(res.body.info.title).toBe('Asteron API')
  })
})
