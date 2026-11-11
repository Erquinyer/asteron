import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../server.js'; // Ajustado a la ruta real de server.js

describe('API Contract Tests - Capa Front (Auth)', () => {

  // 1. Estructura y tipos requeridos por la UI de React
  it('POST /api/auth/login responde con la estructura JSON que espera el frontend', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'usuario@test.com', password: 'Password123!' });

    expect(response.headers['content-type']).toMatch(/json/);
    if (response.status === 200) {
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(typeof response.body.token).toBe('string');
    }
  });

  // 2. Formato de error estructurado para alertas del cliente
  it('POST /api/auth/login con credenciales inválidas devuelve JSON con propiedad message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'errado@test.com', password: 'incorrecta' });

    expect([400, 401]).toContain(response.status);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body).toHaveProperty('message');
  });

  // 3. Validación de campos requeridos (Bad Request)
  it('POST /api/auth/login sin email devuelve status 400 y mensaje en JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password123!' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
  });

  // 4. Seguridad de contrato: Evitar fugas de información interna o stack traces
  it('Las respuestas de error no exponen stack traces ni detalles de SQL', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(response.body.stack).toBeUndefined();
    expect(response.body.sqlMessage).toBeUndefined();
  });
});