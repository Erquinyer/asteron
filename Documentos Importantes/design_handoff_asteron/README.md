# Handoff: Rediseño visual de Asteron (MES — Macromet S.A.S.)

> **👉 Empieza por `INSTRUCCIONES-CLAUDE-CODE.md`** para el logo nuevo y el hero interactivo del landing (ambos aprobados por el cliente). Este README cubre el rediseño visual general de la app.

## Overview
Rediseño visual moderno del sistema web de gestión de producción manufacturera **Asteron** (fabricante de displays POP, Macromet S.A.S.). El objetivo es **renovar la capa visual** (color, tipografía, sidebar, topbar, dashboard, tablas, cards de planta, modales, landing y dark mode) **conservando intactas la estructura, navegación y funcionalidad actuales**.

El stack destino es **React 18 + Vite + Tailwind CSS + Lucide React**, con **dark mode** y diseño **responsive** (mobile-first). No se cambian librerías (Recharts para gráficas, react-hot-toast para toasts).

---

## About the Design Files
El archivo `Asteron Rediseño.dc.html` incluido en este paquete es una **referencia de diseño creada en HTML** — un prototipo navegable que muestra la apariencia y el comportamiento previstos. **No es código de producción para copiar tal cual.**

La tarea es **recrear este diseño en el codebase real de Asteron** (React + Tailwind ya existente), reutilizando sus componentes, convenciones y utilidades. Todo lo descrito aquí debe traducirse a clases de Tailwind y componentes funcionales de React; los estilos inline y los tokens CSS del prototipo son orientativos.

> El prototipo usa variables CSS (`--primary`, `--surface`, etc.) e estilos inline solo para poder renderizarse de forma autónoma. En el codebase real, mapéalos a la configuración de Tailwind (`tailwind.config.js`) y a clases utilitarias / `dark:` variants.

### Cómo navegar el prototipo
Abre `Asteron Rediseño.dc.html` en un navegador. El sidebar permite ver: Dashboard, Proyectos (tabla), Programación (cards de planta), Maquinaria (tabla), Clientes, Usuarios, **Sistema de diseño** (paleta + tipografía + componentes), y Landing page. El botón de luna/sol del topbar alterna **dark mode real**. El botón "Nuevo proyecto" abre el **modal** rediseñado.

---

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado, radios y estados están definidos con precisión. El desarrollador debe recrear la UI fielmente usando las librerías y patrones existentes del codebase. Los valores hex y las medidas en px de este documento son la fuente de verdad.

---

## Design Tokens

### Color — Acento de marca (primario)
Reemplaza el `blue-600` genérico por un **índigo profundo** (dirección "tech / premium" elegida por el cliente).

| Rol | Token | Hex | Uso |
|---|---|---|---|
| **Primario** | `--primary` | `#4F46E5` (indigo-600) | Botones primarios, ítem activo, acentos, links, foco de inputs |
| Primario hover | `--primary-hover` | `≈ #4138BC` (`primary` mezclado 82% con negro) | Hover de botón primario |
| **Secundario** | `--secondary` | `#06B6D4` (cyan-500) | Estado "programado", acento informativo |
| **Éxito** | `--success` | `#10B981` (emerald-500) | Activo / completado |
| **Advertencia** | `--warning` | `#F59E0B` (amber-500) | Media / en pausa / mantenimiento |
| **Error** | `--error` | `#F43F5E` (rose-500) | Alta prioridad / error / eliminar |

> El prototipo permite alternar el primario entre `#4F46E5`, `#6D28D9`, `#2563EB`, `#3B5BDB`. **El valor de referencia es `#4F46E5`.** Implementar como un único token configurable.

Los badges/acentos suaves se construyen como **`color-mix(in srgb, <color> 12-14%, transparent)`** para el fondo y el color pleno para texto/punto. En Tailwind equivale a `bg-{color}-50 dark:bg-{color}-500/10 text-{color}-600 dark:text-{color}-400` o usar `/10`–`/14` opacities.

