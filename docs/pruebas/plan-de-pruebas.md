# Plan de pruebas — Asteron

**Proyecto:** Asteron, sistema de gestión de producción para Macromet S.A.S. · **Ficha:** 3228973
**Equipo:** Gabriel Alejandro Leal (@Erquinyer) · David Esteban Alejo (@DavidAlejo99) · Nixon Hernán Alejo (@nixonhalejo)
**Versión del plan:** 1.0 · 20 nov 2026 · **Stack:** React 18 + Vite · Node.js + Express · MySQL 8 · JWT

Documentos relacionados: [matriz de casos](matriz-casos-prueba.md) · [reporte de ejecución](reporte-ejecucion.md) · [colección Postman](postman/) · [matriz de rotación por capas](../matriz-rotacion.md)

---

## 1. Objetivo

Verificar que el sistema completo (frontend, API y base de datos) cumple los requisitos funcionales del alcance T6 y que las reglas de negocio críticas de Macromet se respetan, antes de pasar a producción (T7). Que los defectos se detecten, se registren con severidad, se corrijan y se verifiquen con una re-ejecución.

## 2. Alcance

### Dentro del alcance

| Módulo | Qué se prueba | Por qué es crítico |
|---|---|---|
| **Autenticación y sesión** | Login, JWT, rutas protegidas, recuperación de clave, rate limit | Toda la seguridad depende de esto |
| **Permisos (RBAC)** | Acceso por rol a módulos y acciones (crear, editar, eliminar) en el servidor | Un operario no debe poder escribir donde no le corresponde |
| **Programación de planta** | Reglas de turno: no-backdating, disponibilidad de operario y máquina, fase y equipo requerido, estados, avance, corrección de tiempos | **Módulo crítico del negocio**: es lo que reemplaza la planilla manual de la planta |
| **Proyectos y fases** | Avance por fase, fases por ítem, cálculo automático desde Programación | Es el seguimiento que ve la gerencia |
| **Clientes, pedidos, maquinaria, mantenimientos** | CRUD completo, validaciones, errores de datos (duplicados, longitudes) | Datos maestros del sistema |
| **Manejo de errores (RNF-06)** | Respuestas JSON claras, sin SQL ni stack trace | Seguridad y experiencia de usuario |
| **Accesibilidad (RNF-14)** | Formularios con nombre accesible, consultados por rol en las pruebas de frontend | Requisito no funcional del proyecto |

### Fuera del alcance (T6)

- Pruebas de carga sostenida en producción. Hay una prueba de rendimiento local documentada en [`docs/prueba-rendimiento.md`](../prueba-rendimiento.md); la de producción queda para T7 con el servidor real.
- Envío real de correo en las pruebas automatizadas: se reemplaza con un doble de prueba. El envío real se verifica a mano (caso CP-MAN-01).
- Aplicación móvil (Capacitor): se prueba la web, que es la misma interfaz.
- Componente IoT: no aplica a este proyecto.

## 3. Niveles de prueba

| Nivel | Herramienta | Dónde está | Qué cubre | Cuándo corre |
|---|---|---|---|---|
| **Unitario (backend)** | Vitest, BD simulada con `vi.mock` | `backend/tests/*.test.js` (17 archivos) | Controladores y utilidades aislados: reglas de negocio, cálculos, mensajes de error | Cada PR (CI) y en local con `pnpm test` |
| **API / componente** | Vitest + Supertest | `backend/tests/api/` (4 archivos) | La app Express completa: middlewares (JWT, permisos), rutas y controladores juntos | Cada PR (CI) |
| **Integración con BD real** | Vitest + MySQL en Docker | `backend/tests/integration/` | Restricciones reales del motor (UNIQUE, longitudes) que un doble no detecta | En local con `pnpm test:integration` |
| **Unitario / componente (frontend)** | Vitest + Testing Library + jsdom | `frontend/src/**/*.test.*` (8 archivos) | Permisos, sesión, validaciones, Login y evidencias fotográficas | Cada PR (CI) |
| **API de caja negra** | Postman / Newman | `docs/pruebas/postman/` (29 casos) | El sistema corriendo de verdad contra una BD real, de punta a punta por HTTP | Antes de cada entrega (manual) |
| **End-to-end** | Playwright (Chromium) | `e2e/tests/` | Flujos del usuario en el navegador: login, crear cliente | Antes de cada entrega (manual) |

Tipos de prueba aplicados en esos niveles: **funcionales** (casos positivos), **negativas** (datos inválidos, permisos, conflictos), **de seguridad** (token ausente o alterado, rol sin permiso, contraseñas no expuestas) y **de regresión** (la suite completa corre en cada PR).

## 4. Ambientes

El ambiente de pruebas está **separado del de desarrollo**: las pruebas que escriben datos nunca tocan la base `asteron` con la que trabaja el equipo.

