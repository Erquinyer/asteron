import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Mientras no existan pruebas del backend, el comando no debe fallar por eso:
    // lo que se exige es el umbral de cobertura.
    passWithNoTests: true,
    // Los tests de integración (semana 6) necesitan la BD de pruebas
    // desechable levantada (docker compose up -d mysql-test) — se corren
    // aparte con "npm run test:integration", no con la suite normal.
    exclude: ['node_modules/**', 'tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Se mide la lógica de negocio del backend (controladores, rutas, middlewares y utilidades).
      include: ['src/**/*.js'],
      // Quedan fuera los adaptadores externos, que se prueban con integración (semanas 5 y 6):
      // - src/config/db.js: conexión a MySQL
      // - src/config/mailer.js: envío de correos
      // El arranque (server.js) y los scripts de datos (scripts/) están fuera de src/.
      exclude: ['src/config/**'],
      // Semana 1: línea base 0%. S2: piso 30%. S4: piso 50%. S5-S6: piso 60%
      // (líneas), fijado en la cobertura real alcanzada, redondeada hacia
      // abajo. Sube tras sumar los tests de Programación (API, PR #11):
      // lines 66,49% · branches 66,29% · functions 67,36% · statements 65,78%.
      // Sube de nuevo con las pruebas de Reportes, Dashboard, auditoría, errores y
      // documentación: lines 76,09% · branches 67,57% · functions 79,26% · statements 74,58%.
      // El umbral solo puede subir.
      thresholds: { lines: 76, branches: 67, functions: 79, statements: 74 },
    },
  },
})
