# Instrucciones para Claude Code — Logo + Landing de Asteron

Este documento te dice **exactamente qué pedirle a Claude Code** y cómo implementar dos entregables ya aprobados por el cliente:

1. **Logo nuevo de Asteron** (símbolo de eslabón + wordmark).
2. **Nuevo hero del landing** con animación interactiva que reacciona al cursor.

Stack destino: **React 18 + Vite + Tailwind CSS + Lucide React**. No cambies librerías.

---

## ⭐ PROMPT LISTO PARA PEGAR EN CLAUDE CODE

> Tengo un paquete de diseño en `design_handoff_asteron/`. Léelo completo: `README.md`, este `INSTRUCCIONES-CLAUDE-CODE.md`, los SVG en `logo/`, el prototipo `Asteron Landing Hero.dc.html` y las imágenes en `screenshots/`.
>
> Quiero que hagas **dos cosas** en mi codebase (React 18 + Vite + Tailwind + Lucide), de forma incremental y mostrándome el diff de cada paso:
>
> **1) Reemplazar el logo de Asteron** por el nuevo (símbolo de dos anillos enlazados + wordmark “ASTERON”). Usa los SVG de `logo/`. Crea un componente `<Logo/>` reutilizable y colócalo en el sidebar, el topbar, la pantalla de login y el landing. Añade el favicon y el app-icon.
>
> **2) Rehacer el hero del landing** para que se vea y se comporte como `Asteron Landing Hero.dc.html`: fondo de partículas/nodos conectados en canvas que **reaccionan al cursor** (se atraen, crecen y se conectan iluminándose), parallax 3D de la tarjeta, halo que sigue al mouse y texto con shimmer. Reprodúcelo como componente React con `useRef`/`useEffect` y `requestAnimationFrame`. El HTML del prototipo es **referencia**, no lo copies literal: intégralo a mis componentes y a Tailwind.
>
> Empieza por el logo (paso 1) y muéstramelo antes de seguir con el hero.

---

## Parte 1 — LOGO

### Concepto
Símbolo de **dos anillos entrelazados (eslabón / cadena)** = conexión y continuidad de la producción. Junto a él, el wordmark **“ASTERON”** en tipografía fina (Geist Light) con tracking amplio. Inspiración: estilo TOTVS (limpio, técnico, azul).

### Archivos entregados (`logo/`)
| Archivo | Uso |
|---|---|
| `asteron-mark-white.svg` | Símbolo blanco — para fondos oscuros (sidebar, hero, login) |
| `asteron-mark-navy.svg` | Símbolo navy `#0F2438` — para fondos claros (docs, facturas) |
| `asteron-mark-blue.svg` | Símbolo azul `#10AEE0` — acento sobre oscuro |
| `asteron-mark-currentcolor.svg` | Símbolo que hereda `color` del contenedor (recomendado para React) |
| `asteron-lockup-dark.svg` | Símbolo + “ASTERON” en blanco (lockup horizontal) |
| `asteron-lockup-light.svg` | Símbolo + “ASTERON” en navy |
| `asteron-app-icon.svg` | Ícono de app: teja redondeada con degradado + símbolo blanco |
| `asteron-favicon.svg` | Favicon (fondo navy + símbolo azul) |

> **Nota sobre los lockup SVG:** el wordmark va como `<text>` en Geist. Como en tu app Geist ya está cargada, se ve bien; pero para máxima fidelidad en el producto, **arma el lockup en HTML** (símbolo SVG + texto en un `<span>`), no uses el SVG de texto. Ver componente abajo.

### Colores del logo (alinéalos a tus tokens)
- **Navy base:** `#0F2438` (texto del logo en claro / superficie premium)
- **Azul acento:** `#10AEE0` (cian TOTVS-like)
- **Blanco hueso:** `#F4F6FB`

> Sugerencia de armonía con la app: usa **navy `#0F2438` como color de marca** y **`#10AEE0` como acento**. Si tu UI actual usa `blue-600`, considera migrar el acento hacia este cian para que todo case con el logo y el landing. (Opcional; coordínalo con el cliente.)

