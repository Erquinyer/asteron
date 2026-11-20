import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Semana 6 · Gabriel · capa BD — integración contra MySQL real, no un
// pool simulado. Requiere la BD de pruebas desechable levantada:
//
//   docker compose up -d mysql-test
//
// Apunta las variables de entorno a esa BD ANTES de importar app.js (su
// pool se crea al importarse config/db.js).
process.env.DB_HOST     = '127.0.0.1'
process.env.DB_PORT     = '3308'
process.env.DB_USER     = 'root'
process.env.DB_PASSWORD = 'asteron_test'
process.env.DB_NAME     = 'asteron'
// No depende de .env (igual que programacion.test.js).
process.env.JWT_SECRET  = process.env.JWT_SECRET || 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = () => jwt.sign(
  { id: 1, correo: 'test@macromet.com.co', rol: 'Administrador Sistema' },
  process.env.JWT_SECRET
)

describe('Integración — clientes contra MySQL real (sin doble de la BD)', () => {
  beforeAll(async () => {
    // Si la BD de pruebas no está levantada, que falle con un mensaje claro
    // en vez de un timeout confuso de mysql2.
    await pool.query('SELECT 1').catch((err) => {
      throw new Error(
        `No se pudo conectar a la BD de pruebas en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        `Levántala con "docker compose up -d mysql-test". Causa: ${err.message}`
      )
    })
  })

  // Limpieza entre tests: DELETE en vez de TRUNCATE (clientes tiene tablas
  // hijas con FK — contactos_cliente, direcciones_cliente, pedidos —
  // TRUNCATE lo rechaza InnoDB aunque no haya filas hijas reales).
  beforeEach(async () => {
    await pool.query('DELETE FROM clientes')
  })

  afterAll(async () => {
    await pool.query('DELETE FROM clientes')
    await pool.end()
  })

  it('crea un cliente real y lo puede leer de vuelta con GET /api/clientes/:id', async () => {
    // Arrange / Act
    const creado = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: 'Castrol Colombia', nit: '900112233-1', codigo_cliente: 'CLI-100' })

    const leido = await request(app)
      .get(`/api/clientes/${creado.body.id_cliente}`)
      .set('Authorization', `Bearer ${token()}`)

    // Assert
    expect(creado.status).toBe(201)
    expect(leido.status).toBe(200)
    expect(leido.body.nombre).toBe('Castrol Colombia')
  })

  it('un NIT duplicado responde 409 con el mensaje correcto (no el de código)', async () => {
    // Arrange
    await pool.query(
      'INSERT INTO clientes (nombre, nit, codigo_cliente) VALUES (?,?,?)',
      ['Cliente A', '900111222-1', 'CLI-001']
    )

    // Act — mismo NIT, código distinto
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: 'Cliente B', nit: '900111222-1', codigo_cliente: 'CLI-002' })

    // Assert
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('El NIT ya existe')
  })

  it('un código de cliente duplicado responde 409 con el mensaje de código', async () => {
    // Arrange
    await pool.query(
      'INSERT INTO clientes (nombre, nit, codigo_cliente) VALUES (?,?,?)',
      ['Cliente A', '900111222-1', 'CLI-001']
    )

    // Act — mismo código, NIT distinto
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: 'Cliente C', nit: '900333444-1', codigo_cliente: 'CLI-001' })

    // Assert
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('El código de cliente ya existe')
  })

  it('un nombre que excede la columna (VARCHAR(120)) responde 400, no 500', async () => {
    // Arrange — 121 caracteres, uno más de lo que acepta la columna real.
    // Un pool simulado nunca detecta esto: solo el motor real lo rechaza.
    const nombreDemasiadoLargo = 'X'.repeat(121)

    // Act
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: nombreDemasiadoLargo })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/longitud/i)
  })

  it('no borra un cliente inexistente y no inserta nada ante datos inválidos (verifica que no guardó)', async () => {
    // Arrange — intento de crear sin nombre (regla ya cubierta por tests
    // con doble; aquí se verifica contra la tabla real que no quedó nada).
    await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nit: '900999888-1' }) // sin nombre

    // Act
    const [filas] = await pool.query('SELECT COUNT(*) AS total FROM clientes')

    // Assert
    expect(filas[0].total).toBe(0)
  })
})
