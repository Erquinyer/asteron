# Reporte de ejecución de pruebas — Asteron

**Fecha de ejecución:** 20 nov 2026 · **Rama:** `gabriel/entregables-pruebas` (sobre `develop` en `80a1da6`) · **Ejecutó:** Gabriel Leal
**Ambiente:** pruebas local, separado del de desarrollo (BD `asteron_test` recreada desde cero; backend en el puerto 3001; frontend E2E en el 5174). Ver el [plan de pruebas](plan-de-pruebas.md).

## 1. Resumen

| Nivel | Herramienta | Ejecutados | Pasan | Fallan | Resultado |
|---|---|---|---|---|---|
| Unitario + API (backend) | Vitest + Supertest | 343 | 343 | 0 | ✅ |
| Unitario + componente (frontend) | Vitest + Testing Library | 48 | 48 | 0 | ✅ |
| API de caja negra | Newman (Postman) | 29 peticiones · 59 validaciones | 29 · 59 | 0 | ✅ |
| End-to-end | Playwright (Chromium) | 2 | 2 | 0 | ✅ tras corregir DEF-05 y DEF-06 (1.ª corrida: 1 de 2 fallaba) |
| Integración con MySQL real | Vitest + Docker | 0 de 5 | — | — | ⏸ No ejecutado: Docker apagado (última corrida: semana 6, 5/5) |
| Manual | — | 0 de 1 | — | — | ⏳ CP-MAN-01 pendiente (correo real) |

**Defectos en esta ejecución:** 2 nuevos (DEF-05 y DEF-06, en la suite E2E), corregidos y verificados el mismo día. Ningún defecto de severidad Alta abierto que se haya detectado en esta corrida; queda abierto el **#25 (Alta)**, registrado antes.

## 2. Cobertura de código

| App | Líneas | Ramas | Funciones | Sentencias | Umbral del CI (líneas) |
|---|---|---|---|---|---|
| Backend | **78,68 %** | 74,49 % | 80,15 % | 77,66 % | 78 % (antes 72 %) |
| Frontend | 7,34 % | 5,77 % | 5,25 % | 6,83 % | 7 % |

**Módulo crítico — Programación de planta** (`backend/src/controllers/programacion.controller.js`): **70,28 % de líneas** (antes 38,76 %). Se agregaron 30 pruebas en `backend/tests/programacion.controller.test.js` para estados, avance, eliminación, recálculo de fases y corrección de tiempos. Otros módulos centrales: autenticación 100 %, usuarios 100 %, proyectos 77,66 %, pedidos 78,26 %.

**Verificación de que las pruebas detectan errores (mutación):** se cambió `Math.min(99, …)` por `Math.min(100, …)` en `updateAvance`. Falló solo el caso CP-UNIT-01 ("limita el avance a 99 %"), y al restaurar el código volvió a pasar.

La cobertura del frontend es baja y está registrada como deuda técnica: los flujos de interfaz los cubren hoy las pruebas E2E y las de componente de Login y Evidencias.

## 3. API — detalle de la corrida de Newman

Colección `postman/asteron.postman_collection.json` con el ambiente `postman/asteron-pruebas.postman_environment.json`. **29 peticiones, 59 validaciones, 0 fallos.** Tiempo total 667 ms; respuesta promedio 12 ms. La colección se corrió 3 veces seguidas sobre la misma BD con el mismo resultado: limpia lo que crea, así que se puede repetir.

| Caso | HTTP | Validaciones | Tiempo |
|---|---|---|---|
| CP-API-01 | 200 | 2/2 | 20 ms |
| CP-API-02 | 200 | 4/4 | 95 ms |
| CP-API-03 | 401 | 2/2 | 76 ms |
| CP-API-04 | 400 | 2/2 | 1 ms |
| CP-API-05 | 200 | 2/2 | 79 ms |
| CP-API-06 | 401 | 2/2 | 1 ms |
| CP-API-07 | 401 | 2/2 | 1 ms |
| CP-API-08 | 200 | 2/2 | 2 ms |
| CP-API-09 | 400 | 2/2 | 1 ms |
| CP-API-10 | 201 | 3/3 | 6 ms |
| CP-API-11 | 409 | 2/2 | 4 ms |
| CP-API-12 | 400 | 2/2 | 3 ms |
| CP-API-13 | 200 | 2/2 | 8 ms |
| CP-API-14 | 200 | 3/3 | 2 ms |
| CP-API-15 | 403 | 2/2 | 2 ms |
| CP-API-16 | 200 | 1/1 | 4 ms |
| CP-API-17 | 404 | 2/2 | 2 ms |
| CP-API-18 | 400 | 2/2 | 1 ms |
| CP-API-19 | 201 | 2/2 | 7 ms |
| CP-API-20 | 409 | 2/2 | 3 ms |
| CP-API-21 | 200 | 1/1 | 7 ms |
| CP-API-22 | 400 | 2/2 | 1 ms |
| CP-API-23 | 200 | 1/1 | 6 ms |
| CP-API-24 | 200 | 3/3 | 3 ms |
| CP-API-25 | 200 | 1/1 | 3 ms |
| CP-API-26 | 403 | 2/2 | 1 ms |
| CP-API-27 | 400 | 2/2 | 2 ms |
| CP-API-28 | 404 | 2/2 | 1 ms |
| CP-API-29 | 200 | 2/2 | 2 ms |

## 4. Defectos