### Color — Superficies LIGHT
| Token | Hex | Equivalente Tailwind aprox. | Uso |
|---|---|---|---|
| `--bg` | `#F6F7FB` | slate-50 (un pelo más frío) | Fondo de la app (canvas detrás de las cards) |
| `--surface` | `#FFFFFF` | white | Cards, sidebar, modales, filas |
| `--surface-2` | `#F1F3F9` | slate-100 | Header de tabla, inputs, chips, hover de íconos |
| `--border` | `#E7E9F2` | slate-200 | Bordes de cards, divisores |
| `--border-strong` | `#D6DAE8` | slate-300 | Bordes en hover |
| `--text` | `#161A2B` | slate-900 (más azulado) | Texto principal |
| `--muted` | `#5A6178` | slate-500/600 | Texto secundario |
| `--faint` | `#9097AD` | slate-400 | Texto terciario, labels, placeholders |
| `--hover` | `#F4F5FB` | slate-50 | Hover de filas de tabla |

### Color — Superficies DARK (más profundidad y contraste que el slate-800 actual)
| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#080B14` | Fondo de la app (navy casi negro) |
| `--surface` | `#10141F` | Cards, modales |
| `--surface-2` | `#171C2B` | Header de tabla, inputs, chips, hover |
| `--sidebar` | `#0B0E18` | Sidebar (un escalón más oscuro que las cards) |
| `--border` | `#222839` | Bordes |
| `--border-strong` | `#363D54` | Bordes en hover |
| `--text` | `#ECEFF8` | Texto principal |
| `--muted` | `#98A0B8` | Texto secundario |
| `--faint` | `#646C86` | Texto terciario |
| `--hover` | `#171C2B` | Hover de filas |

> **Principio dark:** sistema de capas por elevación — `bg (#080B14)` < `sidebar (#0B0E18)` < `surface (#10141F)` < `surface-2 (#171C2B)`. Esto da profundidad real en lugar del `slate-800` plano actual. El sidebar es **más oscuro** que el contenido.

### Landing (dark, independiente)
- Fondo base: `#070A14`.
- Patrón de puntos sutil: `radial-gradient(circle at 1px 1px, rgba(255,255,255,.05) 1px, transparent 0)` con `background-size: 30px 30px`.
- Glow del hero: elipse `radial-gradient` con `--primary` al ~42%, `filter: blur(40px)`.
- Texto: `#E7EAF5` (principal), `#9AA3BD` / `#A7B0CC` (secundario), `#6B7494` (faint).

### Tipografía
- **UI:** `Geist` (geométrica/neogrotesca). Fallback: `system-ui, -apple-system, sans-serif`.
- **Datos / códigos / labels:** `Geist Mono` (refuerza el carácter técnico-industrial). Fallback: `monospace`.
- Importar con `@font-face` o `<link>` a Google Fonts (`Geist:wght@300;400;500;600;700` y `Geist+Mono:wght@400;500;600`).
- Antialiasing: `-webkit-font-smoothing: antialiased`.

**Escala tipográfica (fuente de verdad):**
| Nombre | Tamaño / line-height | Peso | Uso |
|---|---|---|---|
| Display | 30px / 1 · `letter-spacing:-.02em` | 700 | Números grandes de stat cards, hero secundario |
| Título de página | 17–20px / 1.1 | 600 | `h1` del topbar (17px), títulos de sección guía (20px) |
| Encabezado de sección | 15px / 1.2 | 600 | Títulos de card (Dashboard, etc.) |
| Cuerpo | 13–13.5px / 1.3–1.5 | 400 | Contenido general, celdas de tabla |
| Cuerpo fuerte | 12.5–13.5px | 500–600 | Nombres, valores destacados |
| Label mono | 10–11.5px / 1 · `letter-spacing:.04–.22em` · UPPERCASE | 500–600 | `Geist Mono`: códigos, fechas, headers de tabla, sublabels |

> Convención clave: **todo dato técnico** (códigos `MAC-2401`, `MIG-03`, NIT, fechas, %, horas, headers de tabla, sublabels de stat cards) va en **Geist Mono**. Esto es lo que da la identidad "manufactura/precisión".

