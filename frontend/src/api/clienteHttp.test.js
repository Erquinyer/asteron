import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest';
import axios from 'axios';
import { server } from '../mocks/server.js';
import { http, HttpResponse } from 'msw';

// Configuración del ciclo de vida de MSW para interceptar peticiones
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('Semana 5 - Pruebas con Dobles HTTP (MSW)', () => {

  // TEST 1 (STUB): Verificar respuesta exitosa en el login (Caso Feliz)
  // Tipo de Doble: STUB -> Devuelve respuestas HTTP preprogramadas (200 OK con Token).
  it('Verifica estado: El login devuelve token y datos de usuario correctamente (Stub)', async () => {
    const response = await axios.post('/api/auth/login', {
      email: 'usuario@test.com',
      password: 'Password123!'
    });

    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('token', 'fake-jwt-token-s5');
    expect(response.data.user.name).toBe('Nixon Test');
  });

  // TEST 2 (SPY + MOCK): Verificar resiliencia ante errores 500 del servidor
  it('Verifica comportamiento: El cliente captura error 500 cuando el servidor falla (Mock)', async () => {
    // Sobrescribimos temporalmente el handler para forzar 500
    server.use(
      http.post('/api/auth/login', () => {
        return HttpResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
      })
    );

    try {
      await axios.post('/api/auth/login', { email: 'test@test.com', password: '123' });
    } catch (error) {
      expect(error.response.status).toBe(500);
      expect(error.response.data.message).toBe('Error interno del servidor');
    }
  });
  // TEST 3 (STUB): Verificar resiliencia ante respuestas no JSON (ej. 502 Bad Gateway / HTML)
  // Tipo de Doble: STUB -> Simula una caída del servidor que retorna HTML en lugar de JSON.
  it('Verifica resiliencia: Resiste y maneja adecuadamente respuestas no JSON (Stub)', async () => {
    try {
      await axios.get('/api/bad-gateway');
    } catch (error) {
      expect(error.response.status).toBe(502);
      expect(typeof error.response.data).toBe('string');
      expect(error.response.data).toContain('502 Bad Gateway');
    }
  });

});