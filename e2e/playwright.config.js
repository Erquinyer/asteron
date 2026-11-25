import { defineConfig, devices } from '@playwright/test';
import { API_PORT, API_URL, FRONT_PORT, SESION_ADMIN } from './tests/support/entorno.js';

// Antes de correr: la BD de pruebas desechable debe estar arriba
//   docker compose up -d --wait mysql-test
// Playwright levanta lo demás: un backend propio contra esa BD (nunca la de
// desarrollo) y el frontend apuntando a ese backend.
// En el CI (job test-e2e de .github/workflows/tests.yml) el workflow arranca
// el backend en segundo plano y espera con curl; Playwright lo reutiliza.

export default defineConfig({
  testDir: './tests',
  // Todos los tests en paralelo: obliga a que cada uno prepare sus propios datos.
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${FRONT_PORT}`,
    // Guarda la traza solo cuando un test falla y se reintenta (se abre con "pnpm report")
    trace: 'on-first-retry',
  },
  // Lista en la terminal + reporte HTML que se abre con "pnpm report"
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  projects: [
    // 1) Inicia sesión una sola vez y guarda la sesión (tests/auth.setup.js)
    { name: 'setup', testMatch: /.*\.setup\.js/ },
    // 2) Los E2E arrancan ya con la sesión del administrador
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: SESION_ADMIN },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      // Siembra los datos mínimos (roles, permisos, usuarios E2E, fases) y
      // arranca el API contra la BD de pruebas del puerto 3308.
      command: 'node scripts/seed-e2e.js && node server.js',
      cwd: '../backend',
      // Sin token responde 401: basta para saber que el API ya está arriba.
      url: `${API_URL}/pedidos`,
      // Siempre se reutiliza si ya responde: en el CI lo arranca el workflow
      // (y aquí no podría volver a usar el puerto). Es el backend de pruebas
      // del puerto 3100, nunca el de desarrollo.
      reuseExistingServer: true,
      env: {
        PORT: String(API_PORT),
        DB_HOST: '127.0.0.1',
        DB_PORT: '3308',
        DB_USER: 'root',
        DB_PASSWORD: 'asteron_test',
        DB_NAME: 'asteron',
        JWT_SECRET: 'secreto-e2e',
        FRONTEND_URL: `http://localhost:${FRONT_PORT}`,
        // El límite de intentos de login (limites.js) no aplica a la suite E2E
        LIMITE_LOGIN: '1000',
      },
    },
    {
      // Se lanza vite con node directamente para que Playwright pueda detenerlo al terminar.
      command: `node node_modules/vite/bin/vite.js --port ${FRONT_PORT} --strictPort`,
      cwd: '../frontend',
      url: `http://localhost:${FRONT_PORT}`,
      reuseExistingServer: !process.env.CI,
      // Vite da prioridad a esta variable sobre frontend/.env (cuya IP cambia
      // según la red cuando se prueba la app en el celular).
      env: { VITE_API_URL: API_URL },
    },
  ],
});
