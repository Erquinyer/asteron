# Semana 6 — Integración con BD real (capa BD/integración)

> Nadie del grupo había tocado esta capa todavía: los tests de API de David (PRs #4, #6, #7) usan un pool de MySQL simulado (`vi.mock`), nunca MySQL real.

## ¿Qué prueba esto?

Tests de integración reales contra MySQL (`backend/tests/integration/clientes.db.test.js`), con una BD de pruebas desechable levantada por Docker, no la BD de desarrollo.

## BD de pruebas desechable

- `docker-compose.yml`: nuevo servicio `mysql-test` (puerto 3308), con `tmpfs` en vez de un volumen con nombre — cada arranque nace vacío y el esquema (`Data Base/asteron_v2.sql`) se vuelve a crear desde cero.
- `backend/src/config/db.js`: se agregó soporte a `DB_PORT` (antes el pool siempre usaba el 3306 por defecto; sin esto no había forma de apuntar a la BD de pruebas sin tocar la de desarrollo).
- Limpieza entre tests: `DELETE FROM clientes` en `beforeEach` (no `TRUNCATE`: InnoDB lo rechaza mientras la tabla tenga FKs hijas, aunque no haya filas).

## Hallazgos que el doble de la BD no detecta

Al conectar contra el motor real aparecieron dos defectos reales que ningún test con `vi.mock('../config/db.js')` podía encontrar (un mock responde lo que uno le dice, no lo que MySQL haría):

| Hallazgo | Causa real | Corrección |
|---|---|---|
| Un NIT duplicado respondía **"El código de cliente ya existe"** | `clientes` tiene **dos** `UNIQUE KEY` (`uq_cliente_nit` y `uq_cliente_codigo`); el `catch` solo manejaba `ER_DUP_ENTRY` con un mensaje fijo, sin mirar cuál de las dos violó | Se agregó `mensajeErrorCliente(err)` en `clientes.controller.js`, que distingue por `err.sqlMessage` cuál `UNIQUE KEY` falló |
| Un nombre de 121+ caracteres (la columna es `VARCHAR(120)`) respondía **500** genérico | MySQL en modo estricto (default en 8.0) rechaza el INSERT con `ER_DATA_TOO_LONG`, que caía al `catch` genérico | El mismo helper traduce `ER_DATA_TOO_LONG` a `400` con un mensaje claro |

Confirmé ambos hallazgos revirtiendo temporalmente el fix (`git stash` sobre el controller) y viendo los dos tests fallar con el mensaje/código exactos documentados arriba; luego restauré el fix y volvieron a pasar los 5/5.

## Capas

- **Capa del autor esta semana**: BD / integración
- **Capa del revisor esta semana**: _(distinta — @DavidAlejo99 o @nixonhalejo, ninguno en BD)_

## Checklist

- [x] Los tests siguen el patrón AAA (Arrange, Act, Assert)
- [x] Los nombres de los tests describen el comportamiento esperado
- [x] Hice fallar los tests de los dos hallazgos revirtiendo el fix, y confirmé que lo detectan
- [x] Los tests pasan en local (5/5, contra MySQL real en Docker)
- [x] No hay credenciales ni datos reales en los tests (la contraseña de la BD de pruebas es `asteron_test`, solo existe en un contenedor desechable)

## ¿Cómo lo ejecuto?

```bash
docker compose up -d mysql-test   # espera a que quede "healthy"
cd backend
pnpm install
pnpm test:integration
```
