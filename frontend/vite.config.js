import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    // Matchers de jest-dom y limpieza entre tests (ver src/test/setup.js)
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Sin `include`, v8 solo mide los archivos que los tests cargan — por
      // eso la cifra venía saliendo artificialmente alta (97%+ sobre 6
      // archivos). Con `include: ['src/**']` se mide todo el frontend real.
      include: ['src/**'],
      exclude: ['src/main.jsx', 'src/**/*.test.{js,jsx}', 'src/test/**'],
      // ⚠️ Cobertura real medida sobre todo src/: lines 3,13% · statements
      // 2,98% · functions 2,02% · branches 2,63% — muy por debajo del piso
      // del plan (30% desde la semana 2, 60% hoy). Sin `include`, esto venía
      // marcando 97%+ porque solo medía los 6 archivos que los tests
      // cargan. El umbral queda fijado en lo real (regla de trinquete: no
      // puede bajar) — hace falta que el grupo sume tests de componentes
      // (Sidebar, TopBar, páginas, hooks, router guards) para cerrar esto.
      thresholds: {
        lines: 3,
        functions: 2,
        branches: 2,
        statements: 2,
      },
    },
  },
});