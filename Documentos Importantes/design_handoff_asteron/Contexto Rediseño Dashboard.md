# Contexto para rediseño del Dashboard — Asteron (Macromet S.A.S.)

## Qué es el producto
**Asteron** es un sistema MES (Manufacturing Execution System) interno para **Macromet**, fabricante de exhibidores POP en Colombia. Es un proyecto vocacional SENA. Stack: React 18 + Vite + Tailwind CSS, backend Node/Express/MySQL. El dashboard es la pantalla de aterrizaje tras el login, usada a diario por gerentes y, en menor medida, operarios de planta.

## Objetivo del rediseño
Quiero rediseñar visualmente el **Dashboard** (`/dashboard`) manteniendo la identidad del sistema (tipografía, paleta, layout general con sidebar + topbar) pero mejorando jerarquía visual, composición y aprovechamiento del espacio. Necesito que el nuevo diseño respete el sistema de diseño existente (tokens de color, radios, sombras) para poder integrarlo sin reescribir toda la app.

## Estructura actual del Dashboard (contenido, de arriba hacia abajo)

1. **Saludo dinámico**: "Buenos días/tardes/noches, {nombre}" + subtítulo mono "Resumen del sistema · Macromet S.A.S."
2. **4 StatCards** en grid (2 cols en mobile, 4 en desktop):
   - Proyectos activos (icono carpeta, acento primary) — valor total + "X prioridad alta", link a `/proyectos`
   - Pedidos en sistema (icono carrito, acento secondary) — valor total + "X pendientes", link a `/pedidos`
   - Equipos activos (icono llave, acento success) — activos de X totales, link a `/maquinaria`
   - Usuarios activos (icono personas, acento warning) — activos de X totales, sin link
   - Cada card: barra de acento de 3px arriba, ícono en cuadro de color tenue (10% opacity), número grande (30px bold), label, sublabel en mono. Soporta badge de delta % (no usado actualmente).
3. **Fila de 2 gráficas** (grid `1.6fr / 1fr` en desktop, apiladas en mobile):
   - **Barras**: "Carga de producción" — horas-máquina programadas vs. reales, últimos 7 días (Recharts BarChart, dos series superpuestas por transparencia, no agrupadas lado a lado)
   - **Donut**: "Proyectos por estado" (en_proceso / completado / pendiente) con total centrado y leyenda manual a la derecha
4. **Fila de 2 listas** (grid `1.4fr / 1fr` en desktop):
   - **Proyectos recientes** (últimos 5): dot de prioridad, nombre + `#id · cliente`, barra de avance + %, click navega al detalle
   - **Programación de hoy**: turnos del día con máquina, operario, proyecto, badge de estado (Programado/En proceso/Completado/Cancelado), contador de turnos en el header

## Datos disponibles desde el backend (`GET /api/dashboard/stats`)
```json
{
  "stats": {
    "proyectos":  { "total": N, "destacado": N /* prioridad alta */ },
    "pedidos":    { "total": N, "destacado": N /* pendientes */ },
    "maquinaria": { "total": N, "destacado": N /* activas */ },
    "usuarios":   { "total": N, "destacado": N /* activos */ }
  },
  "recientes": [ { id_proyecto, nombre, prioridad, cliente, responsable, avance, estado, fecha_fin_estimada } ], // últimos 5
  "planta": [ { id_programacion, estado, tiempo_estimado, tiempo_real, operario, maquina, proyecto } ], // hoy
  "charts": {
    "produccion7dias": [ { name: "Lun", programado: 8.5, real: 7.2 }, ... ], // 7 días
    "porEstadoProyecto": [ { name: "en_proceso", value: N }, ... ]
  }
}
```
Hay también un `GET /api/dashboard/counts` (proyectos totales, pedidos pendientes) usado solo para badges del sidebar.

**Nota**: no hay campo `estado` directo en proyectos — se calcula desde el avance de `fases_proyecto`. Un rediseño podría aprovechar mejor los `responsable` y `fecha_fin_estimada` de proyectos recientes, que hoy llegan del backend pero no se muestran en la UI.

## Sistema de diseño / tokens (Tailwind)

**Colores de marca:**
- `primary` `#4F46E5` (hover `#4138BC`) — indigo
- `secondary` `#06B6D4` — cian
- `success` `#10B981` — verde
- `warning` `#F59E0B` — ámbar
- `error` `#F43F5E` — rosa/rojo

**Superficies (vía CSS vars, cambian con `.dark`):**
| Token | Light | Dark |
|---|---|---|
| `--bg` | `#F6F7FB` | `#080B14` |
| `--surface` | `#FFFFFF` | `#10141F` |
| `--surface-2` | `#F1F3F9` | `#171C2B` |
| `--sidebar` | `#FFFFFF` | `#0B0E18` |
| `--border` | `#E7E9F2` | `#222839` |
| `--border-strong` | `#D6DAE8` | `#363D54` |
| `--text` | `#161A2B` | `#ECEFF8` |
| `--muted` | `#5A6178` | `#98A0B8` |
| `--faint` | `#9097AD` | `#646C86` |
| `--hover` | `#F4F5FB` | `#171C2B` |

**Tipografía**: Geist (sans, pesos 400/500/600/700) para texto general; Geist Mono para labels técnicos, badges, cifras secundarias, uppercase con tracking amplio (`.06em`–`.16em`).

**Radios**: `card` 13px, `control` 10px, `badge` 7px.

**Sombras**: `shadow-card` (sutil, light), `shadow-card-dk` (dark, más profunda), `shadow-modal`, `shadow-btn` (glow indigo).

**Modo oscuro**: implementado en toda la app vía clase `.dark` + toggle en TopBar. El rediseño debe funcionar en ambos modos.

## Layout que envuelve al dashboard (no se rediseña, pero da contexto)
- **Sidebar** izquierdo (248px expandido / 74px colapsado): logo, navegación agrupada en "Principal / Recursos / Sistema" con iconos Lucide, badges de conteo, colapsable.
- **TopBar** (64px, sticky, blur): título de página + fecha, buscador centrado (⌘K, no funcional aún), toggle claro/oscuro, campana de notificaciones (dropdown con alertas), menú de usuario (avatar con iniciales, rol, logout).
- Contenido del dashboard vive en un `<main>` con padding, ancho máximo `max-w-7xl`.

## Roles de usuario que ven el dashboard
- Gerente General / Administrador Sistema: acceso completo, vista más "ejecutiva".
- Operario: acceso limitado por RBAC (`config/permissions.js`), probablemente interesado sobre todo en "Programación de hoy".

## Qué me gustaría que el rediseño explore
- Mejor jerarquía visual entre "resumen ejecutivo" (KPIs, gráficas) y "acción operativa" (programación de hoy, proyectos recientes).
- Posible uso de los datos ya disponibles pero no mostrados (responsable de proyecto, fecha límite).
- Mantener consistencia con el resto de módulos (Proyectos, Pedidos, etc.) que usan el mismo lenguaje visual (StatCard, listas con avatar/dot + badge).
- Debe verse bien en mobile (grid colapsa a 1–2 columnas) y respetar modo oscuro.

---
*Generado a partir del código fuente actual de `frontend/src/pages/Dashboard.jsx`, sus componentes en `components/dashboard/`, `tailwind.config.js`, `index.css` y `backend/src/controllers/dashboard.controller.js`.*
