import { Link } from 'react-router-dom'
import {
  FolderKanban, ClipboardList, Wrench, CalendarDays,
  Users, Building2, BarChart2, ShieldCheck,
  Code2, Database, Layers, ArrowRight,
  CheckCircle2, GitBranch, Zap, Clock,
  TrendingUp, KeyRound, Workflow,
} from 'lucide-react'
import { Logo } from '../components/Logo'
import { HeroSection } from '../components/landing/HeroSection'

// ── Datos ──────────────────────────────────────────────────────────────
const features = [
  { icon: BarChart2,     label: 'Dashboard Analítico',    desc: 'Indicadores clave, gráficas de prioridad y maquinaria, alertas inteligentes en tiempo real.',       color: 'text-indigo-400', bg: 'bg-indigo-500/10'  },
  { icon: FolderKanban,  label: 'Gestión de Proyectos',   desc: 'Seguimiento fase a fase con porcentaje de avance, prioridades y responsables asignados.',            color: 'text-violet-400', bg: 'bg-violet-500/10'  },
  { icon: ClipboardList, label: 'Control de Pedidos',     desc: 'Administra órdenes de producción con su detalle, estado y relación directa con clientes.',           color: 'text-purple-400', bg: 'bg-purple-500/10'  },
  { icon: Building2,     label: 'Clientes',               desc: 'Base de datos de clientes con múltiples contactos, NIT y código interno por empresa.',                color: 'text-cyan-400',   bg: 'bg-cyan-500/10'    },
  { icon: Wrench,        label: 'Inventario Maquinaria',  desc: 'Registro completo de equipos por categoría, marca, serial, ubicación y estado operativo.',           color: 'text-amber-400',  bg: 'bg-amber-500/10'   },
  { icon: CalendarDays,  label: 'Programación de Planta', desc: 'Agenda diaria de operarios y máquinas por proyecto con navegación por fecha y control de estado.',   color: 'text-emerald-400',bg: 'bg-emerald-500/10' },
  { icon: Users,         label: 'Gestión de Usuarios',    desc: 'Administración del equipo con código de empleado, roles asignables y activación / desactivación.',    color: 'text-pink-400',   bg: 'bg-pink-500/10'    },
  { icon: ShieldCheck,   label: 'Seguridad RBAC',         desc: 'Cada rol accede únicamente a los módulos de su cargo. Permisos definidos a nivel de ruta y acción.',  color: 'text-teal-400',   bg: 'bg-teal-500/10'    },
]

const pillars = [
  {
    icon: Workflow,
    color: 'text-indigo-400', bg: 'bg-indigo-500/10',
    accent: 'via-indigo-500/30',
    number: '01',
    title: 'Trazabilidad de extremo a extremo',
    desc: 'Desde que un cliente hace un pedido hasta que el último operario completa su turno, cada acción queda registrada, fechada y vinculada. Sin hojas de cálculo. Sin información perdida.',
  },
  {
    icon: KeyRound,
    color: 'text-violet-400', bg: 'bg-violet-500/10',
    accent: 'via-violet-500/30',
    number: '02',
    title: 'Acceso por rol, no por persona',
    desc: 'Configura permisos granulares por módulo y acción para cada cargo. El operario ve su agenda diaria; el coordinador gestiona proyectos; la gerencia accede al panorama completo.',
  },
  {
    icon: TrendingUp,
    color: 'text-emerald-400', bg: 'bg-emerald-500/10',
    accent: 'via-emerald-500/30',
    number: '03',
    title: 'Decisiones con datos en tiempo real',
    desc: 'El dashboard consolida el estado de toda la planta al instante: proyectos críticos, equipos en mantenimiento, pedidos sin proyecto asignado y programación del día.',
  },
]

const stack = [
  { icon: Code2,       label: 'React 18 + Vite', color: 'text-cyan-400'    },
  { icon: Layers,      label: 'Tailwind CSS',     color: 'text-sky-400'     },
  { icon: Database,    label: 'Node.js + MySQL',  color: 'text-emerald-400' },
  { icon: ShieldCheck, label: 'JWT + RBAC',       color: 'text-violet-400'  },
  { icon: GitBranch,   label: 'Git + GitHub',     color: 'text-orange-400'  },
  { icon: Zap,         label: 'Express REST API', color: 'text-yellow-400'  },
]

