# Semana 8 — CI completo, ángulo E2E · David

> Rotación: en S6 trabajé BD; en S8 tomo **E2E**: el job que corre la suite de Playwright en cada PR.

## Estado inicial del CI (antes de este cambio)

Run del PR #20 del 17 nov (`tests.yml`, `on: pull_request`):

| Job | Duración | Tests | Saltados |
|---|---|---|---|
| test-frontend | 17 s | 27 | 0 |
| test-backend | 13 s | 218 | 0 |
| evidencia-individual | 5 s | — | — |

El CI estaba en verde, pero **no corría la mitad de la suite**:

- Los E2E (semana 7) no estaban en ningún job.
- Las pruebas de integración contra MySQL (semana 6) tampoco: `vitest.config.js` las excluye (`tests/integration/**`) y ningún job las corre. Ni siquiera aparecen como *skipped*: simplemente no existen para el CI. Esa es la forma más silenciosa de un CI que miente.
- Checks obligatorios en el ruleset de `main`: _pendiente de confirmar con el administrador del repositorio (@Erquinyer)_.

## El job `test-e2e`

| Paso | Qué hace |
|---|---|
| Servicio `mysql:8.0` | La BD llega como contenedor del job, en el puerto 3308. El `--health-cmd mysqladmin ping` hace que el job no siga hasta que MySQL responde |
| Crear el esquema | `mysql … < "Data Base/asteron_v2.sql"`: el servicio arranca vacío |
| Caché | `actions/setup-node` con `cache: pnpm` sobre los tres `pnpm-lock.yaml` (backend, frontend, e2e) |
| Backend en segundo plano | `node scripts/seed-e2e.js` (usuarios, roles y fases mínimos) y `node server.js &` en el puerto 3100 |
| Espera sin pausas fijas | `curl --retry 30 --retry-delay 2 --retry-all-errors …/api/health`; `/api/health` responde 200 solo si el API y su BD están arriba |
| E2E | `pnpm test`: Playwright reutiliza el backend y levanta el frontend (5180). En el CI hay 1 reintento con traza |
| Artefacto | Si falla, `e2e-report` con el reporte HTML (trazas incluidas) y `backend/api.log` |

**Los 3 flujos críticos en el CI**: login (`login-exitoso`, `auth.setup`), clientes (`crear-cliente`) y pedidos (`pedidos`, `pedidos-tiempos`, `pedidos-permisos`). El de programación de Gabriel (PR #24) entra al job en cuanto se fusione, sin cambios en el workflow.

**Cero saltados**: el log del job muestra 10 passed y ningún skipped.

## Hallazgo al llevar los E2E al código nuevo de `develop`

Después del merge de la semana (20 nov) **todos los E2E fallaban**: tras el login aparece el modal de **autorización de datos (Ley 1581)**, que tapa la app hasta aceptarlo, así que ningún clic llegaba. El CI no lo vio porque no corría E2E. Se corrigió en el seed E2E: los usuarios de prueba quedan con la política vigente aceptada (`POLITICA_DATOS_VERSION`), porque el modal no es lo que prueban estos tests.

## Test nuevo nacido del análisis: permiso denegado

`e2e/tests/pedidos-permisos.spec.js`. Todos los E2E de pedidos corrían como administrador y ninguno comprobaba que un rol sin el módulo quedara fuera:

1. Un **operario** no ve "Pedidos" en el menú, y si escribe `/pedidos` en la barra vuelve al dashboard.
2. El **API** responde **403** si ese operario intenta crear un pedido saltándose la interfaz.

### Mutación

| Cambio en la app | Test que lo detectó | Mensaje |
|---|---|---|
| `RoleRoute.jsx`: quitar `!canAccess(user.rol, module)` | "un operario no ve el módulo Pedidos…" | `toHaveURL` — Expected pattern: `/\/dashboard$/`, Received: `…/pedidos` |
| `requireModulo.js` (`requireAccion`): no revisar la acción | "el API responde 403…" | Expected: 403, Received: 400 |

## Rojo provocado

| | Enlace |
|---|---|
| Run en rojo (aserción con un texto que la app no muestra) | _pendiente_ |
| Run en verde con la corrección | _pendiente_ |

## ¿Cómo lo ejecuto en local?

```bash
docker compose up -d --force-recreate --wait mysql-test
cd e2e
pnpm install
pnpm test:estable
```
