# Checklist de pruebas — App móvil Asteron

> Complemento de `APP_MOVIL.md`. Sirve para iPhone y Android (y también para la web).
> Marca cada punto con `[x]` cuando funcione y anota en la sección final lo que falle.

**Dispositivo:** ______________  **Sistema:** iOS / Android  **Fecha:** ____________  **Probado por:** ______________

---

## 0. Antes de empezar

- [ ] Backend corriendo en el computador (`npm run dev` en `backend`) y conectado a MySQL
- [ ] Celular en la misma red que el computador (Wi‑Fi o hotspot)
- [ ] `VITE_API_URL` en `frontend/.env` apunta a la IP actual del computador
- [ ] Se hizo `npm run build` + `npx cap sync` después del último cambio de código

**Usuarios de prueba**

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador Sistema | `admin@macromet.com.co` | `admin2026` |
| Gerente General | `alejandro@macromet.com.co` | `macromet2026` |
| Operario | `soldador1@macromet.com.co` | `operario2026` |

---

## 1. Instalación y apertura

- [ ] La app abre desde el ícono de la pantalla de inicio
- [ ] La pantalla no queda debajo de la barra de estado / notch (hora y batería se ven aparte)
- [ ] Funciona en vertical y en horizontal
- [ ] Al cerrar la app (deslizar hacia arriba) y volver a abrir, carga normal

## 2. Landing e inicio de sesión

- [ ] En la landing se ve y funciona el botón **Iniciar sesión** (arriba) y **Comenzar ahora**
- [ ] Login correcto con cada uno de los 3 usuarios de prueba
- [ ] Login con contraseña incorrecta muestra mensaje de error (no se queda cargando)
- [ ] Al escribir, el teclado no tapa los campos ni el botón de ingresar
- [ ] La sesión se mantiene al cerrar y volver a abrir la app
- [ ] **Cerrar sesión** regresa al login
- [ ] "¿Olvidaste tu contraseña?" abre la pantalla (el envío de correo solo funciona si hay `EMAIL_USER` configurado)

## 3. Navegación general

- [ ] El menú lateral se abre con el botón de menú y se cierra al tocar fuera
- [ ] Todas las opciones del menú llevan a su módulo
- [ ] El menú muestra solo los módulos permitidos según el rol (comparar admin vs operario)
- [ ] Modo oscuro / claro cambia bien y se mantiene al reabrir la app
- [ ] Los modales (crear/editar) se pueden desplazar y cerrar en pantalla pequeña
- [ ] Las tablas largas se pueden desplazar hacia los lados sin romper la pantalla

## 4. Dashboard

- [ ] Carga los indicadores (turnos de hoy, cumplimiento, proyectos en riesgo, capacidad)
- [ ] Botón de refrescar actualiza los datos
- [ ] **+ Programar turno** abre el formulario
- [ ] Gráficas y listas se ven completas en vertical

## 5. Proyectos

- [ ] Lista de proyectos carga
- [ ] Buscador filtra
- [ ] Filtro de **Prioridad** (alta / media / baja) funciona
- [ ] Crear proyecto nuevo
- [ ] No permite fechas pasadas
- [ ] Editar y eliminar proyecto
- [ ] Abrir detalle de un proyecto
- [ ] **Detalle → Kanban de fases:** arrastrar una fase a otra columna ⚠️ *verificar con el dedo: el arrastre está hecho para mouse y puede no responder en pantalla táctil*

## 6. Pedidos

- [ ] Lista de pedidos carga
- [ ] Crear pedido con uno o varios ítems
- [ ] El **punto de entrega** de cada ítem se elige entre las direcciones del cliente
- [ ] No permite fechas pasadas
- [ ] Editar y eliminar pedido

## 7. Clientes

- [ ] Lista y buscador
- [ ] Crear cliente con **varias direcciones** (Dirección 1, Dirección 2…)
- [ ] Editar direcciones y marcar la principal
- [ ] Eliminar cliente

## 8. Maquinaria

- [ ] Lista, buscador y filtros
- [ ] Panel de equipos **en uso hoy / sin uso**
- [ ] Crear equipo y asignar **responsable**
- [ ] Cambiar estado (activa, en mantenimiento, dado de baja…)
- [ ] Editar y eliminar

## 9. Mantenimientos

- [ ] Lista carga
- [ ] Registrar mantenimiento a un equipo
- [ ] Editar y cerrar mantenimiento

## 10. Programación (turnos)

- [ ] Vista lista carga y el buscador funciona
- [ ] Crear turno: solo aparecen máquinas **disponibles** en esa fecha
- [ ] Selector de operario muestra solo usuarios con rol de operario
- [ ] No permite fechas pasadas
- [ ] Editar turno programado
- [ ] Cambiar estado / avance del turno
- [ ] Cancelar turno
- [ ] **Vista Kanban:** arrastrar un turno entre columnas ⚠️ *verificar en pantalla táctil (mismo caso del punto 5)*
- [ ] **Importar Excel/CSV:** seleccionar archivo desde el celular, ver la vista previa y confirmar
- [ ] **Descargar plantilla (.xlsx)** ⚠️ *en la app móvil puede no descargar nada; en la web sí funciona*

## 11. Usuarios (admin)

- [ ] Lista de usuarios
- [ ] Crear, editar y desactivar usuario
- [ ] Iniciar sesión con el usuario creado

## 12. Panel de administración / permisos (admin)

- [ ] Matriz de permisos carga por rol
- [ ] Cambiar un permiso, guardar y comprobar con ese rol que se aplica
- [ ] La matriz se puede desplazar completa en el celular

## 13. Perfil

- [ ] Ver datos del usuario
- [ ] Editar datos / cambiar contraseña

## 14. Red y errores

- [ ] Con el backend **apagado**, la app muestra un error entendible (no pantalla en blanco)
- [ ] Al volver a encender el backend, la app vuelve a cargar datos (refrescar)
- [ ] Cambiando de red (otra IP), la app deja de conectar → confirma que hay que recompilar con la nueva IP

---

## Hallazgos

| # | Módulo | Qué pasó | Pasos para repetirlo | iOS / Android / Web | Captura |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