const updates = [
  {
    version: 'v2.1',
    date: 'Junio 2026',
    tag: 'Más reciente',
    tagStyle: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    dotStyle: 'bg-emerald-500 ring-[#080B14]',
    items: [
      'Rediseño visual completo: sistema de tokens de diseño, Geist + CSS custom properties',
      'Modo oscuro / claro con persistencia automática',
      'Control de acceso RBAC granular por módulo y acción',
      'Menú contextual del usuario con cierre de sesión seguro',
      'Paginación en módulos de Clientes y Maquinaria',
      'Auto-aplicación de fases estándar al crear un proyecto',
    ],
  },
  {
    version: 'v2.0',
    date: 'Mayo 2026',
    tag: 'Estable',
    tagStyle: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
    dotStyle: 'bg-indigo-500 ring-[#080B14]',
    items: [
      'Rediseño completo del esquema de base de datos (asteron_v2)',
      'Dashboard con gráficas Recharts — prioridad y estado de maquinaria',
      'Sistema de notificaciones inteligentes en barra superior',
      'Programación de Planta con navegación por fecha y timer en vivo',
      'Historial de mantenimientos por equipo',
      'Perfil de usuario con cambio de contraseña seguro',
    ],
  },
  {
    version: 'v1.0',
    date: 'Abril 2026',
    tag: 'Inicial',
    tagStyle: 'bg-white/8 text-white/40 border border-white/10',
    dotStyle: 'bg-white/30 ring-[#080B14]',
    items: [
      'Autenticación segura con JWT + bcryptjs',
      'Módulos base: Proyectos, Pedidos, Clientes, Maquinaria',
      'Gestión de Usuarios con roles y estados',
      'Sidebar responsivo con rutas protegidas por rol',
      'Arquitectura REST API con Express + mysql2',
    ],
  },
]

