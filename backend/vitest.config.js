import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Los tests de integración (semana 6) necesitan la BD de pruebas
    // desechable levantada (docker compose up -d mysql-test) — se corren
    // aparte con "pnpm test:integration", no con la suite normal.
    exclude: ['node_modules/**', 'tests/integration/**'],
  },
})