### Espaciado, radios y sombras
| Token | Valor | Uso |
|---|---|---|
| Radio card | `13px` (rango: 6 marcado / 13 suave / 18 redondeado) | Cards, contenedores principales |
| Radio control | `9–10px` | Botones, inputs, chips |
| Radio badge | `7px` | Píldoras de estado/prioridad |
| Radio ícono-botón | `7–8px` | Botones de acción de íconos (28×28) |
| Padding de card | `18px` (compacto: 13px) | Interior de cards |
| Gap de grid | `16px` | Entre cards |
| Sombra (light) | `0 1px 2px rgba(20,24,45,.04), 0 10px 26px -14px rgba(20,24,45,.16)` | Cards |
| Sombra (dark) | `0 1px 2px rgba(0,0,0,.4), 0 14px 34px -16px rgba(0,0,0,.7)` | Cards |
| Sombra de modal | `0 32px 70px -20px rgba(0,0,0,.5)` | Modal |
| Sombra de botón primario | `0 6px 16px -7px <primary 70%>` | CTA primario |

### Iconografía
- **Lucide React** (no cambiar). Tamaños: 18px (nav/topbar), 16px (acciones, inputs), 15px (acciones de tabla), 13–14px (deltas, sort).
- `stroke-width: 2`, `stroke-linecap/linejoin: round`.
- Iconos usados por módulo: `LayoutDashboard`, `FolderKanban`, `CalendarClock`, `ShoppingCart`, `Wrench`, `Cog`, `Building2`, `Users`, `Shield`, `Palette`, `Globe`, `Search`, `Bell`, `Moon`/`Sun`, `ChevronDown`/`ChevronRight`, `PanelLeft`/`PanelRight`, `Plus`, `MoreHorizontal`, `Eye`, `Pencil`, `Trash`, `X`, `TrendingUp`/`TrendingDown`, `Clock`, `Play`, `CheckCircle`/`Check`, `Ban`, `Package`, `Activity`, `Filter`, `Calendar`, `Zap`, `Gauge`, `Layers`.

---

## Screens / Views

### 1. Shell — Sidebar
- **Layout:** columna fija a la izquierda, `sticky top-0 h-screen`. Ancho **248px** expandido / **74px** colapsado, transición `width .22s cubic-bezier(.4,0,.2,1)`. Fondo `--sidebar`, borde derecho `--border`. `flex-col`.
- **Cabecera (64px):** logo = cuadro 32×32 `rounded-[9px]` con degradado `linear-gradient(140deg, --primary, mix(--primary 55%, #0a0a23))`, sombra de color, letra "A" blanca 700/15px. Junto a él, wordmark **"ASTERON"** 700/16px `letter-spacing:.16em` + sublabel mono "MES · MACROMET" 9px `letter-spacing:.22em` color `--faint`. El wordmark/sublabel se ocultan al colapsar.
- **Navegación:** agrupada con **encabezados de grupo** en mono 10px uppercase `letter-spacing:.16em` color `--faint` (se ocultan al colapsar). Grupos: **Principal** (Dashboard, Proyectos, Programación, Pedidos), **Recursos** (Maquinaria, Mantenimientos, Clientes), **Equipo** (Usuarios, Roles y permisos), **Sistema** (Sistema de diseño, Landing page).
- **Ítem de nav:** `flex items-center gap-[11px]`, padding `9px 10px`, `rounded-[10px]`, texto 13.5px/500.
  - **Inactivo:** fondo transparente, texto `--muted`, ícono `--faint`. Hover: fondo `--hover`.
  - **Activo:** fondo `color-mix(--primary 11%, transparent)`, texto e ícono `--primary`, **+ barra de acento vertical** a la izquierda (3×20px, `rounded-r`, color `--primary`, posicionada `absolute left:-12px`). Hover sube a 14%.
  - **Badge opcional** (p.ej. Proyectos "24", Pedidos "18"): mono 10px, fondo `--primary 14%`, texto `--primary`, `rounded-[6px]`. Solo visible expandido y si el ítem no está activo.
- **Pie:** divisor superior + botón "Colapsar" (ícono `PanelLeft`/`PanelRight`) con mismo tratamiento de ítem inactivo.
- **Responsive:** en `<lg` el sidebar debe poder colapsar a íconos o convertirse en drawer (off-canvas) con overlay.

