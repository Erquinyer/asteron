# Semana 7 — Playwright a fondo · flujo C: programar un turno (Gabriel)

> Tema común E2E. Usa la base de la suite de David (PR #20): BD de pruebas, sesión reutilizada y el fixture `api` para crear datos.

## Los 3 flujos críticos (propuesta para el grupo)

| Flujo | Por qué es crítico | Responsable |
|---|---|---|
| A. Acceso y permisos | Mueve **acceso**: si un rol ve o escribe en un módulo que no le toca, se rompe la seguridad del sistema | _por asignar_ |
| B. Pedido → proyecto | Es el negocio de Macromet de punta a punta: sin él no hay fases ni producción que seguir | David (registrar un pedido, PR #20) |
| C. Programar un turno | Lo hace el líder de planta **todos los días**: si falla, la planta no sabe quién trabaja en qué máquina ni cuánto avanza cada fase | @Erquinyer |

## Tests del flujo C

`e2e/tests/programar-turno.spec.js`:

| Test | Tipo |
|---|---|
| debe programar un turno para hoy y mostrarlo en el grupo de su proyecto | Caso feliz |
| no debe ofrecer un operario que ya tiene un turno ese día | Error visible (regla de disponibilidad) |
| debe avisar que la fase exige un equipo cuando no se elige máquina | Error visible (validación) |

- **Datos**: el operario, la máquina, el proyecto y el turno previo se crean con el fixture `api` (`tests/support/programacion.js`), con sufijo `randomUUID`.
- **Objeto de página**: `tests/support/programacion-page.js` (solo locators y acciones, sin aserciones).
- Ningún `waitForTimeout`.

**Accesibilidad corregida en `TurnoModal.jsx`** (el reto pide arreglarla antes de recurrir a `getByTestId`):
- Los `<label>` no estaban asociados a sus campos. Se agregó `htmlFor`/`id`.
- El modal no era un `dialog`. Se agregó `role="dialog"`, `aria-modal` y `aria-labelledby`.
- La X de cerrar no tenía nombre. Se agregó `aria-label="Cerrar"`.

## Parte 3: defectos de tiempos

`e2e/tests/programar-turno-tiempos.spec.js`, con `tests/support/network.js` para retrasar respuestas:

| Qué se probó | Retraso | Resultado |
|---|---|---|
| Doble clic en **Programar actividad** | `POST /api/programacion` +500 ms | **Sin defecto.** Sale 1 solo `POST` y queda 1 turno en la BD: `disabled={saving}` ya bloquea el segundo clic. |
| Cambiar la fecha mientras carga la disponibilidad | `GET /ocupados?fecha=<hoy>` +1,5 s | **Defecto.** La respuesta de *hoy* llegaba después de la de *mañana* y la pisaba: un operario ocupado mañana aparecía como libre (`Expected: 0, Received: 1`). Quien programaba llenaba todo el formulario y recibía un 409 al final. |

**Corrección:** en los dos `useEffect` de `TurnoModal.jsx` (disponibilidad y fases del proyecto) se descarta la respuesta si la fecha o el proyecto ya cambiaron (bandera `vigente` en el cleanup). El test falla siempre sin la corrección y pasa con ella.

## Mutante

En `TurnoModal.jsx` se quitó `&& !esOcupadoOperario(u.id_usuario)` del filtro de operarios. Lo detectaron dos tests:

- `no debe ofrecer un operario que ya tiene un turno ese día`
- `no debe ofrecer un operario ocupado aunque la disponibilidad de otra fecha llegue tarde`

Ambos fallaron con:

```
expect(locator).toHaveCount(expected) failed
Locator:  getByRole('dialog', { name: 'Nueva actividad' }).getByLabel('Operario').getByRole('option', { name: 'Operario ABE75157' })
Expected: 0
Received: 1
```

## Estabilidad

Sobre la base de David, con toda la suite del grupo (sus tests de pedidos y los míos):

- `pnpm exec playwright test --repeat-each=5 --workers=4`: 61/61.
- `--repeat-each=20 --workers=6`: 240/241 la primera vez. El fallo se explica abajo (punto 3) y quedó corregido.
- Solo `programar-turno-tiempos.spec.js`, `--repeat-each=40 --workers=6` después de la corrección: 81/81.

En el camino aparecieron dos intermitencias, y ninguna se resolvió con reintentos:

1. **Choque de datos de prueba.** Dos workers creaban datos en el mismo milisegundo con `Date.now()` y un aleatorio pequeño. Se cambió a `randomUUID()` (`unico()`/`sufijoUnico()` en `tests/support/api.js`).
2. **Defecto real del backend.** Ver la tabla de abajo. Los tests ahora envían su propio `codigo_empleado`.
3. **Una respuesta retrasada que sobrevivía al test.** Error: `route.fulfill: Fetch response has been disposed`. Al abrir el modal se pide la disponibilidad de hoy **dos veces** (React en modo desarrollo corre los efectos dos veces; se comprobó contando las peticiones). El test termina con la primera respuesta, la segunda sigue en su retraso artificial y, al cerrarse la página, falla y tumba un test que ya había pasado. Corrección: `page.unrouteAll({ behavior: 'ignoreErrors' })` en el `afterEach` del spec de tiempos. Es muy probablemente el fallo aislado de 1 de 36 que antes no tenía explicación.

## Defectos del backend encontrados (fuera del flujo C)

| Defecto | Cómo aparece | Causa | Estado |
|---|---|---|---|
| Dos altas de usuario en paralelo, sin `codigo_empleado`, chocan con **409** "El correo o código ya está registrado" | Crear usuarios a la vez desde varios workers | `usuarios.create` lee el último `EMP-NNN` y le suma 1 sin bloqueo, y el hash de bcrypt hace más ancha la ventana. Además ordena como texto: después de `EMP-999` vuelve a generar `EMP-1000` para siempre. | Registrado en #25 |
| `POST /maquinaria` con un `codigo` de más de 20 caracteres responde **500** "Error al crear equipo" | Código largo en el alta de máquina | `ER_DATA_TOO_LONG` cae en el `catch` genérico. Es el mismo patrón que se corrigió en clientes en S6. | #26, corregido en #27 (también el código repetido, que daba 500) |

## Cómo correrlo

```bash
docker compose up -d --wait mysql-test
cd e2e
pnpm install
pnpm exec playwright test tests/programar-turno.spec.js tests/programar-turno-tiempos.spec.js --repeat-each=5
```
