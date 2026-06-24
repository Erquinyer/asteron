import { Link } from 'react-router-dom'
import {
  FolderKanban, ClipboardList, Wrench, CalendarDays,
  Users, Building2, BarChart2, ShieldCheck,
  Code2, Database, Layers, ArrowRight,
  CheckCircle2, GitBranch, Zap, Clock,
} from 'lucide-react'

// ── Datos ──────────────────────────────────────────────────────────────
const stats = [
  { value: '9',    label: 'Módulos funcionales' },
  { value: '8',    label: 'Roles de acceso'     },
  { value: '13+',  label: 'Usuarios del sistema' },
  { value: '100%', label: 'Web responsiva'       },
]

const features = [
  { icon: BarChart2,    label: 'Dashboard Analítico',     desc: 'Indicadores clave, gráficas de prioridad y maquinaria, alertas inteligentes en tiempo real.',       color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { icon: FolderKanban, label: 'Gestión de Proyectos',    desc: 'Seguimiento fase a fase con porcentaje de avance, prioridades y responsables asignados.',            color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { icon: ClipboardList,label: 'Control de Pedidos',      desc: 'Administra órdenes de producción con su detalle, estado y relación directa con clientes.',           color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { icon: Building2,    label: 'Clientes',                desc: 'Base de datos de clientes con múltiples contactos, NIT y código interno por empresa.',                color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  { icon: Wrench,       label: 'Inventario Maquinaria',   desc: 'Registro completo de equipos por categoría, marca, serial, ubicación y estado operativo.',           color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
  { icon: CalendarDays, label: 'Programación de Planta',  desc: 'Agenda diaria de operarios y máquinas por proyecto con navegación por fecha y control de estado.',   color: 'text-green-400',  bg: 'bg-green-500/10'  },
  { icon: Users,        label: 'Gestión de Usuarios',     desc: 'Administración del equipo con código de empleado, roles asignables y activación/desactivación.',      color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
  { icon: ShieldCheck,  label: 'Seguridad RBAC',          desc: 'Cada rol accede únicamente a los módulos de su cargo. Permisos definidos a nivel de ruta y sidebar.', color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
]

const stack = [
  { icon: Code2,     label: 'React 18 + Vite',   color: 'text-cyan-400'   },
  { icon: Layers,    label: 'Tailwind CSS',        color: 'text-sky-400'    },
  { icon: Database,  label: 'Node.js + MySQL',     color: 'text-green-400'  },
  { icon: ShieldCheck,label:'JWT + RBAC',          color: 'text-purple-400' },
  { icon: GitBranch, label: 'Git + GitHub',        color: 'text-orange-400' },
  { icon: Zap,       label: 'Express REST API',    color: 'text-yellow-400' },
]

const updates = [
  {
    version: 'v2.1',
    date: 'Junio 2026',
    tag: 'Más reciente',
    tagColor: 'bg-green-500/15 text-green-400 border border-green-500/30',
    items: [
      'Modo oscuro / claro con persistencia en localStorage',
      'Control de acceso RBAC por roles en frontend y backend',
      'Menú desplegable del usuario con cierre de sesión',
      'Paginación en módulos de Usuarios, Clientes y Maquinaria',
      'Código de empleado (EMP-XXX) visible en tarjetas de usuario',
      'Auto-aplicación de fases estándar al crear un nuevo proyecto',
      'Landing page informativa del sistema',
    ],
  },
  {
    version: 'v2.0',
    date: 'Mayo 2026',
    tag: 'Estable',
    tagColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    items: [
      'Rediseño completo del esquema de base de datos (asteron_v2)',
      'Dashboard con gráficas Recharts (prioridad y estado maquinaria)',
      'Sistema de notificaciones inteligentes en TopBar',
      'Programación de Planta con navegación por fecha',
      'Historial de mantenimientos por máquina',
      'Perfil de usuario con cambio de contraseña',
    ],
  },
  {
    version: 'v1.0',
    date: 'Abril 2026',
    tag: 'Inicial',
    tagColor: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
    items: [
      'Autenticación segura con JWT + bcryptjs',
      'Módulos base: Proyectos, Pedidos, Clientes, Maquinaria',
      'Gestión de Usuarios con roles y estados',
      'Sidebar responsivo con rutas protegidas',
      'Arquitectura REST API con Express + mysql2',
    ],
  },
]

const team = [
  {
    name: 'Gabriel Alejandro Leal',
    role: 'Fullstack & Arquitectura',
    desc: 'Diseño del sistema, base de datos, API REST y estructura del proyecto.',
    initials: 'GL',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    name: 'Nixon Hernán Alejo',
    role: 'Frontend & UI/UX',
    desc: 'Diseño de interfaces, componentes React y experiencia de usuario.',
    initials: 'NA',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    name: 'David Esteban Alejo',
    role: 'Backend & Integración',
    desc: 'Controladores, rutas, integración de módulos y scripts de base de datos.',
    initials: 'DA',
    gradient: 'from-emerald-500 to-teal-600',
  },
]

// ── Componente ──────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white scroll-smooth">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <img src="/logo.svg" alt="Asteron" className="h-9 w-auto brightness-200" />

          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#modulos"       className="hover:text-white transition-colors">Módulos</a>
            <a href="#actualizaciones" className="hover:text-white transition-colors">Actualizaciones</a>
            <a href="#equipo"        className="hover:text-white transition-colors">Equipo</a>
          </div>

          <Link
            to="/login"
            className="flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            Iniciar sesión
            <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Glow de fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-400 uppercase mb-6 border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 rounded-full">
            <Zap size={12} />
            Sistema de gestión de producción · Macromet S.A.S
          </span>

          <h1 className="text-5xl lg:text-7xl font-bold leading-tight tracking-tight max-w-4xl mx-auto">
            Gestión de planta{' '}
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              inteligente
            </span>
          </h1>

          <p className="mt-6 text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            Asteron centraliza proyectos, pedidos, maquinaria y programación de planta
            en una sola plataforma diseñada para fabricantes de displays POP en Colombia.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/25"
            >
              Acceder al sistema
              <ArrowRight size={16} />
            </Link>
            <a
              href="#modulos"
              className="flex items-center gap-2 border border-white/15 hover:border-white/30 text-slate-300 hover:text-white font-medium px-7 py-3.5 rounded-xl text-sm transition"
            >
              Ver módulos
            </a>
          </div>

          {/* Stack badges */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            {stack.map(({ icon: Icon, label, color }) => (
              <span
                key={label}
                className="flex items-center gap-2 bg-white/5 border border-white/10 text-xs text-slate-300 px-3 py-1.5 rounded-full"
              >
                <Icon size={13} className={color} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/8 bg-white/3">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                {value}
              </p>
              <p className="mt-1 text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Módulos ── */}
      <section id="modulos" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Funcionalidades</span>
          <h2 className="mt-3 text-3xl lg:text-4xl font-bold">Todo lo que necesita tu operación</h2>
          <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            Cada módulo fue diseñado con los procesos reales de Macromet, con RBAC para que
            cada cargo acceda solo a lo que le corresponde.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, label, desc, color, bg }) => (
            <div
              key={label}
              className="group bg-white/4 border border-white/8 rounded-2xl p-6 hover:bg-white/7 hover:border-white/15 transition-all duration-200"
            >
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                <Icon size={22} className={color} />
              </div>
              <h3 className="text-sm font-semibold text-white mb-2">{label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Actualizaciones ── */}
      <section id="actualizaciones" className="bg-white/2 border-y border-white/8">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 py-24">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Changelog</span>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold">Actualizaciones del sistema</h2>
            <p className="mt-4 text-slate-400 text-sm">
              Historial de versiones con las mejoras aplicadas en cada sprint de desarrollo.
            </p>
          </div>

          <div className="relative">
            {/* Línea vertical */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-white/10 hidden sm:block" />

            <div className="space-y-10">
              {updates.map(({ version, date, tag, tagColor, items }) => (
                <div key={version} className="sm:pl-14 relative">
                  {/* Dot */}
                  <div className="absolute left-3.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-950 hidden sm:block" />

                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-lg font-bold text-white">{version}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tagColor}`}>
                      {tag}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={11} />
                      {date}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="bg-white/4 border border-white/8 rounded-2xl p-5 space-y-2.5">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 size={14} className="text-blue-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-300 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Equipo ── */}
      <section id="equipo" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-blue-400 uppercase">Equipo</span>
          <h2 className="mt-3 text-3xl lg:text-4xl font-bold">Aprendices SENA</h2>
          <p className="mt-4 text-slate-400 text-sm max-w-md mx-auto">
            Proyecto de grado desarrollado por el equipo de Análisis y Desarrollo de Software
            del SENA para Macromet S.A.S.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {team.map(({ name, role, desc, initials, gradient }) => (
            <div
              key={name}
              className="bg-white/4 border border-white/8 rounded-2xl p-7 text-center hover:bg-white/7 hover:border-white/15 transition-all duration-200"
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-4 text-white text-xl font-bold shadow-lg`}>
                {initials}
              </div>
              <h3 className="font-semibold text-white text-sm">{name}</h3>
              <p className="text-xs text-blue-400 font-medium mt-1">{role}</p>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="border-t border-white/8 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold">¿Listo para gestionar tu planta?</h2>
          <p className="mt-4 text-slate-400 text-sm">
            Inicia sesión con las credenciales asignadas por el administrador del sistema.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-sm transition shadow-lg shadow-blue-600/20"
          >
            Acceder al sistema
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo.svg" alt="Asteron" className="h-7 w-auto brightness-150 opacity-60" />
          <p className="text-xs text-slate-600 text-center">
            © {new Date().getFullYear()} Asteron · Desarrollado por aprendices SENA · Macromet S.A.S.
          </p>
          <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Iniciar sesión →
          </Link>
        </div>
      </footer>

    </div>
  )
}