### 2. Shell — TopBar
- **Layout:** barra `sticky top-0 h-16`, `flex items-center gap-4`, padding `0 24px`. Fondo `color-mix(--surface 78%, transparent)` con **`backdrop-filter: saturate(160%) blur(12px)`**, borde inferior `--border`.
- **Izquierda:** `h1` título de página (17px/600, truncado) + fecha/subtítulo debajo en **mono 11.5px** color `--faint` (truncado, `white-space:nowrap`).
- **Centro-derecha (spacer flex):** **buscador** — caja 38px alto, `rounded-[10px]`, fondo `--surface-2`, borde `--border`, ícono `Search` 16px + placeholder "Buscar proyecto, máquina…" + atajo `⌘K` en una mini-tecla (mono 10px, fondo `--surface`, borde). `flex:0 1 260px`, oculta texto en pantallas pequeñas.
- **Acciones (38×38, `rounded-[10px]`, fondo `--surface-2`, borde `--border`):**
  - Toggle de tema (`Moon`/`Sun`). Hover: color e borde `--primary`.
  - Campana (`Bell`) con **punto de notificación** `--error` (7px, borde 2px del color surface) arriba a la derecha.
  - **Avatar/usuario:** botón con cuadro 30×30 degradado (iniciales "CM" blancas) + nombre "Carlos Méndez" (12.5px/600) y rol "Coord. producción" (mono 10px `--faint`) + chevron. En móvil, ocultar nombre/rol.

### 3. Dashboard
- **Fila 1 — Stat cards:** grid `repeat(4, 1fr)` gap 16px (responsive: 2×2 en `md`, 1 col en `sm`). Cada card:
  - `--surface`, borde `--border`, `rounded-[13px]`, sombra, padding 18px, `position:relative; overflow:hidden`.
  - **Barra de acento superior** de 3px (full width) con el color del tipo de stat.
  - Fila superior: **ícono en círculo** 40×40 `rounded-[11px]` con fondo `color-mix(accent 13%, transparent)` y color del acento + **pill de delta** (mono 11.5px) con flecha `TrendingUp/Down`, color verde/rojo sobre fondo tintado.
  - Número grande 30px/700 `tabular-nums`, label 13px/500 `--muted`, sublabel 11.5px `--faint`.
  - Las 4 cards: Proyectos activos (24, acento `--primary`), Pedidos pendientes (18, `--secondary`), Equipos activos (47, `--success`), Operarios en turno (31, `--warning`).
- **Fila 2 — Gráficas:** grid `1.6fr 1fr` gap 16px.
  - **Barras "Carga de producción"** (Recharts BarChart): header con título 15px/600 + sublabel mono "HORAS-MÁQUINA · ÚLTIMOS 7 DÍAS" + leyenda (Programado = `--primary`, Real = `--primary 32%`). 7 días (Lun–Dom), dos series por día: "plan" (degradado `--primary`) y "real" (`--primary 26%`), barras `rounded` ~34px máx. **Sin animación de entrada que deje las barras en altura 0** (el prototipo tenía ese bug; en Recharts usar `isAnimationActive` con cuidado o `animationBegin` corto).
  - **Donut "Proyectos por estado"** (Recharts PieChart donut): título + sublabel "TOTAL 42 ACTIVOS". Donut con segmentos En proceso (`--primary`, 18), Completado (`--success`, 14), Programado (`--secondary`, 7), En pausa (`--warning`, 3); centro con "42 / PROYECTOS". Leyenda a la derecha con punto de color + label `--muted` + valor mono.
- **Fila 3:** grid `1.4fr 1fr` gap 16px.
  - **Proyectos recientes:** card con header ("Proyectos recientes" + link "Ver todos →" en `--primary`). Filas con punto de prioridad, nombre + `code · cliente` (mono `--faint`), y mini-barra de progreso 84px + % mono. Divisores `--border`, hover `--hover`.
  - **Programación de hoy:** card con header + pill "6 TURNOS". Filas con ícono de estado en cuadro tintado, fase + operario, y estado corto en color.