### Componente React sugerido
Crea `src/components/Logo.jsx`. Importa el símbolo `currentColor` como componente SVG (con SVGR de Vite) o inline, y compón el wordmark en HTML para controlar la tipografía:

```jsx
// El símbolo es 120x70; hereda el color vía `currentColor`.
import MarkUrl from '@/assets/logo/asteron-mark-currentcolor.svg'; // o inline el SVG

export function Logo({ variant = 'dark', showWord = true, className = '', markClass = '' }) {
  // variant: 'dark' (sobre fondo oscuro) | 'light' (sobre fondo claro)
  const color = variant === 'light' ? 'text-[#0F2438]' : 'text-[#F4F6FB]';
  return (
    <span className={`inline-flex items-center gap-3 ${color} ${className}`}>
      <img src={MarkUrl} alt="" className={`h-6 w-auto ${markClass}`} /> {/* hereda color si inlineas el SVG */}
      {showWord && (
        <span className="font-light text-lg tracking-[0.22em] [text-indent:0.22em] leading-none">
          ASTERON
        </span>
      )}
    </span>
  );
}
```

> Para que el símbolo herede el color con `currentColor`, **inline** el contenido de `asteron-mark-currentcolor.svg` como componente (SVGR `?react` en Vite: `import Mark from '.../asteron-mark-currentcolor.svg?react'`) y renderiza `<Mark className="h-6 w-auto" />`. El `stroke="currentColor"` tomará el color del texto.

### Dónde colocarlo
- **Sidebar (cabecera):** `<Logo variant="dark" />` (colapsa a solo símbolo cuando el sidebar está colapsado → `showWord={false}`).
- **TopBar:** normalmente no lleva logo (lo lleva el sidebar); si tu layout lo requiere, símbolo pequeño.
- **Login:** símbolo grande centrado + wordmark debajo (apilado). Puedes animar su entrada (fade/scale) al montar.
- **Landing (nav):** `<Logo variant="dark" />` arriba a la izquierda.
- **Favicon:** reemplaza `public/favicon.svg` por `asteron-favicon.svg` y referencia en `index.html`.
- **App icon / PWA:** usa `asteron-app-icon.svg`.

### Reemplazos a buscar en el codebase
Busca el logo/monograma actual (probablemente un texto “Asteron” o un `<svg>`/`<img>` en el componente de sidebar y en la landing) y sustitúyelo por `<Logo/>`. Revisa: `Sidebar`, `TopBar`, `Login`, `LandingPage`, `index.html` (favicon), manifest PWA.

---

## Parte 2 — HERO DEL LANDING (animación interactiva)

### Qué es
El hero (mitad superior de la landing) con:
- **Fondo de red de nodos en `<canvas>`**: ~60 partículas flotando lentamente. Al acercar el cursor, los nodos dentro de un radio se **atraen** hacia él, **crecen**, se **calientan** (más brillo) y las **líneas que los conectan se iluminan** en azul.
- **Halo radial** bajo el cursor.
- **Parallax 3D**: la tarjeta “Control de producción” se inclina (`rotateX/rotateY`) según la posición del mouse; un chip flotante (“Corte láser · en vivo”) se desplaza con profundidad; el glow de fondo sigue al cursor.
- **Copy** a la izquierda: badge, titular grande con la palabra “producción” en **degradado shimmer**, párrafo, 2 botones y 3 métricas.
- **Tarjeta** a la derecha con barras tipo Gantt “en vivo” + 3 mini-stats (En proceso / Completado / A tiempo).

Ver `screenshots/12-landing-hero.png` (reposo) y `screenshots/13-landing-hero-cursor.png` (con cursor: nodos conectados iluminados).

### Referencia de implementación
El archivo `Asteron Landing Hero.dc.html` contiene **todo el código** (markup + la clase con el motor de canvas). Ábrelo y extrae la lógica; adáptala a un componente React. Puntos clave del algoritmo (en el `<script>` del archivo):

