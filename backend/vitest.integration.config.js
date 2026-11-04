import { defineConfig } from 'vitest/config'

// Semana 6 — tests de integración contra MySQL real.
// Requiere: docker compose up -d mysql-test (ver tests/integration/*.test.js).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.test.js'],
    // Secuencial: todos comparten la misma BD de pruebas y se limpian
    // entre tests con DELETE — correr en paralelo pisaría los datos.
    fileParallelism: false,
  },
})
