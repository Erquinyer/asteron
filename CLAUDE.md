# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Asteron** is a full-stack manufacturing/production management system built for **Macromet** (POP display manufacturer in Colombia). SENA vocational school project.

**Stack:** React 18 + Vite + Tailwind CSS (frontend) · Node.js + Express + MySQL (backend) · JWT auth

## Running the System

```bash
# Terminal 1 — backend (port 3000)
cd backend && pnpm dev

# Terminal 2 — frontend (port 5173)
cd frontend && pnpm dev
```

Package manager is **pnpm** (pinned via `packageManager` in each `package.json`) — not npm/yarn. Each `package.json` pins exact dependency versions (no `^`/`~` ranges) for reproducible, auditable installs; always run `pnpm install` after pulling changes that touch a `package.json`.

Alternative: `docker compose up --build` runs the whole stack (MySQL + backend + frontend behind nginx) without installing Node/MySQL locally — see the "Correr todo con Docker" section in `README.md` for the one-time migration/seed step. `backend/Dockerfile` and `frontend/Dockerfile` both install pnpm explicitly (no corepack — not available in every Node build); `frontend/Dockerfile` bakes `VITE_API_URL` in at build time via a build ARG, since Vite env vars are compile-time, not runtime.

**Test credentials:**
- `admin@macromet.com.co` / `admin2026` (Gerente General — Administrador Sistema)
- `alejandro@macromet.com.co` / `macromet2026` (Gerente General)
- `soldador1@macromet.com.co` / `operario2026` (Operario)

## Repository Structure

```
backend/
  src/
    app.js                        ← Express app, all routes registered
    server.js                     ← Entry point, MySQL pool check
    config/db.js                  ← mysql2/promise pool
    middlewares/auth.middleware.js ← JWT verifyToken middleware
    middlewares/requireAdmin.js   ← Gate for 'Administrador Sistema' role only
    controllers/                  ← One file per domain entity (incl. admin, recovery)
    routes/                       ← One file per domain entity (incl. admin)
    utils/
      dates.js                    ← hoyISO()/esFechaPasada()/fechaColumnaISO() — always build "today" from local
                                     Date components, never toISOString().slice(0,10): that converts to UTC and
                                     shifts the date by one day during evening hours in negative-UTC timezones
                                     (this server runs UTC-5) — apply the same rule in any new frontend "today" helper
      importProgramacion.js       ← Excel/CSV bulk-import for programación: parses rows (exceljs) and resolves
                                     Operario/Maquina/Proyecto/Item/Fase by name or código to IDs
      fasesProyecto.js            ← crearFasesItem(): generates the per-item fases (Corte→Despacho) for one
                                     detalle_pedido row — used at project creation and when a new item is
                                     added to a pedido that already has a project (pedidos.controller.js update)
      exportarReporte.js          ← generic Excel (exceljs) and PDF (pdfkit) writers for reportes
      resolveUsuarioPorRol.js
  scripts/seed.js                 ← Full Macromet real data seed
  .env                            ← DB creds, JWT_SECRET, PORT, SMTP creds (Nodemailer)

frontend/
  src/
    api/           ← One service file per entity (axios calls)
    hooks/         ← useFetch.js (generic GET hook)
    pages/         ← One page per module (incl. Landing, AdminPanel, ForgotPassword, ResetPassword, NotFound)
    config/permissions.js ← canAccess(rol, module) — frontend RBAC lookup
    components/
      dashboard/     ← StatCard, RecentProjects, PlantToday
      layout/        ← Sidebar, TopBar, AppLayout
      programacion/  ← TurnoModal (create/edit a turno), ImportarModal (bulk Excel/CSV upload)
      ui/            ← Spinner, EmptyState
    router/        ← ProtectedRoute (auth), PublicRoute (guest-only), RoleRoute (per-module RBAC)
    utils/auth.js  ← localStorage session helpers
```

## Architecture