- `_seed()`: crea N nodos (`N=62` en desktop, `34` en móvil) con posición y velocidad aleatorias pequeñas (`±0.18 px/frame`) y radio `1–2.6`.
- `_loop()` (rAF): por cada frame:
  - mueve nodos y rebota en los bordes;
  - si el cursor está activo, para nodos con distancia `< R=150px`: calcula `f = 1 - d/R`, sube su “calor” (`hot`) y los **desplaza hacia el cursor** `~14·f px`;
  - `hot` decae `×0.92` por frame;
  - **líneas**: entre pares con distancia `< 125px`, `alpha = (1-d/125)·(0.10 + heat·0.55)`, color RGB que va de azul tenue a brillante según `heat`;
  - **nodos**: radio y brillo escalan con `heat` (+ halo suave si `heat>0.05`);
  - **halo del cursor**: gradiente radial `rgba(28,140,232,.10)` → transparente en `R`.
- Parallax: en `mousemove`, `nx = x/w-0.5`, `ny = y/h-0.5`; tarjeta `rotateY(-nx·7deg) rotateX(ny·7deg)`; chip `translate(nx·22, ny·18)`; glow `translate(nx·60, ny·50)`.
- **DPR**: dimensiona el canvas a `rect * devicePixelRatio` (cap 2) y `ctx.setTransform(dpr,…)`. Re-dimensiona en `resize`.
- **Limpieza**: `cancelAnimationFrame` y quita listeners en `unmount`.

### Esqueleto React
```jsx
function HeroBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const cv = canvasRef.current, ctx = cv.getContext('2d');
    let raf, pts = [], mouse = { x: -9999, y: -9999, active: false };
    const dpr = Math.min(devicePixelRatio || 1, 2);
    function size() { const r = cv.getBoundingClientRect(); cv.width = r.width*dpr; cv.height = r.height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); seed(r.width, r.height); }
    // seed(), loop() … (portar de Asteron Landing Hero.dc.html)
    const onMove = e => { const r = cv.getBoundingClientRect(); mouse = { x: e.clientX-r.left, y: e.clientY-r.top, active: true }; /* + parallax */ };
    const onLeave = () => { mouse.active = false; };
    const root = cv.parentElement;
    root.addEventListener('mousemove', onMove); root.addEventListener('mouseleave', onLeave);
    addEventListener('resize', size); size(); loop();
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); root.removeEventListener('mousemove', onMove); root.removeEventListener('mouseleave', onLeave); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
```

### Paleta del hero (alíneala a tus tokens)
- Fondo: `radial-gradient(120% 130% at 72% -10%, #132244, #0A1123 44%, #070C18)`.
- Azul partículas/acento: `#1C8CE8` / `#59B6F5`; verde “live”: `#33D6A0`.
- Grid de puntos: `radial-gradient(circle at 1px 1px, rgba(255,255,255,.045) 1px, transparent 0)` `32px`.
- Tipografía: Geist (titular `600`, `-0.03em`); métricas y labels en Geist Mono.

### Accesibilidad / rendimiento
- **`prefers-reduced-motion`**: si está activo, no corras el rAF (deja el hero estático). Impleméntalo.
- **Móvil (sin cursor)**: el efecto de puntero no aplica; deja las animaciones automáticas (flotación, shimmer, glow). Opcional: reacciona al scroll o al deviceorientation.
- Limita a `dpr ≤ 2` y baja N en pantallas pequeñas (ya contemplado).

---

## Orden sugerido de trabajo
1. **Logo**: crear `<Logo/>`, colocarlo en sidebar/topbar/login/landing, favicon + app-icon. Revisar con el cliente.
2. **Hero**: portar el canvas interactivo + parallax + copy/tarjeta. Revisar.
3. (Opcional, ya especificado en `README.md`) el resto del rediseño de la app.

## Checklist de aceptación
- [ ] El logo aparece correcto en claro y oscuro, y colapsa a solo símbolo en el sidebar colapsado.
- [ ] Favicon y app-icon actualizados.
- [ ] En el landing, al mover el cursor los nodos se atraen y las líneas se iluminan; la tarjeta hace parallax.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Todo con clases Tailwind y componentes existentes; sin romper estructura ni funcionalidad.