### 4. Tabla (Proyectos) — patrón reutilizable para Maquinaria, etc.
- **Toolbar superior:** buscador (igual estilo que topbar, fondo `--surface`) + botón filtro ("Prioridad", con ícono `Filter`) + spacer + **botón primario "Nuevo proyecto"** (fondo `--primary`, texto blanco, ícono `Plus`, sombra de color). Todo 38px alto, `flex-wrap` en móvil.
- **Tabla:** contenedor `--surface`, borde, `rounded-[13px]`, `overflow:hidden`, sombra.
  - **Header:** grid de columnas (Proyectos: `2.4fr 1.3fr .9fr 1.4fr 1.3fr 1fr 84px`), padding `13px 18px`, **fondo `--surface-2`**, borde inferior, texto **mono 10.5px uppercase** `letter-spacing:.08em` color `--faint`. La 1ª col (ordenable) en `--muted` con chevron.
  - **Filas:** mismo grid, `align-items:center`, padding `13px 18px`, divisor superior `--border`, **hover `--hover`** (transición .12s).
  - **Celdas:**
    - Proyecto: nombre 13.5px/500 `--text` (truncado) + código mono 10.5px `--faint`.
    - Cliente: 13px/400 `--muted`.
    - **Prioridad:** badge pill — `inline-flex gap-5px`, mono/600 11px, padding `5px 9px`, `rounded-[7px]`, fondo `color-mix(color 14%, transparent)`, texto color, **+ punto** 6px del color. Alta=`--error`, Media=`--warning`, Baja=`--success`.
    - Responsable: mini-avatar 26×26 `rounded-[7px]` (iniciales, fondo `--primary 14%`) + nombre `--muted`.
    - Avance: barra flexible 6px `rounded` sobre `--surface-2` + relleno de color (verde ≥80, ámbar <35, primario intermedio) + % mono 11px a la derecha.
    - Entrega: fecha mono 12px `--muted`.
    - **Acciones:** 3 botones-ícono 28×28 `rounded-[7px]` transparentes: `Eye` (ver), `Pencil` (editar → abre modal), `Trash` (eliminar). Hover: ver/editar → fondo `--surface-2` color `--primary`; eliminar → fondo `--error 12%` color `--error`.
- **Paginación:** pie con "1–6 de 24" (mono `--faint`) + botones Anterior/números/Siguiente; el activo en `--primary` blanco, los demás `--surface` borde `--border`.
- **Maquinaria:** mismo patrón, columnas `1fr 1.3fr 1.4fr 1fr 1.4fr 84px` (Código con ícono + mono, Categoría, Marca/Ref., Ubicación, Estado-badge, Acciones con `Eye`/`Wrench`/`MoreHorizontal`). Estados ENUM con color: activa=`--success`, inactiva=`--faint`, en_mantenimiento=`--warning`, sin_asignar=`--secondary`, guardada=`--primary`, dado_de_baja=`--error`.

### 5. Programación de Planta — cards de actividad (4 estados)
- **Toolbar:** selector de fecha (chevrons + "Jue 26 jun") + **leyenda de estados** (chips con punto de color + conteo) + spacer + botón primario "Programar actividad".
- **Grid:** `repeat(auto-fill, minmax(310px, 1fr))` gap 16px.
- **Card de actividad:** `--surface`, borde, `rounded-[13px]`, sombra, `overflow:hidden`. **Franja superior de 4px** con el color del estado.
  - Cabecera: código mono `--faint` + fase 15px/600 + proyecto 12.5px `--muted` (truncado). A la derecha, **badge de estado** (pill tintada del color del estado).
  - **Estado "en proceso" (live):** el badge incluye un **punto pulsante** — punto del color + anillo expansivo (`@keyframes` ring 1.6s + pulseDot 1.6s). Es el indicador del timer en tiempo real.
  - **Estado "cancelado":** card con `opacity: .62`.
  - Bloque medio (divisor): operario (mini-avatar tintado + nombre) y máquina (ícono `Wrench` en cuadro `--surface-2` + nombre).
  - Bloque inferior (divisor): **Estim.** y **Real** en mono (labels uppercase mono 9px `--faint`, valores 13px mono; "Real" en `--success` si completado) + **botón de acción** según estado:
    - `programado` → botón **"Iniciar"** (primario, ícono `Play`).
    - `en_proceso` → botón **"Completar"** (outline éxito: borde/ texto `--success`, fondo `--success 12%`, ícono `Check`).
    - `completado` / `cancelado` → sin botón.
- **Colores de estado:** programado=`--secondary`, en_proceso=`--primary`, completado=`--success`, cancelado=`--error`.

### 6. Cards (Clientes / Usuarios)
- **Clientes:** grid `auto-fill minmax(280px,1fr)`. Card con avatar 46×46 `rounded-[12px]` tintado (iniciales) + razón social + NIT mono. Bloque inferior (divisor) con Contacto, Área y Proyectos (badge mono tintado).
- **Usuarios:** grid `auto-fill minmax(260px,1fr)`. Card centrada: avatar 58×58 `rounded-[16px]` con degradado, nombre 14.5px/600, código mono `--faint`, rol `--muted`, y badge de estado redondeado (Activo=`--success`, Inactivo=`--faint`) con punto.

