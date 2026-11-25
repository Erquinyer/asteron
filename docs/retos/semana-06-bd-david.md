# Semana 6 — Integración de pedidos con BD real (capa BD) · David

> Sigue el patrón de `clientes.db.test.js` (Gabriel), pero con el módulo de **pedidos**, que es el que más depende de las reglas del esquema: transacción, ítems hijos, puntos de entrega, fases del proyecto en cascada y actividades que bloquean borrados.
>
> Primero fue el PR #16 (13 nov). Después, `develop` cambió: manejo centralizado de errores (RNF-06) y varios puntos de entrega por ítem. Por eso se rehizo sobre el código nuevo y pasó a `david/develop` (PR #20), siguiendo la regla del grupo de trabajar en la rama personal.

## ¿Qué prueba esto?

`backend/tests/integration/pedidos.db.test.js`: 16 pruebas que llaman al API real (`supertest` sobre `app.js`) contra MySQL 8.0 real (servicio `mysql-test` de Docker, puerto 3308). Nada de `vi.mock` de la BD.

| Grupo | Qué verifica contra MySQL real |
|---|---|
| `POST /api/pedidos` | Guarda el pedido, sus ítems y los puntos de entrega, y los devuelve al leerlos; `fecha_pedido = CURDATE()`; los ítems sin producto se ignoran |
| | Límite exacto de la columna: un producto de 120 caracteres sí entra |
| | **Rollback real**: si el segundo ítem falla, no queda ni el pedido ni el primer ítem |
| | `VARCHAR` excedido (producto 120, dirección del punto de entrega 255, descripción 255) → 400 |
| | Cliente inexistente (FK `fk_pedido_cliente`) → 400 |
| | Estado de ítem fuera del `ENUM` → 400 |
| `PUT /api/pedidos/:id` con proyecto | Ítem que se conserva: mismo `id_detalle`, mismas fases y mismo avance (50 %) |
| | Ítem que se quita: sus fases se borran por `ON DELETE CASCADE` |
| | Ítem nuevo: se le crean sus fases (Corte y Despacho) |
| | `id_detalle` enviado como texto no duplica el ítem |
| | Editar un ítem sin enviar `ubicaciones` conserva sus puntos de entrega |
| | Sin `id_cliente` no se borra el cliente del pedido |
| | Quitar un ítem con actividades registradas → 409 y no cambia nada |
| `DELETE` | Borrar el pedido borra sus ítems en cascada |
| | Pedido con proyecto → 409 y no se borra nada |
| | Borrar el cliente conserva el pedido sin cliente (`ON DELETE SET NULL`) |

Datos de prueba: el esquema no trae catálogos, así que la prueba siembra sus propias fases estándar y un cliente. Limpieza con `DELETE` de tablas hijas a padres (`actividades` → `fases_proyecto` → `proyectos` → `detalle_pedido` → `pedidos` → `clientes`).

## Hallazgos que el doble de la BD no detecta

| # | Hallazgo | Causa real | Estado |
|---|---|---|---|
| 1 | Un campo más largo que su columna respondía **500** | `ER_DATA_TOO_LONG` (modo estricto, default en 8.0) | Resuelto en `develop` por el manejo centralizado (RNF-06): **400** |
| 2 | Un cliente que no existe respondía **500** | `ER_NO_REFERENCED_ROW_2` (FK `fk_pedido_cliente`) | Resuelto en `develop` por RNF-06: **400** |
| 3 | Un estado de ítem fuera del ENUM respondía **500** (seguía así en `develop`) | `WARN_DATA_TRUNCATED`, código que `utils/errores.js` no traducía | Se agregó `WARN_DATA_TRUNCATED` y `ER_TRUNCATED_WRONG_VALUE_FOR_FIELD` al mapa de `errores.js`: **400**. Aplica a todos los módulos |
| 4 | Quitar un ítem con tiempo registrado respondía el mensaje genérico "No se puede eliminar: el registro está en uso", que no explica nada al **editar** | La cascada `detalle_pedido` → `fases_proyecto` choca con `actividades.id_fase` `ON DELETE RESTRICT` (`ER_ROW_IS_REFERENCED_2`) | `update` revisa ese código antes de `responderError`: **409** "No se puede quitar un ítem que ya tiene actividades registradas en sus fases" |
| 5 | Si `id_detalle` llegaba como texto (`"12"`), el ítem **quedaba duplicado** | El `Set` de ids actuales (números) no encontraba `"12"` y lo insertaba de nuevo, pero el `DELETE … NOT IN ('12')` de MySQL convierte el texto y conservaba el original | `sincronizarItems` normaliza `id_detalle` a número |
| 6 | Un `PUT` sin `id_cliente` **le borraba el cliente al pedido** sin aviso (respondía 200) | `UPDATE pedidos SET id_cliente = NULL`; la columna permite NULL | `update` exige `id_cliente`, igual que `create` (400 "El cliente es requerido") |
| 7 | **Nuevo con el esquema de puntos de entrega**: editar un ítem sin enviar `ubicaciones` **borraba todos sus puntos de entrega** (respondía 200) | `guardarUbicaciones` hacía `DELETE` + re-insert aunque no viniera la lista | Si `ubicaciones` no viene, se conservan (igual que los ítems cuando no viene `items`); un arreglo vacío sí las quita |

Contra el controlador de `develop` sin estas correcciones, **5 de las 16 pruebas fallan** (hallazgos 3 a 7). Con las correcciones pasan **16/16**, y con las de clientes **21/21**.

Además, 6 pruebas unitarias nuevas (`tests/pedidos.controller.test.js` y `tests/errores.test.js`) cubren las mismas ramas, porque el CI de pruebas unitarias no corre la integración. Fallan si se revierte la corrección.

## Mutantes (`pedidos.db.test.js`)

| Mutante | Resultado |
|---|---|
| M1 · quitar `conn.rollback()` en `create` | Muerto (4 fallan) |
| M2 · no normalizar `id_detalle` | Muerto (1 falla) |
| M3 · no validar `id_cliente` en `update` | Muerto (1 falla) |
| M4 · no traducir `WARN_DATA_TRUNCATED` | Muerto (1 falla) |
| M5 · responder 400 en vez de 409 por actividades | Muerto (1 falla) |
| M6 · `NOT IN` → `IN` al borrar ítems quitados | Muerto (4 fallan) |
| M7 · `total_proyectos > 0` → `> 1` en `remove` | Muerto (1 falla) |
| M8 · no crear fases del ítem nuevo | Muerto (1 falla) |
| M9 · borrar los puntos de entrega aunque no vengan | Muerto (1 falla) |

**9/9 muertos.**

## Capas

- **Capa del autor esta semana**: BD / integración
- **Capa del revisor esta semana**: _(distinta a BD)_

## ¿Cómo lo ejecuto?

```bash
docker compose up -d --force-recreate --wait mysql-test
cd backend
pnpm install
pnpm test:integration
pnpm test
```

`--force-recreate` vuelve a crear la BD con el esquema actual (`Data Base/asteron_v2.sql`); sin eso, un contenedor viejo conserva el esquema de antes.
