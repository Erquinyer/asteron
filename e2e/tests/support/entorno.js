// Puertos y credenciales del entorno E2E, en un solo lugar para la
// configuración, el setup de sesión y los helpers de datos por API.
//
// Puertos propios (no 5173 ni 3000) para que Playwright nunca reutilice por
// error el frontend o el backend de desarrollo, que apuntan a la BD de
// desarrollo. Se pueden cambiar con FRONT_PORT y E2E_API_PORT.
export const FRONT_PORT = Number(process.env.FRONT_PORT ?? 5180);
export const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
export const API_URL = `http://localhost:${API_PORT}/api`;

// Usuarios que crea backend/scripts/seed-e2e.js en la BD de pruebas.
export const ADMIN = { correo: 'admin@macromet.com.co', contrasena: 'admin2026' };
export const OPERARIO = { correo: 'operario.e2e@macromet.com.co', contrasena: 'operario2026' };

// Sesión del administrador guardada una sola vez por tests/auth.setup.js.
export const SESION_ADMIN = 'playwright/.auth/admin.json';
