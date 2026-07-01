import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'

// ── Datos estáticos ─────────────────────────────────────────────────────────
const GANTT_ROWS = [
  { init: 'BA', name: 'Bavaria',   start: 4,  len: 62, pct: '78%', color: 'linear-gradient(90deg,#1478D0,#59B6F5)', glow: 'rgba(40,160,240,.6)'  },
  { init: 'NU', name: 'Nutresa',   start: 10, len: 80, pct: '92%', color: 'linear-gradient(90deg,#1EA97C,#33D6A0)', glow: 'rgba(51,214,160,.5)'  },
  { init: 'PO', name: 'Postobón',  start: 18, len: 40, pct: '45%', color: 'linear-gradient(90deg,#0E9DBE,#22D3EE)', glow: 'rgba(34,211,238,.5)'  },
  { init: 'EX', name: 'Éxito',     start: 8,  len: 55, pct: '64%', color: 'linear-gradient(90deg,#D08A1A,#F5B342)', glow: 'rgba(245,166,66,.45)' },
  { init: 'CL', name: 'Claro',     start: 22, len: 34, pct: '30%', color: 'linear-gradient(90deg,#1478D0,#59B6F5)', glow: 'rgba(40,160,240,.5)'  },
]

const MINI_STATS = [
  { label: 'EN PROCESO', value: '18',  color: '#59B6F5' },
  { label: 'COMPLETADO', value: '14',  color: '#33D6A0' },
  { label: 'A TIEMPO',   value: '96%', color: '#F5F8FF' },
]

const METRICS = [
  { value: '42',  sub: 'PROYECTOS\nEN CONTROL' },
  { value: '76%', sub: 'EQUIPOS\nACTIVOS'      },
  { value: '6',   sub: 'TURNOS\nHOY'           },
]

