import { http, HttpResponse } from 'msw';

export const handlers = [
  // 1. Caso feliz (Login exitoso - 200 OK)
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'usuario@test.com' && body.password === 'Password123!') {
      return HttpResponse.json({
        token: 'fake-jwt-token-s5',
        user: { id: 1, name: 'Nixon Test', email: 'usuario@test.com' }
      }, { status: 200 });
    }
    return HttpResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
  }),

  // 2. Simulación de Error 500 del servidor
  http.get('/api/error-server', () => {
    return HttpResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }),

  // 3. Simulación de Error 422 (Validación)
  http.post('/api/validar', () => {
    return HttpResponse.json({ message: 'Datos de entrada no válidos' }, { status: 422 });
  }),

  // 4. Simulación de respuesta no JSON (ej. caída de proxy o HTML inesperado)
  http.get('/api/bad-gateway', () => {
    return new HttpResponse('<h1>502 Bad Gateway</h1>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' }
    });
  }),
];