### Auth flow
1. `POST /api/auth/login` → returns `{ user: { nombre, correo, rol, token } }`
2. Frontend stores in `localStorage` key `asteron_auth`
3. `axios.js` interceptor injects `Authorization: Bearer <token>` on every request
4. `401` response → auto-logout + redirect to `/login`
5. `PublicRoute` → redirects to `/dashboard` if already authenticated
6. Password recovery: `POST /api/auth/forgot-password` (sends reset link via Nodemailer) → `POST /api/auth/reset-password` — both public, no JWT required
7. `RoleRoute` (per-route) → checks `canAccess(user.rol, module)` from `config/permissions.js`; redirects to `/dashboard` if the role lacks access to that module
8. Backend RBAC gate: `requireAdmin` middleware restricts `/api/admin/*` to `rol === 'Administrador Sistema'`, on top of the global `verifyToken`. Every other route is gated in its `routes/*.js` with `middlewares/requireModulo.js`: `requireAccion(modulo, accion)` on writes (same `acciones_modulo` data as the frontend's `canDo`) and `requireModulo([...])` on reads — reads take a **list** of modules because pages load catalogs from other modules (e.g. Programación lists usuarios and maquinaria; Pedidos lists clientes), so when a page starts calling a new endpoint, add its module to that route's list. `proyectos.updateFase` checks the action in the controller because the person assigned to a Diseño/Compra fase can manage it without `editar`.

### Data fetching pattern
All pages use `useFetch(serviceFn, deps)` hook — returns `{ data, loading, error, refresh }`.

### Public routes (no auth)
| Route | Page |
|---|---|
| `/` | `Landing.jsx` — public marketing/hero page |
| `/login` | Login |
| `/forgot-password` | Request password reset email |
| `/reset-password` | Set new password via emailed token |
| `*` | `NotFound.jsx` |

### Protected modules (all require JWT; some also gated by role via `RoleRoute`)
| Route | Page | CRUD |
|---|---|---|
| `/dashboard` | Stats + charts (recharts) | — |
| `/proyectos` | Project list | Full CRUD |
| `/proyectos/:id` | Phase-by-phase detail (list or Kanban view), edit avance inline | — |
| `/pedidos` | Orders with items | Full CRUD |
| `/clientes` | Client cards, multiple direcciones per client | Full CRUD |
| `/maquinaria` | Equipment inventory with category filter, responsable, en-uso-hoy badge | Full CRUD |
| `/mantenimientos` | Maintenance history | Create + Delete |
| `/programacion` | Daily/weekly/monthly plant schedule (list or Kanban view); bulk-load via Excel/CSV import | Create + Edit + Estado + Cancel + Delete + Import |
| `/usuarios` | Team cards | Create + Edit + Toggle estado |
| `/reportes` | Horas y costo de mano de obra, avance y mantenimientos, con filtros y exportación a Excel/PDF | — |
| `/perfil` | Own profile + change password | — |
| `/admin` | `AdminPanel.jsx` — roles CRUD, per-module permissions, per-module actions (granular RBAC), user role assignment | Full CRUD (roles); restricted to `Administrador Sistema` via `requireAdmin` |

### UI
- Dark mode implemented across all modules.

## Database

**Engine:** InnoDB · **Charset:** utf8mb4 · **DB:** `asteron`

Restore:
```bash
mysql -u root -p < "Data Base/asteron_v2.sql"
node backend/scripts/seed.js   # loads Macromet real data
```

### Core domain model
```
clientes → direcciones_cliente
        └→ pedidos → detalle_pedido
                  └→ proyectos → fases_proyecto (from fases_estandar templates)
usuarios ──── roles
maquinaria → mantenimientos
maquinaria → usuarios (id_responsable, nullable)
programacion_planta (operario + maquina + proyecto + fase_proyecto + fecha)
```

### Key design decisions
- `proyectos.prioridad`: `'alta' | 'media' | 'baja'`
- `proyectos` has no `estado` column — estado is computed from `fases_proyecto.estado`
- `maquinaria.estado` ENUM: `activa | inactiva | en_mantenimiento | sin_asignar | guardada | dado_de_baja`
- `maquinaria` extra columns (added via ALTER): `codigo, categoria, marca, referencia, serial, ubicacion, id_responsable` (nullable FK → `usuarios`, "encargado del equipo")
- `maquinaria.categoria`: `maquinaria_pesada | equipo_mig | herramienta_electrica`
- `usuarios.password_hash` (renamed from `contraseña` in v2 schema)
- Soft deletes not used — `ON DELETE SET NULL` for most FKs; `mantenimientos → maquinaria` is `ON DELETE RESTRICT` (keeps maintenance history: `maquinaria.remove` answers 409 and the UI should mark the equipo `dado_de_baja` instead)
- `fases_proyecto.id_detalle_pedido` (nullable FK → `detalle_pedido.id_detalle`): project-level phases (Diseño, Compra de materiales) are created once with `NULL`; when a project's pedido has 2+ items, the remaining phases are cloned **once per item** so each product's progress/estado is tracked independently — a phase name (e.g. "Corte") legitimately repeats once per item. Controllers expose the item via `LEFT JOIN detalle_pedido ... AS item_producto` (`proyectos.controller.js getOne`, `programacion.controller.js`); the UI must label by `item_producto` wherever it lists phases for a multi-item project (done in `TurnoModal.jsx` via a `SearchableSelect` sublabel — `components/ui/SearchableSelect.jsx`, which also supports per-option `disabled` for completed fases — searchable by fase name or ítem, not a plain `<select>`/`<optgroup>`; `ProyectoDetalle.jsx` via a per-item accordion) so it's never ambiguous which product a repeated phase name belongs to.
- `clientes` has no `direccion` column — normalized into `direcciones_cliente` (1FN, same pattern as `contactos_cliente`: `id_cliente, etiqueta, direccion, principal`). `clientes.controller.js` fully replaces a client's address list on every create/update (`guardarDirecciones`); `getAll`/`getOne` expose a `direccion_principal` computed column plus a `direcciones` array on `getOne`.
- **No-backdating rule**: `proyectos.fecha_inicio`, `programacion_planta.fecha`, and new `detalle_pedido` items reject past dates on create (`esFechaPasada` in `backend/src/utils/dates.js`). On **update**, the check only fires if that specific date field actually changed from its stored value — editing unrelated fields on an already-in-progress record (whose start date is legitimately in the past) must not be blocked. See `proyectos.controller.js update` and `programacion.controller.js update` for the "did it change" comparison pattern (uses `fechaColumnaISO()` to read the stored DATE column safely).
- **Turno availability** (`programacion_planta`): an operario/máquina is unavailable if (a) they have any turno `en_proceso` right now, regardless of date, or (b) they already have a turno `programado`/`en_proceso` for that *specific* date (`GET /programacion/ocupados?fecha=`). Frontend (`TurnoModal.jsx`) excludes unavailable options from the selects entirely rather than just disabling them, and re-queries whenever the chosen fecha changes.
- `programacion.controller.js` exports `validarTurnoInterno()` (read-only rule checks: fecha, disponibilidad, fase) and `crearTurnoInterno()` (validates then inserts). `create` and the bulk importer (`POST /programacion/importar`) both call `crearTurnoInterno` directly; `update` re-implements the same checks inline (it needs `id_programacion != ?` in the availability queries to exclude itself, which the shared function doesn't take) — **keep both in sync by hand** when this rule set changes.
- `fases_estandar.requiere_turno` (bool) + `.categoria_equipo` (nullable, same ENUM domain as `maquinaria.categoria`) drive Programación: fases with `requiere_turno=0` (Diseño, Compra de materiales, Pintura y acabados — the last is done by a third party) are control manual only, never selectable as a turno's fase and exempt from the Kanban "no activities → can't go to en_curso" rule (`ProyectoDetalle.jsx handleKanbanDrop`). Pintura y acabados is still a normal **per-item** fase (`id_detalle_pedido` set, one row per product) despite being manual — only Diseño/Compra are project-level (see the `id_detalle_pedido` note above). For turno-driven fases, `categoria_equipo` (`maquinaria_pesada` for Corte/Doblez, `equipo_mig` for Soldadura MIG, `herramienta_electrica` for Lijado/Ensamble final, `NULL` for Control de calidad/Despacho) filters the Equipo `<select>` in `TurnoModal.jsx` and makes it optional when `NULL` — `validarTurnoInterno`/`update` enforce the same máquina-required-or-not server-side, so the frontend filter isn't the only guard.
- Kanban board views (`ProyectoDetalle.jsx` fases, `Programacion.jsx` turnos) use the native HTML5 Drag and Drop API — no drag-and-drop library is installed in `frontend/package.json`, keep it that way unless a real need arises.
- `xlsx`/SheetJS is intentionally **not** used for spreadsheet parsing — its npm package has unpatched prototype-pollution/ReDoS advisories, exactly the wrong tradeoff for a parser fed user-uploaded files. Use `exceljs` instead (already a backend dependency).
- `pedidos.controller.js update` syncs `detalle_pedido` items in place (update existing rows by `id_detalle`, insert new ones, delete removed ones) instead of delete-all-then-recreate — the old approach reassigned every item a new `id_detalle` on every save, which cascade-deleted **all** items' `fases_proyecto` rows (`fk_fase_detalle ... ON DELETE CASCADE`) any time the pedido was saved with a project already attached. Newly-inserted items get their fases generated via `crearFasesItem` (`backend/src/utils/fasesProyecto.js`) if the pedido already has a `proyecto` — this is what makes "add an item to an existing order" show up correctly in the project's phase list.
- `detalle_pedido` has no `punto_descargue` column — normalized into `puntos_entrega_detalle` (1FN, same pattern as `direcciones_cliente`): one product can ship to **several** delivery locations, each with its own `cantidad`; the sum across a product's `puntos_entrega_detalle` rows must equal `detalle_pedido.cantidad` (validated in `pedidos.controller.js` — `validarUbicaciones` on create/update, client-side mirror in `Pedidos.jsx` — not enforced at the DB level). `pedidos.controller.js` manages the child rows the same way as `clientes.controller.js` manages `direcciones_cliente` (`guardarUbicaciones`: delete-all-and-reinsert per item). A database created before this change needs `node backend/scripts/migrate_puntos_entrega.js` run once (creates the table, migrates existing `punto_descargue` values into it, drops the column) — the Docker/fresh-install schema (`Data Base/asteron_v2.sql`) already has the new shape.
- Cross-navigation between Pedidos/Proyectos/Programación uses the same "arrive via query param, consume once, then clear it" convention in three places: `Proyectos.jsx` (`?nuevo=1&id_pedido=X`, from "crear proyecto asociado" in Pedidos), `Pedidos.jsx` (`?ver=X` opens `PedidoDetailModal`, from "Ver pedido" in `ProyectoDetalle.jsx`), and `Programacion.jsx` (`?proyecto=X` pre-filters the list/Kanban to that project exactly — not a text search — from "Ver en Programación" in `ProyectoDetalle.jsx`). Each reads `searchParams` once in a mount-only `useEffect` (`eslint-disable-next-line react-hooks/exhaustive-deps` on the empty dep array) and calls `setSearchParams({}, { replace: true })` to strip the param so it doesn't re-trigger on refresh/back-navigation.
- `ProyectoDetalle.jsx` shows a cross-item "Resumen por fase" panel (how many products are `completada`/`en_curso`/`pendiente`/`bloqueada` for each fase name) whenever `mostrarPorItem` is true (2+ products) — complements the per-item accordion below it, which already shows each product's own fases but not a same-phase cross-product count.

- `mantenimientos.estado` (`programado` | `realizado`): a programado has no `realizado_por`, its `fecha` is the planned date (can't be past), and a correctivo doesn't stop the machine until `PATCH /mantenimientos/:id/realizar`, which also sets `fecha` to the execution date.
- **Tiempos** (`programacion_planta.hora_inicio`/`hora_fin`): `updateEstado` sets them server-side with a Node `Date` (not MySQL `NOW()`, to avoid depending on the engine's timezone) and derives `tiempo_real` from them on completion — a client-sent `tiempo_real` is only used if the turno was never started. Corrections go through `PATCH /programacion/:id/tiempos` (`corregirTiempos`): completed turnos only, motivo required, no overlap with the same operario's other turnos, and every change is logged in `correcciones_tiempo`.
- **Reportes** (`reportes.controller.js`, `utils/exportarReporte.js`): `datosHoras`/`datosAvance`/`datosMantenimientos` feed both the JSON endpoints and `GET /reportes/:tipo/exportar?formato=xlsx|pdf`; exports are declared as `secciones` so both formats share one definition. Costs are **out of the MVP scope**: `COSTOS_HABILITADOS = false` in `reportes.controller.js` (and in `AdminPanel.jsx`, which hides the Valor hora field) strips them from every report and export; flip both to re-enable. When enabled: cost = real hours × `roles.valor_hora` of the operario's **current** role (no history), only for `ROLES_COSTOS` (Gerente General, Administrador Sistema); a missing `valor_hora` is reported as "sin valor hora", never as a cost of zero. `desviacion_horas` only compares activities that have a real time, so unfinished turnos don't look like the plant is ahead of schedule.
- `scripts/accionesPorDefecto.js` holds the default `acciones_modulo` rows and is called from both `migrate_acciones_modulo.js` and `seed.js`: the seed's `DELETE FROM roles` cascades into `acciones_modulo`, which would otherwise leave every non-admin role unable to write. A database created before these modules needs `node backend/scripts/migrate_tiempos_reportes.js` once (idempotent).

- **Ley 1581 (datos personales)**: public policy page `/politica-datos` (`PoliticaDatos.jsx`, also exports `ContenidoPolitica` reused by `PoliticaDatosModal.jsx`). Login returns `politica_pendiente` (stored `usuarios.politica_datos_version` ≠ `POLITICA_DATOS_VERSION` in `backend/src/utils/politicaDatos.js`); `AppLayout` blocks the app with the authorization modal until `POST /api/perfil/politica-datos` records version + timestamp. Bump the version constant in **both** backend and `PoliticaDatos.jsx` whenever the policy text changes so everyone re-authorizes. Older DBs need `node backend/scripts/migrate_politica_datos.js` once.
- **Respaldos**: `Data Base/respaldar.sh` / `restaurar.sh` (read `DB_*` from env or `backend/.env`); the `respaldo` Compose service runs a daily backup into `./respaldos/` (gitignored). Load test for RNF-08/09: `pnpm prueba-carga` in `backend/` (`scripts/pruebaCarga.js`, results in `docs/prueba-rendimiento.md`).

- **API docs**: hand-written OpenAPI spec in `backend/src/docs/openapi.js` (built with the `op()` helper), served by `swagger-ui-express` at `/api/docs` (public, before `verifyToken`). Adding/removing a route in `routes/*.js` requires updating the spec — `pnpm verificar-openapi` (`scripts/verificarOpenapi.js`) diffs it against the real Express routers and fails otherwise. `swagger-ui-dist` is pinned as a direct dependency (swagger-ui-express only asks for `>=5`); `pnpm-workspace.yaml` denies `@scarf/scarf`'s telemetry build script, and pnpm 11 fails `install` without that decision — the backend Dockerfile copies that file for the same reason.
- **Bitácora de auditoría** (`bitacora_auditoria`, `utils/bitacora.js`): any write to `usuarios` or `maquinaria` takes `fotoUsuario`/`fotoMaquina` before and after and calls `registrarBitacora` (stores only changed fields; passwords never, just a `contrasena` entry). Already wired in usuarios/admin/perfil/recovery/maquinaria/mantenimientos controllers — a new code path that writes those tables must do the same. Read via `GET /api/admin/bitacora` (Administración → Bitácora). Older DBs need `node backend/scripts/migrate_bitacora.js` once.

## Notifications system
`GET /api/notificaciones` returns real-time alerts:
- Projects past their `fecha_fin_estimada` with incomplete phases
- Projects due within 7 days
- Machines with `estado = 'en_mantenimiento'`
- Active orders without an assigned project
- Turnos en proceso past their `tiempo_estimado` (non-scheduler roles only see their own)
- Fases past their `fecha_fin` that aren't completed
- Mantenimientos programados overdue or due within 7 days

Alerts are computed on every request and tagged with a `modulo`: a user only sees alerts for modules their role can access. `POST /api/notificaciones/:clave/atender` stores the alert key per user in `notificaciones_atendidas`; keys that stop being active are deleted on read, so a problem that comes back alerts again.
