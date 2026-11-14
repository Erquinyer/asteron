import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'

// Capa API — documentación OpenAPI (RNF-19). Comprueba que la especificación
// se publica sin token y que cubre todas las rutas registradas en src/routes.
vi.mock('../../src/config/db.js', () => ({ default: { query: vi.fn() } }))
process.env.JWT_SECRET = 'secreto-de-pruebas'

const { default: app } = await import('../../src/app.js')
const { openapi } = await import('../../src/docs/openapi.js')

describe('Documentación del API (/api/docs)', () => {
  it('debe publicar la especificación OpenAPI 3 en JSON sin pedir token', async () => {
    // Act
    const res = await request(app).get('/api/docs.json')

    // Assert
    expect(res.status).toBe(200)
    expect(res.body.openapi).toMatch(/^3\./)
    expect(res.body.info.title).toBe('Asteron API')
  })

  it('debe servir la interfaz de Swagger UI', async () => {
    const res = await request(app).get('/api/docs/')

    expect(res.status).toBe(200)
    expect(res.text).toContain('swagger-ui')
  })

  it.each([
    ['/api/auth/login', 'post'],
    ['/api/clientes', 'get'],
    ['/api/proyectos/{id}/fases/{faseId}', 'patch'],
    ['/api/programacion/{id}/estado', 'patch'],
    ['/api/reportes/{tipo}/exportar', 'get'],
    ['/api/admin/roles', 'post'],
  ])('debe documentar %s (%s)', (ruta, metodo) => {
    expect(openapi.paths[ruta]?.[metodo]).toBeDefined()
  })

  it('debe marcar como públicas solo las rutas de autenticación y salud', () => {
    // Arrange: rutas cuyo security es [] (sin token)
    const publicas = Object.entries(openapi.paths).flatMap(([ruta, ops]) =>
      Object.entries(ops).filter(([, o]) => Array.isArray(o.security) && o.security.length === 0).map(() => ruta))

    // Assert
    expect(publicas.sort()).toEqual(['/api/auth/forgot-password', '/api/auth/login', '/api/auth/reset-password', '/api/health'])
  })
})