| Ambiente | Base de datos | Backend | Frontend | Uso |
|---|---|---|---|---|
| **Desarrollo** | `asteron` (MySQL local, puerto 3306) | `localhost:3000` | `localhost:5173` | Trabajo diario del equipo |
| **Pruebas (local)** | **`asteron_test`**, recreada desde cero con el esquema + seed + migraciones | **`localhost:3001`** | **`localhost:5174`** (solo E2E) | Postman/Newman y Playwright |
| **Pruebas de integración** | Contenedor `mysql-test` (puerto 3308, `tmpfs`: nace vacío en cada arranque) | — | — | `pnpm test:integration` |
| **Unitarias y API** | Ninguna: BD simulada con `vi.mock` | — | — | Vitest local y CI |
| **CI** | Ninguna (BD simulada) | GitHub Actions `.github/workflows/tests.yml` | — | Cada PR a `develop` y `main` |

### Preparar y usar el ambiente de pruebas

```bash
# 1. Crear la BD asteron_test desde cero (no toca la BD de desarrollo)
bash docs/pruebas/preparar-ambiente.sh

# 2. Backend de pruebas (terminal aparte)
cd backend && DB_NAME=asteron_test PORT=3001 node server.js

# 3. Pruebas de API con Newman (la misma colección se puede importar en Postman)
cd docs/pruebas
pnpm dlx newman@6.2.1 run postman/asteron.postman_collection.json \
  -e postman/asteron-pruebas.postman_environment.json

# 4. E2E contra el ambiente de pruebas
cd e2e && FRONT_PORT=5174 E2E_API_URL=http://localhost:3001/api pnpm test
```

> ⚠️ `Data Base/asteron_v2.sql` empieza con `DROP DATABASE IF EXISTS asteron;`. **No** lo ejecutes renombrado a mano: usa `preparar-ambiente.sh`, que cambia el nombre en las líneas `DROP`, `CREATE` y `USE` y se detiene si queda alguna apuntando a `asteron`.

### Datos de prueba

- Usuarios del seed: `admin@macromet.com.co` (Administrador Sistema), `soldador1@macromet.com.co` (Operario). Las contraseñas están en el README.
- Datos de Macromet cargados por `backend/scripts/seed.js`: proyectos, fases, clientes y maquinaria con ids fijos en una BD recién creada.
- Los casos que crean datos usan sufijos únicos (`Date.now()`) y borran lo que crean, así la colección se puede repetir sin recrear la BD.

## 5. Criterios

**Entrada:** el código compila, `pnpm install` sin errores, el ambiente de pruebas recién creado.

**Salida (aprobación de una entrega):**
- 100 % de los casos de la matriz ejecutados; ningún defecto de severidad **Alta** abierto.
- CI en verde: tests de backend y frontend pasan y la cobertura no baja de los umbrales.
- Cobertura de líneas del backend ≥ umbral vigente (hoy 78 %) y del **módulo crítico (Programación) ≥ 50 %**.
- Cada defecto corregido tiene un caso que lo reproduce y una re-ejecución que lo verifica.

**Suspensión:** si falla el login o el ambiente no arranca, se detiene la ejecución, se registra el defecto y se reanuda tras corregirlo.

## 6. Gestión de defectos

- Se registran como **issues de GitHub** con la etiqueta `bug` y una etiqueta de **severidad**:
  - **Alta**: bloquea un flujo principal, pierde datos o abre un hueco de seguridad.
  - **Media**: el flujo funciona pero con un resultado incorrecto (código HTTP o mensaje equivocado, dato mal calculado).
  - **Baja**: cosmético, o defecto en la propia suite de pruebas.
- Estados: **Abierto → En corrección (PR enlazado) → Corregido → Verificado (re-ejecución) → Cerrado**.
- El commit de la corrección usa el tipo `fix(...)` y referencia el issue (`Closes #NN`).
- El ciclo "detectar → corregir → verificar" se documenta con: caso que falla, commit que corrige y re-ejecución que pasa (ver la tabla de defectos del [reporte](reporte-ejecucion.md#4-defectos)).

## 7. Roles

Las pruebas rotan por capas cada semana (Front, API, BD, E2E) según la [matriz de rotación](../matriz-rotacion.md). Quien revisa un PR de pruebas trabajó en otra capa esa semana. Los tres integrantes escriben pruebas; el job `evidencia-individual` del CI cuenta los commits de pruebas por autor.

## 8. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La BD simulada no reproduce restricciones reales de MySQL | Defectos que solo aparecen en producción | Nivel de integración con MySQL real (encontró 2 defectos en la semana 6) y Postman contra `asteron_test` |
| Cobertura baja del frontend (7 %) | Regresiones de interfaz sin detectar | Priorizado en la deuda técnica; E2E cubre los flujos principales |
| Pruebas que dependen de datos del seed | Fallan si cambia el seed | Ids documentados en el ambiente de Postman; la BD de pruebas se recrea con el script |
| Ejecutar el esquema contra la BD equivocada | Pérdida de datos de desarrollo | `preparar-ambiente.sh` con verificación y respaldos con `Data Base/respaldar.sh` |