// ── Motor canvas ──────────────────────────────────────────────────────────────
function useParticleCanvas({ canvasRef, glowRef, tiltRef, chipRef }) {
  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let raf = null
    let ctx = null
    let W = 0, H = 0, pts = []
    const mouse = { x: -9999, y: -9999, active: false }

    // ── Sembrar partículas ───────────────────────────────────────────────
    function seed(w, h) {
      W = w; H = h
      const n = w < 700 ? 34 : 62
      pts = Array.from({ length: n }, () => ({
        x:  Math.random() * w,
        y:  Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r:  Math.random() * 1.6 + 1,
        hot: 0,
        dx: 0, dy: 0,
      }))
    }

    // ── Redimensionar canvas ─────────────────────────────────────────────
    function resize() {
      const rect = cv.getBoundingClientRect()
      const w = rect.width  || window.innerWidth
      const h = rect.height || window.innerHeight

      cv.width  = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx = cv.getContext('2d')
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed(w, h)
    }

    // ── Parallax ─────────────────────────────────────────────────────────
    function parallax(nx, ny) {
      if (tiltRef.current)
        tiltRef.current.style.transform =
          `perspective(900px) rotateY(${(-nx * 14).toFixed(2)}deg) rotateX(${(ny * 14).toFixed(2)}deg)`
      if (chipRef.current)
        chipRef.current.style.transform =
          `translate(${(nx * 34).toFixed(1)}px, ${(ny * 26).toFixed(1)}px)`
      if (glowRef.current)
        glowRef.current.style.transform =
          `translate(calc(-50% + ${(nx * 90).toFixed(0)}px), calc(-50% + ${(ny * 70).toFixed(0)}px))`
    }
    function resetParallax() {
      if (tiltRef.current) tiltRef.current.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)'
      if (chipRef.current) chipRef.current.style.transform  = 'translate(0px, 0px)'
      if (glowRef.current) glowRef.current.style.transform  = 'translate(-50%, -50%)'
    }

    // ── Frame loop ────────────────────────────────────────────────────────
    function loop() {
      raf = requestAnimationFrame(loop)
      if (!ctx || !W || !H) return
      ctx.clearRect(0, 0, W, H)

      const { x: mx, y: my, active } = mouse
      const R = 190, R2 = R * R
      const TAU = Math.PI * 2

      // — mover nodos y calcular calor —
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1

        let dispx = 0, dispy = 0
        if (active) {
          const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1
            const f = 1 - d / R
            p.hot = Math.max(p.hot, f)
            dispx = -(dx / d) * f * 14
            dispy = -(dy / d) * f * 14
          }
        }
        p.hot *= 0.92
        p.dx = p.x + dispx
        p.dy = p.y + dispy
      }

      // — líneas entre nodos cercanos —
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j]
          const dx = a.dx - b.dx, dy = a.dy - b.dy
          const d2 = dx * dx + dy * dy
          if (d2 > 125 * 125) continue
          const d = Math.sqrt(d2)
          const heat = Math.max(a.hot, b.hot)
          const alpha = (1 - d / 125) * (0.10 + heat * 0.55)
          ctx.strokeStyle =
            `rgba(${~~(90 + heat * 90)},${~~(160 + heat * 40)},${~~(232 + heat * 20)},${alpha.toFixed(3)})`
          ctx.lineWidth = 0.6 + heat * 1.1
          ctx.beginPath()
          ctx.moveTo(a.dx, a.dy)
          ctx.lineTo(b.dx, b.dy)
          ctx.stroke()
        }
      }

      // — nodos —
      for (const p of pts) {
        const { hot: heat, dx, dy, r } = p
        const rr = r * (1 + heat * 1.6)
        if (heat > 0.05) {
          ctx.beginPath()
          ctx.arc(dx, dy, rr + 5 * heat, 0, TAU)
          ctx.fillStyle = `rgba(40,160,240,${(heat * 0.18).toFixed(3)})`
          ctx.fill()
        }
        ctx.beginPath()
        ctx.arc(dx, dy, rr, 0, TAU)
        ctx.fillStyle =
          `rgba(${~~(120 + heat * 120)},${~~(180 + heat * 60)},240,${(0.5 + heat * 0.5).toFixed(3)})`
        ctx.fill()
      }

      // — halo bajo el cursor —
      if (active) {
        const g = ctx.createRadialGradient(mx, my, 0, mx, my, R)
        g.addColorStop(0,   'rgba(28,140,232,0.28)')
        g.addColorStop(0.4, 'rgba(28,140,232,0.10)')
        g.addColorStop(1,   'rgba(28,140,232,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(mx, my, R, 0, TAU)
        ctx.fill()
      }
    }

    // ── Listeners ─────────────────────────────────────────────────────────
    // Usamos window para capturar mousemove sin importar qué hijo tenga el foco
    function onMove(e) {
      const rect = cv.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Si el cursor salió de la sección, desactivamos
      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        if (mouse.active) {
          mouse.active = false
          mouse.x = -9999
          mouse.y = -9999
          resetParallax()
        }
        return
      }

      mouse.x = x
      mouse.y = y
      mouse.active = true
      parallax(x / (rect.width || 1) - 0.5, y / (rect.height || 1) - 0.5)
    }

    function onLeave() {
      mouse.active = false
      mouse.x = -9999; mouse.y = -9999
      resetParallax()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', resize)

    // Guardar el ID del defer para poder cancelarlo en cleanup (React StrictMode
    // desmonta y remonta en desarrollo — sin esto dos loops compiten en el canvas)
    raf = requestAnimationFrame(() => {
      resize()
      loop()
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', resize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// ── Componente ────────────────────────────────────────────────────────────────
export function HeroSection() {
  const canvasRef = useRef(null)
  const glowRef   = useRef(null)
  const tiltRef   = useRef(null)
  const chipRef   = useRef(null)

  useParticleCanvas({ canvasRef, glowRef, tiltRef, chipRef })

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: 'radial-gradient(120% 130% at 72% -10%, #132244 0%, #0A1123 44%, #070C18 100%)' }}
    >
      {/* Canvas de partículas — z-index mayor que el fondo pero menor que el contenido */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          display: 'block',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Dot grid */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          zIndex: 1,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,.045) 1px, transparent 0)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Glow ambiental */}
      <div
        ref={glowRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '34%', left: '66%',
          width: 520, height: 520,
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(28,140,232,.5), rgba(28,140,232,0) 66%)',
          filter: 'blur(34px)',
          zIndex: 1,
          animation: 'glowP 6s ease-in-out infinite',
          transition: 'transform .45s cubic-bezier(.2,.8,.2,1)',
          pointerEvents: 'none',
        }}
      />

      {/* Contenido del hero — z-index encima del canvas */}
      <div
        className="relative max-w-[1160px] mx-auto px-8 pt-20 pb-10"
        style={{ zIndex: 5 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-10 items-center">

          {/* ── Izquierda: copy ── */}
          <div className="min-w-0">
            {/* Badge */}
            <span
              className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[.14em] uppercase text-[#A9D6F5] px-3.5 py-2 rounded-full"
              style={{ border: '1px solid rgba(120,180,240,.24)', background: 'rgba(30,120,210,.1)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: '#33D6A0', boxShadow: '0 0 10px #33D6A0' }} />
              MES · Macromet S.A.S.
            </span>

            {/* Titular */}
            <h1
              className="mt-6 font-semibold leading-[1.04] tracking-[-0.03em] text-[#F5F8FF]"
              style={{ fontSize: 'clamp(38px, 5vw, 58px)' }}
            >
              Control total de tu<br />
              <span className="hero-shimmer">producción</span>
            </h1>

            {/* Párrafo */}
            <p className="mt-6 text-[17px] leading-[1.62] text-[#A9B4CD] max-w-[470px]">
              Proyectos, planta, maquinaria y equipos conectados en una sola plataforma.
              Mueve el cursor: cada nodo es una parte de tu operación bajo control.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                to="/login"
                className="h-12 px-6 rounded-[12px] inline-flex items-center gap-2 text-white font-semibold text-[15px]"
                style={{
                  border: '1px solid #1C8CE8',
                  background: 'linear-gradient(180deg,#26A0F0,#1478D0)',
                  boxShadow: '0 14px 32px -12px rgba(28,140,232,.85)',
                }}
              >
                Comenzar ahora
                <ArrowRight size={15} />
              </Link>
              <a
                href="#plataforma"
                className="h-12 px-6 rounded-[12px] inline-flex items-center text-[#EAF0FB] font-semibold text-[15px]"
                style={{ border: '1px solid rgba(150,180,220,.22)', background: 'rgba(255,255,255,.04)' }}
              >
                Ver plataforma
              </a>
            </div>

            {/* Métricas */}
            <div className="flex gap-8 mt-11">
              {METRICS.map((m, i) => (
                <div key={m.value} className="flex items-stretch gap-8">
                  <div>
                    <div className="text-[26px] font-semibold text-[#F5F8FF] tabular-nums">{m.value}</div>
                    <div className="font-mono text-[11px] text-[#7C88A4] mt-1.5 leading-snug whitespace-pre-line">
                      {m.sub}
                    </div>
                  </div>
                  {i < METRICS.length - 1 && (
                    <div className="w-px self-stretch" style={{ background: 'rgba(150,180,220,.14)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Derecha: tarjeta con parallax ── */}
          <div
            ref={tiltRef}
            className="relative hidden lg:block"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform .25s cubic-bezier(.2,.8,.2,1)',
              willChange: 'transform',
            }}
          >
            <div style={{ animation: 'floaty 7s ease-in-out infinite' }}>
              <div
                className="rounded-[20px] p-[22px]"
                style={{
                  background: 'linear-gradient(165deg,rgba(20,32,58,.9),rgba(12,20,40,.82))',
                  border: '1px solid rgba(120,160,220,.18)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 40px 90px -34px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.08)',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-[18px]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F04D6A]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F5A623]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#33D6A0]" />
                  <span className="font-mono text-[10px] text-[#7C88A4] ml-2 tracking-[.04em]">
                    CONTROL DE PRODUCCIÓN · HOY
                  </span>
                  <div className="flex-1" />
                  <span className="font-mono text-[10px] text-[#33D6A0]">● LIVE</span>
                </div>

                {/* Gantt rows */}
                {GANTT_ROWS.map(r => (
                  <div key={r.init} className="flex items-center gap-3 mb-3">
                    <span
                      className="w-[22px] h-[22px] rounded-[6px] shrink-0 flex items-center justify-center font-semibold text-[9px] text-[#59B6F5]"
                      style={{ background: 'rgba(28,140,232,.14)' }}
                    >
                      {r.init}
                    </span>
                    <span className="w-[72px] font-medium text-[11.5px] text-[#B7C2DA] shrink-0 truncate">
                      {r.name}
                    </span>
                    <div className="flex-1 h-[15px] rounded-[5px] relative overflow-hidden"
                      style={{ background: 'rgba(8,14,28,.7)' }}>
                      <div
                        className="absolute top-0 bottom-0 rounded-[5px]"
                        style={{
                          left: `${r.start}%`, width: `${r.len}%`,
                          background: r.color,
                          boxShadow: `0 0 14px -2px ${r.glow}`,
                        }}
                      />
                    </div>
                    <span className="w-8 font-mono font-semibold text-[10.5px] text-[#D6DEEF] text-right shrink-0">
                      {r.pct}
                    </span>
                  </div>
                ))}

                {/* Mini-stats */}
                <div className="flex gap-3 mt-[18px] pt-4"
                  style={{ borderTop: '1px solid rgba(120,160,220,.12)' }}>
                  {MINI_STATS.map(s => (
                    <div
                      key={s.label}
                      className="flex-1 rounded-[12px] px-[15px] py-[13px]"
                      style={{ background: 'rgba(8,14,28,.5)', border: '1px solid rgba(120,160,220,.1)' }}
                    >
                      <div className="font-mono text-[9px] text-[#7C88A4] tracking-[.06em]">{s.label}</div>
                      <div className="text-[22px] font-semibold tabular-nums mt-2" style={{ color: s.color }}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chip flotante */}
            <div
              ref={chipRef}
              className="absolute top-[-20px] left-[-26px] rounded-[12px] px-[14px] py-[11px] flex items-center gap-2.5"
              style={{
                background: 'rgba(16,26,48,.92)',
                border: '1px solid rgba(120,160,220,.2)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 20px 40px -18px rgba(0,0,0,.8)',
                transition: 'transform .35s cubic-bezier(.2,.8,.2,1)',
              }}
            >
              <span
                className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: 'rgba(51,214,160,.16)' }}
              >
                <Zap size={16} className="text-[#33D6A0]" />
              </span>
              <div>
                <div className="text-[11.5px] font-semibold text-[#EAF0FB]">Corte láser</div>
                <div className="font-mono text-[9.5px] text-[#7C88A4] mt-1">LC-04 · en vivo</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-6" />
      </div>
    </section>
  )
}

export default HeroSection
