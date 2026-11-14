# Semana 6 — Integración de pedidos con BD real (capa BD) · David

> Sigue el patrón de `clientes.db.test.js` (Gabriel), pero con el módulo de **pedidos**, que es el que más depende de las reglas del esquema: transacción, ítems hijos, fases del proyecto en cascada y actividades que bloquean borrados.

## ¿Qué prueba esto?

`backend/tests/integration/pedidos.db.test.js`: 15 pruebas que llaman al API real (`supertest` sobre `app.js`) contra MySQL 8.0 real (servicio `mysql-test` de Docker, puerto 3308). Nada de `vi.mock` de la BD.

| Grupo | Qué verifica contra MySQL real |
|---|---|
| `POST /api/pedidos` | Guarda pedido e ítems y los devuelve al leerlos; `fecha_pedido = CURDATE()`; ítems sin producto se ignoran |
| | Límite exacto de la columna: un producto de 120 caracteres sí entra |
| | **Rollback real**: si el segundo ítem falla, no queda ni el pedido ni el primer ítem |
| | `VARCHAR` excedido (producto 120, punto_descargue 150, descripcion 255) → 400 claro |
| | Cliente inexistente (FK `fk_pedido_cliente`) → 400 claro |
| | Estado de ítem fuera del `ENUM` → 400 claro |
| `PUT /api/pedidos/:id` con proyecto | Ítem que se conserva: mismo `id_detalle`, mismas fases y mismo avance (50 %) |
| | Ítem que se quita: sus fases se borran por `ON DELETE CASCADE` |
| | Ítem nuevo: se le crean sus fases (Corte y Despacho) |
| | `id_detalle` enviado como texto no duplica el ítem |
| | Sin `id_cliente` no se borra el cliente del pedido |
| | Quitar un ítem con actividades registradas → 409 y no cambia nada |
| `DELETE` | Borrar el pedido borra sus ítems en cascada |
| | Pedido con proyecto → 409 y no se borra nada |
| | Borrar el cliente conserva el pedido sin cliente (`ON DELETE SET NULL`) |

Datos de prueba: el esquema no trae catálogos, así que la prueba siembra sus propias fases estándar y un cliente. Limpieza con `DELETE` de tablas hijas a padres (`actividades` → `fases_proyecto` → `proyectos` → `detalle_pedido` → `pedidos` → `clientes`).

## Hallazgos que el doble de la BD no detecta

Escribí primero las pruebas con el controlador sin tocar: **9 de 15 fallaron**. Estos son los defectos reales:

| # | Hallazgo | Causa real (error de MySQL) | Corrección en `pedidos.controller.js` |
|---|---|---|---|
| 1 | Un producto, punto de descargue o descripción más largo que la columna respondía **500** "Error al crear pedido" | `ER_DATA_TOO_LONG` (modo estricto, default en 8.0) | `mensajeErrorPedido(err)` lo traduce a **400** "Uno de los campos supera la longitud permitida" |
| 2 | Un cliente que no existe respondía **500** | `ER_NO_REFERENCED_ROW_2` (FK `fk_pedido_cliente`) | **400** "El cliente seleccionado no existe" |
| 3 | Un estado de ítem fuera del ENUM respondía **500** | `WARN_DATA_TRUNCATED` | **400** "Uno de los valores del pedido no es válido" |
| 4 | Quitar un ítem cuyas fases ya tienen tiempo registrado respondía **500** | La cascada `detalle_pedido` → `fases_proyecto` choca con `actividades.id_fase` `ON DELETE RESTRICT` (`ER_ROW_IS_REFERENCED_2`) | **409** "No se puede quitar un ítem que ya tiene actividades registradas en sus fases" (la transacción ya deshacía el cambio; faltaba el mensaje) |
| 5 | Si `id_detalle` llegaba como texto (`"12"`), el ítem **quedaba duplicado** | El `Set` de ids actuales (números) no encontraba `"12"` y lo insertaba de nuevo, pero el `DELETE … NOT IN ('12')` de MySQL convierte el texto y conservaba el original | `sincronizarItems` normaliza `id_detalle` a número |
| 6 | Un `PUT` sin `id_cliente` **le borraba el cliente al pedido** sin aviso (respondía 200) | `UPDATE pedidos SET id_cliente = NULL`; la columna permite NULL | `update` exige `id_cliente` igual que `create` (400 "El cliente es requerido") |

Después de la corrección pasan las 15 (y las 5 de clientes): **20/20**, corriendo la suite dos veces seguidas sin reiniciar la BD.

También sumé 7 pruebas unitarias en `tests/pedidos.controller.test.js` para las ramas nuevas, así la cobertura del CI (que no corre la integración) no baja: backend en **66,97 % de líneas** (umbral 66).

## Mutantes

Cada mutante se aplicó a mano sobre el controlador y se corrió solo `pedidos.db.test.js`:

| Mutante | Resultado |
|---|---|
| M1 · quitar `conn.rollback()` en `create` | Muerto (4 fallan) |
| M2 · no normalizar `id_detalle` | Muerto (1 falla) |
| M3 · no validar `id_cliente` en `update` | Muerto (1 falla) |
| M4 · no traducir `ER_DATA_TOO_LONG` | Muerto (4 fallan) |
| M5 · responder 400 en vez de 409 por actividades | Muerto (1 falla) |
| M6 · `NOT IN` → `IN` al borrar ítems quitados | Muerto (3 fallan) |
| M7 · `total_proyectos > 0` → `> 1` en `remove` | Muerto (1 falla) |
| M8 · no crear fases del ítem nuevo | Muerto (1 falla) |

**8/8 muertos.**

## Capas

- **Capa del autor esta semana**: BD / integración
- **Capa del revisor esta semana**: _(distinta a BD)_

## ¿Cómo lo ejecuto?

```bash
docker compose up -d --wait mysql-test
cd backend
npm install
npm run test:integration
npm test
```