Severidad: **Alta** = bloquea un flujo, pierde datos o es de seguridad · **Media** = resultado incorrecto (código o mensaje equivocado, dato mal calculado) · **Baja** = cosmético o en la suite de pruebas. Detalle de cada nivel en el [plan](plan-de-pruebas.md#6-gestión-de-defectos).

| ID | Defecto | Detectado por | Severidad | Estado | Corrección | Verificación |
|---|---|---|---|---|---|---|
| DEF-01 | Un NIT duplicado respondía "El código de cliente ya existe" | Integración con MySQL real (semana 6) | Media | ✅ Cerrado | `31a4954`: `mensajeErrorCliente` distingue cuál `UNIQUE KEY` falló | CP-INT-02 y CP-API-11; se revirtió el fix y el test falló ([semana 6](../retos/semana-06-bd.md)) |
| DEF-02 | Un nombre de cliente de 121+ caracteres respondía 500 | Integración con MySQL real (semana 6) | Media | ✅ Cerrado | `31a4954`: `ER_DATA_TOO_LONG` → 400 | CP-INT-04 y CP-API-12 |
| DEF-03 | Recuperar la clave respondía 500 en toda BD: no existía la tabla `password_reset_tokens` (RF-05) | Revisión de RF-05 | **Alta** | ✅ Cerrado | `c5a19c7`: tabla en el esquema y en `migrate_recuperacion.js` | CP-API-08 (200) |
| DEF-04 | Crear, editar o desactivar usuarios no exigía el permiso del módulo usuarios | Pruebas de seguridad del API, semana 4 ([PR #6](https://github.com/Erquinyer/asteron/pull/6), David) | **Alta** | ✅ Cerrado | `8e448e4` | Pruebas de seguridad de `backend/tests/api/` |
| DEF-05 | La E2E "crear cliente" fallaba: el selector `Contraseña` encontraba también el botón "Mostrar contraseña" (agregado por RNF-14) | Esta ejecución (E2E) | Baja | ✅ Verificado | Esta rama: `getByLabel('Contraseña', { exact: true })` | CP-E2E-02 pasa |
| DEF-06 | La E2E "crear cliente" no aceptaba el modal de la política de datos (Ley 1581), que bloquea la app en una BD nueva | Esta ejecución (E2E) | Baja | ✅ Verificado | Esta rama: la prueba acepta el modal si aparece | CP-E2E-02 pasa con BD nueva y con política ya aceptada |
| DEF-07 | La cobertura del frontend se reportaba en 97 % cuando la real era 3 % (no medía `src/**`) | Revisión del informe de cobertura | Media | ✅ Cerrado | `aded1ee` | Umbral real en `frontend/vite.config.js` |
| DEF-08 | Las notificaciones calculaban "vencido" con la fecha UTC y no la local (un día de diferencia en la noche) | Dobles de prueba de reloj, semana 5 ([PR #7](https://github.com/Erquinyer/asteron/pull/7), David) | Media | ✅ Cerrado | `a1c8143` | Pruebas de notificaciones con reloj simulado |
| DEF-09 | Programación abría siempre en el día actual: "Actividades en curso" desde un proyecto mostraba un día vacío | Uso del sistema (Gabriel) | Media | ✅ Cerrado | `618e182` ([PR #30](https://github.com/Erquinyer/asteron/pull/30)) | CP-API-24 y pruebas de `GET /programacion` con `?proyecto` y `?pendientes` |
| DEF-10 | Un código de máquina largo o repetido respondía 500 ([#26](https://github.com/Erquinyer/asteron/issues/26)) | E2E semana 7 | Media | 🟡 Corregido y verificado; **issue por cerrar** | Manejo central de errores (RNF-06, `utils/errores.js`) | CP-API-27: 400 con código largo; 409 con código repetido (verificado a mano el 20 nov) |
| DEF-11 | El código `EMP-NNN` automático se repite en altas simultáneas y se atasca después de `EMP-999` ([#25](https://github.com/Erquinyer/asteron/issues/25)) | Pruebas de concurrencia | **Alta** | 🔴 Abierto | — | — |

### Ciclos "detectar → corregir → verificar" demostrados

1. **DEF-01 y DEF-02** (semana 6): el test de integración falló contra MySQL real → `31a4954` corrigió `clientes.controller.js` → se revirtió el fix con `git stash`, los dos tests volvieron a fallar con el mensaje exacto, se restauró y pasaron 5/5. Documentado en [`docs/retos/semana-06-bd.md`](../retos/semana-06-bd.md).
2. **DEF-05 y DEF-06** (esta ejecución):
   - **Primera corrida:** CP-E2E-02 falla con `strict mode violation: getByLabel('Contraseña') resolved to 2 elements`.
   - **Primera corrección y segunda corrida:** se usa `exact: true` y ahora falla con `subtree intercepts pointer events`, porque el modal de la Ley 1581 tapa la pantalla.
   - **Segunda corrección:** la prueba acepta el modal si aparece.
   - **Re-ejecución:** pasa 2/2 con una BD nueva y 2/2 con la política ya aceptada.
3. **DEF-10:** reportado en #26 → la respuesta central de errores lo cubre → CP-API-27 lo verifica (400) y la verificación a mano con un código repetido da 409.

## 5. Pendientes para la próxima ejecución

- Ejecutar **CP-INT-01 a CP-INT-05** con Docker encendido.
- Ejecutar **CP-MAN-01** (correo real) con un buzón del equipo.
- Cerrar el **#26** con la evidencia de DEF-10 y corregir el **#25** (Alta).
- Registrar como issues, con su etiqueta de severidad, los defectos que se corrigieron sin issue (DEF-01 a DEF-09).
