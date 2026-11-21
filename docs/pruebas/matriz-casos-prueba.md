# Matriz de casos de prueba — Asteron

Ejecución del **20 nov 2026** en el [ambiente de pruebas](plan-de-pruebas.md#4-ambientes) (BD `asteron_test`, backend en el puerto 3001). Los resultados obtenidos de los casos **CP-API** salen de la corrida real de Newman, no se escribieron a mano. Ver el [reporte de ejecución](reporte-ejecucion.md).

**Resumen:** 49 casos · 20 positivos · 29 negativos · **43 ejecutados y 43 pasan** · 5 no ejecutados en esta corrida (CP-INT, requieren Docker) · 1 manual pendiente (CP-MAN-01).

Columnas: **Tipo** = positivo (flujo correcto) o negativo (dato inválido, sin permiso, conflicto). **Datos** = entrada usada; `{{variable}}` es una variable del [ambiente de Postman](postman/asteron-pruebas.postman_environment.json). **Pasos** = petición o acción. **Esperado** = lo que valida el caso. **Obtenido** = código HTTP real y validaciones que pasaron.

## 1. API de caja negra — Postman / Newman (29 casos)

Precondición común: ambiente de pruebas recién creado con `bash docs/pruebas/preparar-ambiente.sh` y backend de pruebas corriendo. Los casos se ejecutan en orden: CP-API-02 y CP-API-05 guardan los tokens, CP-API-10 el cliente y CP-API-19 la actividad que usan los siguientes.

| ID | Caso | Nivel | Tipo | Datos | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|---|
| CP-API-01 | Health check con la BD arriba | API | Positivo | — | `GET /health` (sin token) | Responde 200; El sistema reporta estado ok | 200 · 2/2 validaciones | ✅ Pasa |
| CP-API-02 | Login válido (Administrador) | API | Positivo | `correo`: "{{correo_admin}}", `contrasena`: "{{clave_admin}}" | `POST /auth/login` (sin token) | Responde 200; Devuelve token JWT; Devuelve el rol; No expone el hash de la contraseña | 200 · 4/4 validaciones | ✅ Pasa |
| CP-API-03 | Login con contraseña incorrecta | API | Negativo | `correo`: "{{correo_admin}}", `contrasena`: "clave-equivocada" | `POST /auth/login` (sin token) | Responde 401; Mensaje genérico (no revela si el correo existe) | 401 · 2/2 validaciones | ✅ Pasa |
| CP-API-04 | Login sin contraseña | API | Negativo | `correo`: "{{correo_admin}}" | `POST /auth/login` (sin token) | Responde 400; Responde JSON con message | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-05 | Login válido (Operario) | API | Positivo | `correo`: "{{correo_operario}}", `contrasena`: "{{clave_operario}}" | `POST /auth/login` (sin token) | Responde 200; Rol Operario | 200 · 2/2 validaciones | ✅ Pasa |
| CP-API-06 | Ruta protegida sin token | API | Negativo | — | `GET /proyectos` (sin token) | Responde 401; Pide el token | 401 · 2/2 validaciones | ✅ Pasa |
| CP-API-07 | Ruta protegida con token alterado | API | Negativo | — | `GET /proyectos` (token alterado) | Responde 401; Responde JSON con message | 401 · 2/2 validaciones | ✅ Pasa |
| CP-API-08 | Recuperar clave con correo inexistente | API | Negativo | `correo`: "no-existe-{{$timestamp}}@macromet.com.co" | `POST /auth/forgot-password` (sin token) | Responde 200; Misma respuesta exista o no el correo (no enumera usuarios) | 200 · 2/2 validaciones | ✅ Pasa |
| CP-API-09 | Crear cliente sin nombre | API | Negativo | `nit`: "900000000" | `POST /clientes` (token Admin) | Responde 400; Indica el campo requerido | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-10 | Crear cliente válido | API | Positivo | `nombre`: "Cliente Postman {{sufijo}}", `nit`: "NIT-{{sufijo}}", `codigo_cliente`: "PM{{sufijo}}", 1 dirección | `POST /clientes` (token Admin) | Responde 201; Devuelve el id creado; Guarda la dirección principal | 201 · 3/3 validaciones | ✅ Pasa |
| CP-API-11 | Crear cliente con NIT repetido | API | Negativo | `nombre`: "Otro cliente", `nit`: "NIT-{{sufijo}}" | `POST /clientes` (token Admin) | Responde 409; Dice que el NIT ya existe | 409 · 2/2 validaciones | ✅ Pasa |
| CP-API-12 | Crear cliente con nombre de 121 caracteres | API | Negativo | `nombre`: «XXXXXXXX…» (121 car.) | `POST /clientes` (token Admin) | Responde 400; Responde JSON con message | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-13 | Actualizar cliente | API | Positivo | `nombre`: "Cliente Postman {{sufijo}} (editado)", `nit`: "NIT-{{sufijo}}", `codigo_cliente`: "PM{{sufijo}}", 1 dirección | `PUT /clientes/{{id_cliente}}` (token Admin) | Responde 200; Responde con el cliente o un mensaje | 200 · 2/2 validaciones | ✅ Pasa |
| CP-API-14 | Consultar cliente editado | API | Positivo | — | `GET /clientes/{{id_cliente}}` (token Admin) | Responde 200; Refleja el nombre editado; Reemplazó la dirección | 200 · 3/3 validaciones | ✅ Pasa |
| CP-API-15 | Operario intenta crear un cliente (sin permiso) | API | Negativo | `nombre`: "No debería crearse" | `POST /clientes` (token Operario) | Responde 403; Responde JSON con message | 403 · 2/2 validaciones | ✅ Pasa |
| CP-API-16 | Eliminar cliente | API | Positivo | — | `DELETE /clientes/{{id_cliente}}` (token Admin) | Responde 200 | 200 · 1/1 validaciones | ✅ Pasa |
| CP-API-17 | Consultar cliente eliminado | API | Negativo | — | `GET /clientes/{{id_cliente}}` (token Admin) | Responde 404; Responde JSON con message | 404 · 2/2 validaciones | ✅ Pasa |
| CP-API-18 | Programar actividad en fecha pasada | API | Negativo | `fecha`: "2020-01-01", `id_operario`: "{{id_operario}}", `id_proyecto`: "{{id_proyecto}}", `id_fase_proyecto`: "{{id_fase}}", `tiempo_estimado`: 60 | `POST /programacion` (token Admin) | Responde 400; Explica la regla de no-backdating | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-19 | Programar actividad válida (mañana) | API | Positivo | `fecha`: "{{manana}}", `id_operario`: "{{id_operario}}", `id_proyecto`: "{{id_proyecto}}", `id_fase_proyecto`: "{{id_fase}}", `tiempo_estimado`: 60 | `POST /programacion` (token Admin) | Responde 201; Queda en estado programado | 201 · 2/2 validaciones | ✅ Pasa |
| CP-API-20 | Mismo operario, mismo día (doble asignación) | API | Negativo | `fecha`: "{{manana}}", `id_operario`: "{{id_operario}}", `id_proyecto`: "{{id_proyecto}}", `id_fase_proyecto`: "{{id_fase}}", `tiempo_estimado`: 30 | `POST /programacion` (token Admin) | Responde 409; Avisa que el operario está ocupado | 409 · 2/2 validaciones | ✅ Pasa |
| CP-API-21 | Iniciar la actividad | API | Positivo | `estado`: "en_proceso" | `PATCH /programacion/{{id_turno}}/estado` (token Admin) | Responde 200 | 200 · 1/1 validaciones | ✅ Pasa |
| CP-API-22 | Estado de actividad no válido | API | Negativo | `estado`: "terminado-a-medias" | `PATCH /programacion/{{id_turno}}/estado` (token Admin) | Responde 400; Responde JSON con message | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-23 | Registrar 50 % de avance | API | Positivo | `porcentaje_avance`: 50 | `PATCH /programacion/{{id_turno}}/avance` (token Admin) | Responde 200 | 200 · 1/1 validaciones | ✅ Pasa |
| CP-API-24 | Vista Pendientes incluye la actividad en curso | API | Positivo | — | `GET /programacion?pendientes=1` (token Admin) | Responde 200; Solo programadas o en curso; Incluye la actividad creada, en curso | 200 · 3/3 validaciones | ✅ Pasa |
| CP-API-25 | Eliminar la actividad | API | Positivo | — | `DELETE /programacion/{{id_turno}}` (token Admin) | Responde 200 | 200 · 1/1 validaciones | ✅ Pasa |
| CP-API-26 | Operario intenta ver la bitácora de auditoría | API | Negativo | — | `GET /admin/bitacora` (token Operario) | Responde 403; Responde JSON con message | 403 · 2/2 validaciones | ✅ Pasa |
| CP-API-27 | Código de máquina más largo que la columna | API | Negativo | `nombre`: "Equipo Postman", `codigo`: "CODIGO-DEMASIADO-LARGO-PARA-LA-COLUMNA", `categoria`: "herramienta_electrica", `estado`: "activa" | `POST /maquinaria` (token Admin) | Responde 400; Error claro, no 500 ni SQL | 400 · 2/2 validaciones | ✅ Pasa |
| CP-API-28 | Ruta del API que no existe | API | Negativo | — | `GET /no-existe` (token Admin) | Responde 404; Responde JSON, no HTML | 404 · 2/2 validaciones | ✅ Pasa |
| CP-API-29 | Listado de usuarios no expone contraseñas | API | Positivo | — | `GET /usuarios` (token Admin) | Responde 200; Ningún usuario trae password_hash | 200 · 2/2 validaciones | ✅ Pasa |

## 2. Unitarias y de API con Supertest — Vitest (12 casos representativos)

La suite completa tiene **343 pruebas de backend** y **48 de frontend**. Estos son los casos de las reglas críticas. Datos: BD simulada con `vi.mock` y fechas fijas o reloj simulado (`vi.useFakeTimers`). Pasos: `pnpm test` en `backend/` o `frontend/`.

| ID | Caso | Nivel | Tipo | Datos | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|---|
| CP-UNIT-01 | El avance manual se limita a 99 % | Unitario | Negativo | `porcentaje_avance`: 150, actividad en proceso | `updateAvance` — `backend/tests/programacion.controller.test.js` | Guarda 99 (el 100 % es solo para "Completar") | Guarda 99 | ✅ Pasa |
| CP-UNIT-02 | El tiempo real lo calcula el servidor | Unitario | Positivo | Inicio 08:00, reloj 10:30, cliente envía 5 min | `updateEstado` a `completado` | Tiempo real 150 min, avance 100 % | 150 min, 100 % | ✅ Pasa |
| CP-UNIT-03 | No se inicia si el operario ya tiene otra actividad en curso | Unitario | Negativo | Operario 5 con otra actividad `en_proceso` | `updateEstado` a `en_proceso` | 409 y no actualiza nada | 409, sin `UPDATE` | ✅ Pasa |
| CP-UNIT-04 | Corrección de tiempos sin motivo | Unitario | Negativo | `motivo`: "  " | `corregirTiempos` | 400 "El motivo… es requerido", sin abrir conexión | 400 | ✅ Pasa |
| CP-UNIT-05 | Corrección que se cruza con otra actividad | Unitario | Negativo | Otra actividad del mismo operario en ese horario | `corregirTiempos` | 409 y no inicia la transacción | 409 | ✅ Pasa |
| CP-UNIT-06 | Corrección con fallo al guardar | Unitario | Negativo | La BD falla en el `UPDATE` | `corregirTiempos` | `rollback`, 500 genérico, conexión liberada | `rollback` + 500 | ✅ Pasa |
| CP-UNIT-07 | La fase se completa sola al terminar sus actividades | Unitario | Positivo | 2 actividades completadas al 100 % | `recomputeFase(70)` | Fase `completada` 100 % y registro en `historial_fases` | Completada + historial | ✅ Pasa |
| CP-UNIT-08 | Máquina obligatoria según la fase | API (Supertest) | Negativo | Fase con `categoria_equipo` y sin `id_maquina` | `POST /api/programacion` — `backend/tests/api/programacion.test.js` | 400 | 400 | ✅ Pasa |
| CP-UNIT-09 | Editar un turno antiguo sin cambiar su fecha | API (Supertest) | Positivo | Turno con fecha pasada, se cambia otro campo | `PUT /api/programacion/:id` | 200 (la regla de fecha solo aplica si la fecha cambió) | 200 | ✅ Pasa |
| CP-UNIT-10 | Login: mismo mensaje con correo inexistente o clave incorrecta | Unitario | Negativo | Correo inexistente / clave equivocada | `auth.login` — `backend/tests/auth.controller.test.js` | 401 con el mismo mensaje en ambos | 401 idéntico | ✅ Pasa |
| CP-UNIT-11 | Formulario de login vacío | Componente (frontend) | Negativo | Campos vacíos | Clic en "Iniciar sesión" — `frontend/src/components/Login.test.jsx` | Muestra los campos obligatorios y no llama al API | Sin llamada al API | ✅ Pasa |
| CP-UNIT-12 | Rol sin permisos | Unitario (frontend) | Negativo | Rol que no está en `ROLE_PERMISSIONS` | `canAccess` — `frontend/src/config/permissions.test.js` | Deniega cualquier módulo | Denegado | ✅ Pasa |

## 3. Integración con MySQL real (5 casos)

Datos: contenedor `mysql-test` desechable (puerto 3308). Pasos: `docker compose up -d mysql-test && cd backend && pnpm test:integration`. Archivo: `backend/tests/integration/clientes.db.test.js`.

| ID | Caso | Nivel | Tipo | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|
| CP-INT-01 | Crear un cliente real y leerlo de vuelta | Integración | Positivo | 201 y el `GET` devuelve lo guardado | — | ⏸ No ejecutado el 20 nov (Docker apagado). Última ejecución: semana 6, 5/5 ([PR #14](https://github.com/Erquinyer/asteron/pull/14)) |
| CP-INT-02 | NIT duplicado | Integración | Negativo | 409 con el mensaje del NIT, no el del código | — | ⏸ Ídem |
| CP-INT-03 | Código de cliente duplicado | Integración | Negativo | 409 con el mensaje del código | — | ⏸ Ídem |
| CP-INT-04 | Nombre de más de 120 caracteres | Integración | Negativo | 400, no 500 | — | ⏸ Ídem |
| CP-INT-05 | Datos inválidos no dejan registros a medias | Integración | Negativo | No inserta nada | — | ⏸ Ídem |

## 4. End-to-end — Playwright (2 casos)

Datos: usuario `admin@macromet.com.co` del seed. Pasos: `cd e2e && FRONT_PORT=5174 E2E_API_URL=http://localhost:3001/api pnpm test`.

| ID | Caso | Nivel | Tipo | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|
| CP-E2E-01 | Login exitoso | E2E | Positivo | Abrir `/login`, escribir correo y contraseña, clic en "Iniciar sesión" | Llega a `/dashboard` y saluda al usuario | Dashboard con el saludo (859 ms) | ✅ Pasa |
| CP-E2E-02 | Crear un cliente y verlo en la lista | E2E | Positivo | Login → aceptar la política de datos si aparece → Clientes → "Nuevo cliente" → nombre único → "Crear cliente" → buscarlo | El cliente aparece en la lista | Aparece (BD nueva y BD con política aceptada) | ✅ Pasa (tras corregir DEF-05 y DEF-06) |

## 5. Manual (1 caso)

| ID | Caso | Tipo | Datos | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|---|---|
| CP-MAN-01 | Recuperación de clave con envío real de correo | Positivo | Un usuario con un correo real del equipo; SMTP configurado en `backend/.env` | "¿Olvidaste tu contraseña?" → correo → abrir el enlace recibido → nueva clave → iniciar sesión con ella | Llega el correo; el enlace funciona una sola vez; la clave nueva sirve | _(pendiente: lo ejecuta el equipo con un buzón real)_ | ⏳ Pendiente |
