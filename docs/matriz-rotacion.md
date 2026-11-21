# Matriz de rotación de capas

> Se llena al inicio de cada semana. Plantilla del Bootcamp Testing ADSO.

**Grupo**: Asteron · **Ficha**: 3228973 · **Stack**: React + Express + MySQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.
- Las semanas 1, 3 y 7 son de tema común (E2E, Front, E2E) y no cuentan para la rotación.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| @DavidAlejo99 | E2E — login válido (PR #3, mergeado) | API — utilidades y controladores del backend (PR #4, mergeado) | Front: Login (PR #5, mergeado) | E2E — seguridad y errores del API (PR #6, mergeado) | API — dependencias: correo de recuperación y reloj (PR #7, mergeado) | BD — integración de pedidos contra MySQL real (PR #16, abierto: CI en verde, falta revisión) | | | |
| @nixonhalejo | E2E — login inválido (PR #1, cerrado sin mergear) | CI — pipeline de pruebas y cobertura (PR #2, mergeado) | Front — AdminPanel con Testing Library (rama `test/s3-front-nixon`, sin PR) | Front — contrato del API y reporte de mutantes (rama `test/s4-front-nixon`, sin PR) | Front — dobles con MSW y validaciones (rama `test/s5-front-nixon`, sin PR) | | | | |
| @Erquinyer | E2E — crear cliente (PR #12, mergeado) | Front — permisos y sesión (PR #13, mergeado) | | API — reglas de Programación (`validarTurnoInterno`) (PR #15, mergeado) | | BD — integración de clientes contra MySQL real (PR #14, mergeado) | | | |

> Pendientes al 17 nov 2026: @Erquinyer no tiene entrega de S3 (tema común Front) ni de S5. @nixonhalejo trabajó S4 y S5 en la misma capa (Front), lo que rompe la regla de rotación, y sus tres ramas siguen sin PR. El PR #16 de @DavidAlejo99 necesita la revisión de alguien que no haya trabajado en BD esa semana.

## Cobertura semanal

Anota la cobertura real al cerrar cada semana. El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---|---|---|
| S1 (línea base) | Pendiente (medir con `include: ['src/**']`) | 0 (sin pruebas; `src/config/` excluido) | Piso S2: 30% en ambos |
| S2 | 88,88 (mide solo `validaciones.js`: falta `include: ['src/**']` para la cifra real) | 30,84 | Backend: 30 (líneas) · Frontend: 30 |
| S4 | 2,89 real con `include: ['src/**']` (96,87 sin `include`) | 50,74 | Backend: 50 (líneas) · Frontend: pendiente del grupo |
| S5 | Pendiente del grupo (MSW y componentes) | 61,28 | Backend: 61 (líneas) · Frontend: pendiente del grupo |
| Hoy (post-merge) | **3,13 real** con `include: ['src/**']` activado (97,64 sin `include` — así estaba quedando inflada) | 66,49 (se suma Programación, PR #11) | Backend: 66 (líneas) · **Frontend: 3 (líneas) — muy por debajo del piso del plan; hace falta sumar tests de componentes (Sidebar, TopBar, páginas, hooks, router guards) para cerrar esto** |
| 17 nov 2026 (medido en `develop` @ 01b8039) | **3,13** líneas · 2,98 sentencias · 2,63 ramas · 2,02 funciones (23 tests, 4 archivos) | **66,49** líneas · 65,78 sentencias · 66,43 ramas · 67,36 funciones (218 tests, 15 archivos) | Sin cambios: Backend 66 (líneas) · Frontend 3 (líneas). Lo más débil del backend: `dashboard.controller.js` (3,79), `programacion.controller.js` (32,32) y `admin.controller.js` (41,60). |

## Regla de rama

- El workflow `.github/workflows/tests.yml` corre en cada PR hacia `main` y `develop` los jobs `test-frontend` y `test-backend`, que fallan si la cobertura baja del umbral.
- Regla del grupo: **nadie fusiona un PR con el CI en rojo ni sin la revisión de otro integrante**.
- Regla en GitHub (Settings → Rules → Rulesets): _pendiente de activar por el administrador del repositorio (@Erquinyer)_.

## Registro de vocero aleatorio

El vocero escribe su respuesta **antes** de que el instructor llegue a la mesa; el instructor la verifica con una pregunta corta y anota el resultado.

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
