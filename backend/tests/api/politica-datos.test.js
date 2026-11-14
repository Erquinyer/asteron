import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Capa API — autorización de tratamiento de datos personales (RNF-07, Ley 1581 de 2012).
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn() } }))
process.env.JWT_SECRET = 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = (id = 7) => jwt.sign({ id, correo: 'angie@macromet.com.co', rol: 'Operario' }, process.env.JWT_SECRET)

describe('POST /api/perfil/politica-datos', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('debe exigir sesión: sin token responde 401 y no toca la BD', async () => {
    const res = await request(app).post('/api/perfil/politica-datos')

    expect(res.status).toBe(401)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe registrar la aceptación de la persona del token y devolver la fecha', async () => {
    // Arrange
    const fecha = '2026-11-13T19:30:00.000Z'
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ acepta_politica_datos: fecha }]])

    // Act
    const res = await request(app).post('/api/perfil/politica-datos').set('Authorization', `Bearer ${token(7)}`)

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: 'Autorización registrada', acepta_politica_datos: fecha })
    const [sql, params] = pool.query.mock.calls[0]
    expect(params).toEqual([7])
    // La primera aceptación es la prueba de la autorización: no se sobrescribe
    expect(sql).toContain('COALESCE(acepta_politica_datos, NOW())')
  })

  it('debe responder 404 cuando el usuario del token ya no existe', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 0 }])
      .mockResolvedValueOnce([[undefined]])

    const res = await request(app).post('/api/perfil/politica-datos').set('Authorization', `Bearer ${token(99)}`)

    expect(res.status).toBe(404)
  })

  it('debe responder 500 genérico, sin el SQL, cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ER_BAD_FIELD_ERROR: Unknown column acepta_politica_datos'))

    const res = await request(app).post('/api/perfil/politica-datos').set('Authorization', `Bearer ${token()}`)

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ message: 'Error al registrar la autorización' })
    expect(res.text).not.toMatch(/ER_BAD_FIELD_ERROR/)
  })
})
