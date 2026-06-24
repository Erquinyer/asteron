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
    app.js                   ← Express app, all routes registered
    server.js                ← Entry point, MySQL pool check
    config/db.js             ← mysql2/promise pool
    middlewares/auth.js      ← JWT verifyToken middleware
    controllers/             ← One file per domain entity
    routes/                  ← One file per domain entity
  scripts/seed.js            ← Full Macromet real data seed
  .env                       ← DB creds, JWT_SECRET, PORT

frontend/
  src/
    api/           ← One service file per entity (axios calls)
    hooks/         ← useFetch.js (generic GET hook)
    pages/         ← One page per module
    components/
      dashboard/   ← StatCard, RecentProjects, PlantToday
      layout/      ← Sidebar, TopBar, AppLayout
      ui/          ← Spinner, EmptyState
    router/        ← ProtectedRoute, PublicRoute
    utils/auth.js  ← localStorage session helpers
```

## Architecture

### Auth flow
1. `POST /api/auth/login` → returns `{ user: { nombre, correo, rol, token } }`
2. Frontend stores in `localStorage` key `asteron_auth`
3. `axios.js` interceptor injects `Authorization: Bearer <token>` on every request
4. `401` response → auto-logout + redirect to `/login`
5. `PublicRoute` → redirects to `/dashboard` if already authenticated

### Data fetching pattern
All pages use `useFetch(serviceFn, deps)` hook — returns `{ data, loading, error, refresh }`.

### Protected modules (all require JWT)
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

## Notifications system
`GET /api/notificaciones` returns real-time alerts:
- Projects past their `fecha_fin_estimada` with incomplete phases
- Projects due within 7 days
- Machines with `estado = 'en_mantenimiento'`
- Active orders without an assigned project
