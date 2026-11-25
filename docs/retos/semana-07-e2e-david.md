# Semana 7 — Playwright a fondo (E2E) · David

> Tema común: todo el grupo en E2E. Mi parte: **la base de la suite** (PR corto) y el flujo crítico **Registrar un pedido**.

## Base de la suite (PR corto, antes de los flujos)

| Qué | Cómo quedó |
|---|---|
| BD de pruebas | Playwright levanta un backend propio (puerto 3100) contra `mysql-test` (3308). Nunca toca la BD de desarrollo |
| Puertos propios | Frontend en 5180 y API en 3100: no reutiliza por error el `pnpm dev` (5173) ni el backend (3000) de desarrollo |
| Datos mínimos | `backend/scripts/seed-e2e.js`, idempotente; se niega a correr si `DB_PORT` no es 3308 |
| Sesión reutilizada | Proyecto `setup` (`tests/auth.setup.js`): login por la UI **una vez**, guarda `playwright/.auth/admin.json` y todos los tests arrancan con esa sesión |
| Datos por API | Fixture `api` (`tests/support/fixtures.js`): cliente HTTP autenticado para que cada test cree sus datos |
| Diagnóstico | Reporte HTML y traza `on-first-retry` (ya estaban) |
| Paralelo | `fullyParallel: true` y script `pnpm test:estable` (`--repeat-each=5`) |

**Hallazgo al montar la base**: contra una BD creada solo con `Data Base/asteron_v2.sql`, **nadie puede iniciar sesión** (500). El login consulta la tabla `acciones_modulo`, que no está en el esquema (la crea `scripts/migrate_acciones_modulo.js`). Además, `scripts/seed.js` falla a mitad de camino porque inserta `clientes.direccion`, columna que ya no existe (ahora es `direcciones_cliente`). El seed E2E crea esa tabla; queda pendiente del grupo agregarla al esquema y corregir `seed.js`.

## Flujo crítico: Registrar un pedido

**Por qué es crítico**: es lo que hace el área comercial todos los días y es el punto de partida de todo lo demás. Sin pedido no hay proyecto, fases ni programación de planta.

| Test (`e2e/tests/pedidos.spec.js`) | Tipo |
|---|---|
| Registra un pedido con dos ítems y lo muestra en la lista con su cliente (y verifica por API que quedó con 2 ítems) | Caso feliz |
| Avisa "Selecciona un cliente" y no envía nada al API cuando falta el cliente | Error visible (validación del front) |
| Muestra el error del API y no guarda el pedido cuando la fecha de entrega de un ítem ya pasó | Error visible (regla del API) |

- Locators accesibles (`getByRole`, `getByLabel`), aserciones web-first y ningún `waitForTimeout`.
- Cada test crea su cliente por API con nombre único (`tests/support/datos.js`).
- Objeto de página sin aserciones: `tests/support/pagina-pedidos.js`.

**Accesibilidad corregida en `Pedidos.jsx`** (antes no tenían nombre accesible y habría tocado usar `getByTestId`): campos de cada ítem ("Producto del ítem 1", "Cantidad…", "Punto de entrega…", "Fecha de entrega…"), botón "Quitar ítem N", botón "Cerrar" de los modales, "Editar/Eliminar pedido #N", el modal como `dialog` con nombre y la descripción con su `label` asociado.

## Defectos de tiempos (Parte 3) · `e2e/tests/pedidos-tiempos.spec.js`

| Prueba | Condición provocada | Resultado |
|---|---|---|
| Doble clic en "Crear pedido" | POST retrasado 1,5 s | **Sin defecto**: sale un solo POST y queda un solo pedido (el botón se deshabilita con `saving`) |
| Recarga de la lista que llega tarde | La recarga tras el pedido A llega 2,5 s tarde con datos viejos, mientras se crea el pedido B | **Defecto**: en la BD hay 2 pedidos, pero en pantalla queda **1**. La respuesta vieja pisaba la lista |

**Causa y corrección**: el hook compartido `frontend/src/hooks/useFetch.js` aplicaba cualquier respuesta que llegara, en el orden en que llegara. Ahora numera las peticiones y descarta las respuestas viejas. Lo usan todas las pantallas con listas, así que la corrección aplica a toda la app. En desarrollo pasaba incluso sin red lenta forzada: React StrictMode lanza dos cargas iniciales.

Se reprodujo **3 de 3** antes de la corrección y pasa **5 de 5** después. También quedó cubierto con 2 pruebas unitarias en `useFetch.test.js`, que fallan si se revierte la corrección.

## Mutantes

| Mutante en la app | Test que lo detectó | Mensaje |
|---|---|---|
| M1 · quitar la validación `if (!form.id_cliente)` del formulario | "avisa Selecciona un cliente…" | `expect(locator).toBeVisible()` — element(s) not found |
| M2 · quitar `disabled={saving}` del botón "Crear pedido" | "doble clic en Crear pedido…" | `POST enviados al API` — Expected: 1, Received: 2 |
| M3 · cambiar el aviso "Pedido creado" por "Pedido guardado" | "registra un pedido con dos ítems…" | `expect(locator).toBeVisible()` — element(s) not found |
| M4 · revertir la corrección de `useFetch` | "si la recarga de la lista llega tarde…" | `toHaveCount` — Expected: 2, Received: 1 |

**4/4 muertos.** M2 muestra que la prueba de doble clic sí vigila algo real.

## Estabilidad

Suite completa con `pnpm test:estable` (`--repeat-each=5`): **36/36** (setup + 7 tests × 5), contra la BD de pruebas en Docker.

## ¿Cómo lo ejecuto?

```bash
docker compose up -d --wait mysql-test
cd e2e
pnpm install
pnpm test:estable
pnpm report
```
