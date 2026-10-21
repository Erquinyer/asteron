import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Mientras no existan pruebas del backend, el comando no debe fallar por eso:
    // lo que se exige es el umbral de cobertura.
    passWithNoTests: true,
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
      // Línea base de la semana 1. Desde aquí el umbral solo puede subir.
      thresholds: { lines: 0, branches: 0, functions: 0, statements: 0 },
    },
  },
});