// ── Componente ──────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-[#080B14] text-white scroll-smooth font-sans antialiased">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50
        bg-[#080B14]/80 backdrop-blur-md backdrop-saturate-150
        border-b border-white/[0.07]"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16
          flex items-center justify-between"
        >
          <Logo variant="dark" size="md" />

          <div className="hidden md:flex items-center gap-6
            font-mono text-[12px] text-white/40"
          >
            <a href="#plataforma"      className="hover:text-white transition-colors">Plataforma</a>
            <a href="#modulos"         className="hover:text-white transition-colors">Módulos</a>
            <a href="#actualizaciones" className="hover:text-white transition-colors">Changelog</a>
          </div>

          <Link to="/login"
            className="flex items-center gap-1.5 h-9 px-4
              bg-white text-[#080B14] hover:bg-white/90
              text-[13px] font-semibold rounded-[10px] transition-colors"
          >
            Iniciar sesión
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <HeroSection />

      {/* ── Tres pilares ── */}
      <section id="plataforma" className="max-w-7xl mx-auto px-6 lg:px-10 py-28">
        <div className="text-center mb-16">
          <span className="font-mono text-[11px] font-semibold tracking-[.14em]
            text-indigo-400 uppercase"
          >
            Plataforma
          </span>
          <h2 className="mt-3 text-[32px] lg:text-[40px] font-bold tracking-tight">
            Construido para la planta real
          </h2>
          <p className="mt-4 text-white/45 max-w-lg mx-auto text-[14px] leading-relaxed">
            Asteron no es una herramienta genérica. Cada flujo, cada campo y cada
            alerta responde a los procesos productivos de Macromet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pillars.map(({ icon: Icon, color, bg, accent, number, title, desc }) => (
            <div key={title}
              className="group relative bg-white/[0.04] border border-white/[0.08]
                rounded-[20px] p-8 overflow-hidden
                hover:bg-white/[0.07] hover:border-white/[0.15]
                hover:-translate-y-0.5
                hover:shadow-[0_24px_48px_-12px_rgba(79,70,229,.16)]
                transition-all duration-200"
            >
              {/* Top glow line */}
              <div className={`absolute top-0 left-0 right-0 h-px
                bg-gradient-to-r from-transparent ${accent} to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
              />

              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-[13px] ${bg}
                  flex items-center justify-center`}
                >
                  <Icon size={22} className={color} />
                </div>
                <span className="font-mono text-[32px] font-bold text-white/[0.06]
                  select-none leading-none"
                >
                  {number}
                </span>
              </div>

              <h3 className="text-[16px] font-semibold text-white mb-3 leading-snug">
                {title}
              </h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Módulos ── */}
      <section id="modulos"
        className="bg-white/[0.02] border-y border-white/[0.07]"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-28">
          <div className="text-center mb-16">
            <span className="font-mono text-[11px] font-semibold tracking-[.14em]
              text-indigo-400 uppercase"
            >
              Módulos
            </span>
            <h2 className="mt-3 text-[32px] lg:text-[40px] font-bold tracking-tight">
              Todo lo que necesita tu operación
            </h2>
            <p className="mt-4 text-white/45 max-w-xl mx-auto text-[14px] leading-relaxed">
              Cada módulo cubre un área concreta de la operación, con control de acceso
              granular para que cada cargo vea solo lo que le corresponde.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {features.map(({ icon: Icon, label, desc, color, bg }) => (
              <div key={label}
                className="group relative bg-white/[0.04] border border-white/[0.08]
                  rounded-[18px] p-6 overflow-hidden
                  hover:bg-white/[0.07] hover:border-white/[0.15]
                  hover:-translate-y-0.5
                  hover:shadow-[0_20px_40px_-10px_rgba(79,70,229,.14)]
                  transition-all duration-200 cursor-default"
              >
                <div className="absolute top-0 left-0 right-0 h-px
                  bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent
                  opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
                <div className={`w-10 h-10 rounded-[11px] ${bg}
                  flex items-center justify-center mb-4`}
                >
                  <Icon size={20} className={color} />
                </div>
                <h3 className="text-[13.5px] font-semibold text-white mb-2">{label}</h3>
                <p className="text-[12px] text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Changelog ── */}
      <section id="actualizaciones">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 py-28">
          <div className="text-center mb-16">
            <span className="font-mono text-[11px] font-semibold tracking-[.14em]
              text-indigo-400 uppercase"
            >
              Changelog
            </span>
            <h2 className="mt-3 text-[32px] lg:text-[40px] font-bold tracking-tight">
              Historial de versiones
            </h2>
            <p className="mt-4 text-white/45 text-[14px]">
              Mejoras continuas entregadas en cada ciclo de desarrollo de Asteron.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-[19px] top-2 bottom-2
              w-px bg-gradient-to-b from-indigo-500/40 via-white/10 to-transparent
              hidden sm:block"
            />

            <div className="space-y-10">
              {updates.map(({ version, date, tag, tagStyle, dotStyle, items }) => (
                <div key={version} className="sm:pl-14 relative">
                  <div className={`absolute left-3.5 top-2 w-3 h-3 rounded-full
                    ring-4 ${dotStyle} hidden sm:block`}
                  />
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-[18px] font-bold text-white tracking-tight">
                      {version}
                    </span>
                    <span className={`font-mono text-[11px] font-semibold
                      px-2.5 py-1 rounded-full ${tagStyle}`}
                    >
                      {tag}
                    </span>
                    <span className="flex items-center gap-1.5
                      font-mono text-[11px] text-white/30"
                    >
                      <Clock size={11} />
                      {date}
                    </span>
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.08]
                    rounded-[16px] p-5 space-y-3"
                  >
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={14}
                          className="text-indigo-400/80 mt-0.5 shrink-0" />
                        <span className="text-[13px] text-white/55 leading-relaxed">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative border-t border-white/[0.07] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2
            w-[700px] h-[400px] bg-indigo-600/[0.11] rounded-full blur-[110px]"
          />
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>
        <div className="relative max-w-2xl mx-auto px-6 py-28 text-center">
          <span className="inline-block font-mono text-[11px] font-semibold
            tracking-[.14em] text-indigo-400 uppercase
            mb-5 border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 rounded-full"
          >
            Macromet S.A.S · Colombia
          </span>
          <h2 className="text-[32px] lg:text-[44px] font-bold tracking-[-0.02em]">
            Tu operación, bajo control
          </h2>
          <p className="mt-5 text-white/45 text-[15px] max-w-md mx-auto leading-relaxed">
            Inicia sesión con tus credenciales para acceder al sistema de gestión
            de producción de Macromet.
          </p>
          <Link to="/login"
            className="inline-flex items-center gap-2 mt-9
              bg-indigo-600 hover:bg-indigo-500 text-white
              font-semibold px-9 py-4 rounded-[13px] text-[14px]
              shadow-[0_8px_32px_-6px_rgba(79,70,229,.6)]
              transition-all duration-150"
          >
            Acceder al sistema
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] bg-[#050709]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8
          flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 opacity-40">
            <div className="w-5 h-5 rounded-[5px] bg-indigo-500/30
              flex items-center justify-center"
            >
              <span className="font-bold text-[10px] text-indigo-400">A</span>
            </div>
            <span className="text-[13px] font-bold text-white tracking-tight">Asteron</span>
          </div>
          <p className="font-mono text-[11px] text-white/25 text-center">
            © {new Date().getFullYear()} Asteron · Macromet S.A.S. · Bogotá, Colombia
          </p>
          <Link to="/login"
            className="font-mono text-[11px] text-white/25 hover:text-white/60 transition-colors"
          >
            Iniciar sesión →
          </Link>
        </div>
      </footer>
    </div>
  )
}
