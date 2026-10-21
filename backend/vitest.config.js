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
      // Semana 1: línea base 0%. Semana 2: piso del 30%, fijado en la cobertura real
      // alcanzada (redondeada hacia abajo). El umbral solo puede subir.
      thresholds: { lines: 99, branches: 36, functions: 41, statements: 31 },
    },
  },
});
