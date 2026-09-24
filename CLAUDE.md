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
  scripts/seed.js                 ← Full Macromet real data seed
  .env                            ← DB creds, JWT_SECRET, PORT, SMTP creds (Nodemailer)

frontend/
  src/
    api/           ← One service file per entity (axios calls)
    hooks/         ← useFetch.js (generic GET hook)
    pages/         ← One page per module (incl. Landing, AdminPanel, ForgotPassword, ResetPassword, NotFound)
    config/permissions.js ← canAccess(rol, module) — frontend RBAC lookup
    components/
      dashboard/   ← StatCard, RecentProjects, PlantToday
      layout/      ← Sidebar, TopBar, AppLayout
      ui/          ← Spinner, EmptyState
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
| `/proyectos/:id` | Phase-by-phase detail, edit avance inline | — |
| `/pedidos` | Orders with items | Full CRUD |
| `/clientes` | Client cards | Full CRUD |
| `/maquinaria` | Equipment inventory with category filter | Full CRUD |
| `/mantenimientos` | Maintenance history | Create + Delete |
| `/programacion` | Daily plant schedule with date nav | Create + Estado + Delete |
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
clientes → pedidos → detalle_pedido
                  └→ proyectos → fases_proyecto (from fases_estandar templates)
usuarios ──── roles
maquinaria → mantenimientos
programacion_planta (operario + maquina + proyecto + fecha)
```

### Key design decisions
- `proyectos.prioridad`: `'alta' | 'media' | 'baja'`
- `proyectos` has no `estado` column — estado is computed from `fases_proyecto.estado`
- `maquinaria.estado` ENUM: `activa | inactiva | en_mantenimiento | sin_asignar | guardada | dado_de_baja`
- `maquinaria` extra columns (added via ALTER): `codigo, categoria, marca, referencia, serial, ubicacion`
- `maquinaria.categoria`: `maquinaria_pesada | equipo_mig | herramienta_electrica`
- `usuarios.password_hash` (renamed from `contraseña` in v2 schema)
- Soft deletes not used — `ON DELETE SET NULL` for most FKs, `ON DELETE CASCADE` for `mantenimientos → maquinaria`
- `fases_proyecto.id_detalle_pedido` (nullable FK → `detalle_pedido.id_detalle`): project-level phases (Diseño, Compra de materiales) are created once with `NULL`; when a project's pedido has 2+ items, the remaining phases are cloned **once per item** so each product's progress/estado is tracked independently — a phase name (e.g. "Corte") legitimately repeats once per item. Controllers expose the item via `LEFT JOIN detalle_pedido ... AS item_producto` (`proyectos.controller.js getOne`, `programacion.controller.js`); the UI must group/label by `item_producto` wherever it lists phases for a multi-item project (done in `TurnoModal.jsx` via `<optgroup>`, `ProyectoDetalle.jsx` via a per-item accordion) instead of showing them as a flat list.

## Notifications system
`GET /api/notificaciones` returns real-time alerts:
- Projects past their `fecha_fin_estimada` with incomplete phases
- Projects due within 7 days
- Machines with `estado = 'en_mantenimiento'`
- Active orders without an assigned project
