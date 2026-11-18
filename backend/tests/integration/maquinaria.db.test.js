import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Semana 7 · Gabriel — defecto que encontró la suite E2E: un código de equipo
// más largo que su columna respondía 500. Integración contra MySQL real
// (el doble de la BD no trunca ni valida UNIQUE). Requiere:
//
//   docker compose up -d mysql-test
process.env.DB_HOST     = '127.0.0.1'
process.env.DB_PORT     = '3308'
process.env.DB_USER     = 'root'
process.env.DB_PASSWORD = 'asteron_test'
process.env.DB_NAME     = 'asteron'
process.env.JWT_SECRET  = process.env.JWT_SECRET || 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = () => jwt.sign(
  { id: 1, correo: 'test@macromet.com.co', rol: 'Administrador Sistema' },
  process.env.JWT_SECRET
)

// Solo borra lo que crean estos tests: la BD de pruebas puede tener la
// maquinaria del seed (con mantenimientos que impiden borrarla).
const PREFIJO = 'ITMAQ-'

describe('Integración — maquinaria contra MySQL real (sin doble de la BD)', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1').catch((err) => {
      throw new Error(
        `No se pudo conectar a la BD de pruebas en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        `Levántala con "docker compose up -d mysql-test". Causa: ${err.message}`
      )
    })
    await pool.query('DELETE FROM maquinaria WHERE codigo LIKE ?', [`${PREFIJO}%`])
  })

  afterAll(async () => {
    await pool.query('DELETE FROM maquinaria WHERE codigo LIKE ?', [`${PREFIJO}%`])
    await pool.end()
  })

  it('un código que excede la columna (VARCHAR(20)) responde 400, no 500, y no guarda nada', async () => {
    // Arrange — 21 caracteres, uno más de lo que acepta la columna real
    const codigoDemasiadoLargo = `${PREFIJO}${'X'.repeat(15)}`

    // Act
    const res = await request(app)
      .post('/api/maquinaria')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: 'Cizalla', codigo: codigoDemasiadoLargo })

    // Assert
    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/longitud/i)
    const [filas] = await pool.query('SELECT COUNT(*) AS total FROM maquinaria WHERE codigo LIKE ?', [`${PREFIJO}%`])
    expect(filas[0].total).toBe(0)
  })

  it('un código de equipo repetido responde 409, no 500', async () => {
    // Arrange
    await pool.query('INSERT INTO maquinaria (nombre, codigo) VALUES (?, ?)', ['Dobladora', `${PREFIJO}01`])

    // Act
    const res = await request(app)
      .post('/api/maquinaria')
      .set('Authorization', `Bearer ${token()}`)
      .send({ nombre: 'Otra dobladora', codigo: `${PREFIJO}01` })

    // Assert
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('El código del equipo ya existe')
  })
})
