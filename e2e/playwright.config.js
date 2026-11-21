import { defineConfig, devices } from '@playwright/test';

// Puerto del frontend. Se cambia con FRONT_PORT si el 5173 ya está ocupado.
const port = Number(process.env.FRONT_PORT ?? 5173);

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: `http://localhost:${port}`,
    // Guarda la traza solo cuando un test falla y se reintenta (se abre con "pnpm report")
    trace: 'on-first-retry',
  },
  // Lista en la terminal + reporte HTML que se abre con "pnpm report"
  reporter: [['list'], ['html', { open: 'never' }]],
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Playwright levanta el frontend de Asteron. El backend (puerto 3000) y MySQL
  // deben estar corriendo antes de ejecutar los tests.
  // Se lanza vite con node directamente para que Playwright pueda detenerlo al terminar.
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${port} --strictPort`,
    cwd: '../frontend',
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    // El E2E siempre usa el backend local, sin importar la IP que tenga frontend/.env
    // (esa IP cambia según la red cuando se prueba la app en el celular).
    // Vite da prioridad a esta variable sobre el archivo .env.
    env: { VITE_API_URL: process.env.E2E_API_URL ?? 'http://localhost:3000/api' },
  },
});