### 7. Modal (base reutilizable)
- **Overlay:** `fixed inset-0`, fondo `color-mix(#070A12 62%, transparent)` + `backdrop-filter: blur(3px)`, centra el contenido, padding 24px. Animación `ovIn .18s`. Click en overlay cierra; click dentro hace `stopPropagation`.
- **Caja:** `max-w-[480px]`, `--surface`, borde, **`rounded-[18px]`**, sombra `0 32px 70px -20px rgba(0,0,0,.5)`, `overflow:hidden`. Animación `mdIn .26s cubic-bezier(.2,.9,.3,1)` (sube + escala desde .98).
- **Cabecera diferenciada:** padding `20px 22px`, borde inferior, **fondo degradado** `linear-gradient(180deg, color-mix(--primary 8%, --surface), --surface)`. Ícono 40×40 tintado + título 16px/600 + subtítulo `--muted` + botón cerrar `X` (32×32, fondo `--surface-2`).
- **Cuerpo:** padding 22px, `flex-col gap-15px`. Campos con label 11.5px/500 `--muted` + control 40px alto `rounded-[10px]` fondo `--surface-2` borde `--border`. Ejemplo de selector de **prioridad** = 3 segmentos (Alta seleccionada = borde/fondo/texto `--error`).
- **Pie:** padding `16px 22px`, borde superior, **fondo `--surface-2`**, botones a la derecha: "Cancelar" (secundario) + "Crear proyecto" (primario con sombra de color).
- **Input enfocado (en guía):** borde 2px `--primary` + cursor de texto. Equivale a `focus:ring-2 focus:ring-primary` actual, pero con primario índigo.

### 8. Landing page (dark, mejorada)
- Mantener dark theme. Fondo `#070A14` + **patrón de puntos** + **glow índigo** difuminado tras el hero.
- **Nav (74px):** logo + wordmark "ASTERON" + links (Plataforma, Módulos, Changelog) + botón primario "Entrar al sistema".
- **Hero centrado:** badge-pill superior ("v3.2 · Macromet S.A.S." con punto verde, borde sutil) → titular 56px/700 `letter-spacing:-.025em` con **segunda línea en degradado** `linear-gradient(100deg, --primary, --secondary)` (clip a texto) → párrafo `#A7B0CC` → dos CTAs ("Comenzar ahora" primario con sombra + "Ver demo" outline translúcido).
- **Preview del producto:** contenedor `rounded-[18px]` con borde translúcido y placeholder rayado de 280px — **reemplazar por captura real del dashboard**.
- **Feature cards:** grid `repeat(3,1fr)` gap 16px. Card `rounded-[15px]`, borde y fondo translúcidos (`rgba(255,255,255,.09)` / `.025`), ícono tintado, título 15.5px/600, descripción `#9AA3BD`. Hover: borde índigo + `translateY(-3px)`. Seis features: Gestión de proyectos, Programación de planta, Maquinaria y mantenimiento, Dashboard de control, Roles y permisos, Clientes y pedidos.

### 9. Sistema de diseño (vista de referencia)
Pantalla incluida en el prototipo que documenta visualmente: la **paleta** (5 roles + 6 superficies con su token y hex), la **escala tipográfica** (Display → label mono) y **componentes** (4 variantes de botón, badges de estado, input enfocado). Útil como checklist de implementación; no necesariamente una pantalla de la app real.

---

## Interactions & Behavior
- **Navegación:** clic en ítem del sidebar cambia la vista activa (resaltado con barra de acento + fondo tintado).
- **Colapsar sidebar:** alterna 248px ↔ 74px con transición de ancho; oculta labels, wordmark y headers de grupo (mantener `title` en los botones para tooltip).
- **Dark mode:** toggle en topbar; alterna toda la paleta de superficies (estrategia `class` de Tailwind: `dark:` variants sobre `<html class="dark">`). Persistir preferencia en `localStorage`.
- **Modal:** abrir desde "Nuevo proyecto" / acción editar; cerrar con overlay, botón X o "Cancelar". Animaciones de entrada `ovIn`/`mdIn`.
- **Cards de planta:** "Iniciar" arranca el timer (estado → en_proceso, badge con punto pulsante en vivo); "Completar" captura tiempo real (estado → completado, "Real" en verde, sin botón). Mantener la lógica de cronómetro actual.
- **Hover states:** filas de tabla (`--hover`), botones-ícono (fondo `--surface-2`), feature cards (elevación), ítems de nav.
- **Animaciones (keyframes):** `pulseDot` y `ring` (punto live, 1.6s loop), `ovIn` (.18s overlay), `mdIn` (.26s modal), `barRise` **NO usar** para las barras del chart (causó barras invisibles; renderizar a su altura final).
- **Responsive:** mobile-first; grids colapsan (4→2→1), sidebar a drawer en `<lg`, topbar oculta texto de búsqueda/usuario en `sm`, toolbars con `flex-wrap`.

