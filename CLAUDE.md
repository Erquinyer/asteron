# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Asteron** is a full-stack manufacturing/production management system built for **Macromet** (POP display manufacturer in Colombia). SENA vocational school project.

**Stack:** React 18 + Vite + Tailwind CSS (frontend) · Node.js + Express + MySQL (backend) · JWT auth

## Running the System

```bash
# Terminal 1 — backend (port 3000)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173)
cd frontend && npm run dev
```

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
8. Backend RBAC gate: `requireAdmin` middleware restricts `/api/admin/*` to `rol === 'Administrador Sistema'`, on top of the global `verifyToken`

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
- Soft deletes not used — `ON DELETE SET NULL` for most FKs, `ON DELETE CASCADE` for `mantenimientos → maquinaria`
- `fases_proyecto.id_detalle_pedido` (nullable FK → `detalle_pedido.id_detalle`): project-level phases (Diseño, Compra de materiales) are created once with `NULL`; when a project's pedido has 2+ items, the remaining phases are cloned **once per item** so each product's progress/estado is tracked independently — a phase name (e.g. "Corte") legitimately repeats once per item. Controllers expose the item via `LEFT JOIN detalle_pedido ... AS item_producto` (`proyectos.controller.js getOne`, `programacion.controller.js`); the UI must group/label by `item_producto` wherever it lists phases for a multi-item project (done in `TurnoModal.jsx` via `<optgroup>`, `ProyectoDetalle.jsx` via a per-item accordion) instead of showing them as a flat list.
- `clientes` has no `direccion` column — normalized into `direcciones_cliente` (1FN, same pattern as `contactos_cliente`: `id_cliente, etiqueta, direccion, principal`). `clientes.controller.js` fully replaces a client's address list on every create/update (`guardarDirecciones`); `getAll`/`getOne` expose a `direccion_principal` computed column plus a `direcciones` array on `getOne`.
- **No-backdating rule**: `proyectos.fecha_inicio`, `programacion_planta.fecha`, and new `detalle_pedido` items reject past dates on create (`esFechaPasada` in `backend/src/utils/dates.js`). On **update**, the check only fires if that specific date field actually changed from its stored value — editing unrelated fields on an already-in-progress record (whose start date is legitimately in the past) must not be blocked. See `proyectos.controller.js update` and `programacion.controller.js update` for the "did it change" comparison pattern (uses `fechaColumnaISO()` to read the stored DATE column safely).
- **Turno availability** (`programacion_planta`): an operario/máquina is unavailable if (a) they have any turno `en_proceso` right now, regardless of date, or (b) they already have a turno `programado`/`en_proceso` for that *specific* date (`GET /programacion/ocupados?fecha=`). Frontend (`TurnoModal.jsx`) excludes unavailable options from the selects entirely rather than just disabling them, and re-queries whenever the chosen fecha changes.
- `programacion.controller.js` exports `validarTurnoInterno()` (read-only rule checks: fecha, disponibilidad, fase) and `crearTurnoInterno()` (validates then inserts). `create` and the bulk importer (`POST /programacion/importar`) both call `crearTurnoInterno` directly; `update` re-implements the same checks inline (it needs `id_programacion != ?` in the availability queries to exclude itself, which the shared function doesn't take) — **keep both in sync by hand** when this rule set changes.
- `fases_estandar.requiere_turno` (bool) + `.categoria_equipo` (nullable, same ENUM domain as `maquinaria.categoria`) drive Programación: fases with `requiere_turno=0` (Diseño, Compra de materiales, Pintura y acabados — the last is done by a third party) are control manual only, never selectable as a turno's fase and exempt from the Kanban "no activities → can't go to en_curso" rule (`ProyectoDetalle.jsx handleKanbanDrop`). Pintura y acabados is still a normal **per-item** fase (`id_detalle_pedido` set, one row per product) despite being manual — only Diseño/Compra are project-level (see the `id_detalle_pedido` note above). For turno-driven fases, `categoria_equipo` (`maquinaria_pesada` for Corte/Doblez, `equipo_mig` for Soldadura MIG, `herramienta_electrica` for Lijado/Ensamble final, `NULL` for Control de calidad/Despacho) filters the Equipo `<select>` in `TurnoModal.jsx` and makes it optional when `NULL` — `validarTurnoInterno`/`update` enforce the same máquina-required-or-not server-side, so the frontend filter isn't the only guard.
- Kanban board views (`ProyectoDetalle.jsx` fases, `Programacion.jsx` turnos) use the native HTML5 Drag and Drop API — no drag-and-drop library is installed in `frontend/package.json`, keep it that way unless a real need arises.
- `xlsx`/SheetJS is intentionally **not** used for spreadsheet parsing — its npm package has unpatched prototype-pollution/ReDoS advisories, exactly the wrong tradeoff for a parser fed user-uploaded files. Use `exceljs` instead (already a backend dependency).
- `pedidos.controller.js update` syncs `detalle_pedido` items in place (update existing rows by `id_detalle`, insert new ones, delete removed ones) instead of delete-all-then-recreate — the old approach reassigned every item a new `id_detalle` on every save, which cascade-deleted **all** items' `fases_proyecto` rows (`fk_fase_detalle ... ON DELETE CASCADE`) any time the pedido was saved with a project already attached. Newly-inserted items get their fases generated via `crearFasesItem` (`backend/src/utils/fasesProyecto.js`) if the pedido already has a `proyecto` — this is what makes "add an item to an existing order" show up correctly in the project's phase list.

## Notifications system
`GET /api/notificaciones` returns real-time alerts:
- Projects past their `fecha_fin_estimada` with incomplete phases
- Projects due within 7 days
- Machines with `estado = 'en_mantenimiento'`
- Active orders without an assigned project