## State Management
- `theme: 'light' | 'dark'` (persistido en `localStorage`).
- `sidebarCollapsed: boolean`.
- `activeView` (ya gestionado por el router actual; no cambiar el ruteo).
- `modalOpen` + payload del registro a crear/editar.
- Estado de cronómetro por actividad (existente) para Programación de Planta.
- Datos vía la capa de fetching actual; el rediseño es solo visual.

## Assets
- **Tipografías:** Geist + Geist Mono (Google Fonts). Añadir al proyecto.
- **Iconos:** Lucide React (ya en uso). Lista arriba.
- **Logo (APROBADO):** símbolo de **dos anillos enlazados (eslabón)** + wordmark "ASTERON" en Geist Light. Archivos en `logo/` (blanco, navy, azul, currentColor, lockups, app-icon, favicon). Guía de uso en `INSTRUCCIONES-CLAUDE-CODE.md`. Nota: este logo reemplaza cualquier monograma que aparezca en los prototipos anteriores de la app.
- **Captura de dashboard** para la landing: pendiente de generar (placeholder en el prototipo).
- **Charts:** Recharts (BarChart, PieChart donut) — ya en uso.

## Files
- `Asteron Rediseño.dc.html` — prototipo de referencia completo (todas las pantallas + dark mode + guía de estilo). Es un único archivo HTML autónomo; ábrelo en el navegador para inspeccionar medidas y estados.
- `README.md` — este documento.
- `screenshots/` — capturas de referencia del resultado esperado (light + dark):
  - `01-dashboard-light.png` — Dashboard (stat cards + gráficas) en light.
  - `02-proyectos-tabla-light.png` — Tabla de Proyectos en light.
  - `03-programacion-planta-light.png` — Cards de Programación de Planta (4 estados) en light.
  - `04-maquinaria-light.png` — Tabla de Maquinaria en light.
  - `05-sistema-diseno-light.png` — Guía de estilo (paleta + tipografía + componentes).
  - `06-modal-nuevo-proyecto-light.png` — Modal base rediseñado.
  - `07-landing-light.png` — Landing page (dark theme).
  - `08-dashboard-dark.png` — Dashboard en dark mode.
  - `09-programacion-planta-dark.png` — Programación de Planta en dark mode.
  - `10-proyectos-tabla-dark.png` — Tabla de Proyectos en dark mode.

> Las capturas son la **referencia visual del resultado esperado**. Úsalas junto al prototipo HTML para validar fidelidad de color, espaciado y estados. El prototipo es la fuente de verdad para medidas exactas.

## Tailwind config sugerido (orientativo)
```js
// tailwind.config.js (extend)
colors: {
  primary:   { DEFAULT: '#4F46E5', hover: '#4138BC' },
  secondary: '#06B6D4',
  success:   '#10B981',
  warning:   '#F59E0B',
  error:     '#F43F5E',
  // superficies vía CSS vars para light/dark:
  bg:        'var(--bg)',
  surface:   'var(--surface)',
  surface2:  'var(--surface-2)',
  sidebar:   'var(--sidebar)',
  border:    'var(--border)',
  ink:       'var(--text)',
  muted:     'var(--muted)',
  faint:     'var(--faint)',
},
fontFamily: {
  sans: ['Geist', 'system-ui', 'sans-serif'],
  mono: ['Geist Mono', 'monospace'],
},
borderRadius: { card: '13px', control: '10px', badge: '7px' },
```
Definir las CSS vars de superficie en `:root` y `.dark` con los hex de las tablas LIGHT/DARK de arriba. Así un mismo `bg-surface` responde al tema automáticamente.
