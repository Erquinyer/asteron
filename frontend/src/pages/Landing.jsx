import { Link } from 'react-router-dom'
import {
  FolderKanban, ClipboardList, Wrench, CalendarDays,
  Users, Building2, BarChart2, ShieldCheck,
} from 'lucide-react'

const features = [
  { icon: FolderKanban,  label: 'Gestión de Proyectos',  desc: 'Seguimiento fase a fase con prioridades y avance en tiempo real.' },
  { icon: ClipboardList, label: 'Control de Pedidos',     desc: 'Administra órdenes de producción y su relación con clientes.' },
  { icon: Building2,     label: 'Clientes',               desc: 'Base de datos de clientes con historial de pedidos.' },
  { icon: Wrench,        label: 'Inventario de Maquinaria', desc: 'Inventario completo con estado, mantenimientos y categorías.' },
  { icon: CalendarDays,  label: 'Programación de Planta', desc: 'Agenda diaria de operarios y máquinas por proyecto.' },
  { icon: Users,         label: 'Gestión de Usuarios',    desc: 'Control de acceso por roles con permisos diferenciados.' },
  { icon: BarChart2,     label: 'Dashboard Analítico',    desc: 'Indicadores clave, gráficas y alertas inteligentes.' },
  { icon: ShieldCheck,   label: 'Seguridad por Roles',    desc: 'Cada usuario accede únicamente a los módulos de su cargo.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 lg:px-16 py-5 border-b border-white/10">
        <img src="/logo.svg" alt="Asteron" className="h-10 w-auto brightness-200" />
        <Link
          to="/login"
          className="bg-white text-slate-800 hover:bg-slate-100 text-sm font-semibold px-5 py-2.5 rounded-lg transition"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16">
        <span className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-4">
          Sistema de gestión de producción
        </span>
        <h1 className="text-4xl lg:text-6xl font-bold leading-tight max-w-3xl">
          Gestión inteligente para <span className="text-blue-400">Macromet</span>
        </h1>
        <p className="mt-6 text-slate-300 text-base lg:text-lg max-w-xl leading-relaxed">
          Asteron centraliza proyectos, pedidos, maquinaria y programación de planta
          en una sola plataforma diseñada para fabricantes de displays POP.
        </p>
        <div className="mt-10 flex gap-4 flex-wrap justify-center">
          <Link
            to="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-7 py-3 rounded-lg text-sm transition"
          >
            Acceder al sistema
          </Link>
          <Link
            to="/forgot-password"
            className="border border-white/20 hover:border-white/40 text-white font-medium px-7 py-3 rounded-lg text-sm transition"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-16 pb-20">
        <h2 className="text-center text-xl font-semibold text-slate-300 mb-10">
          Todo lo que necesita tu operación
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                <Icon size={20} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Asteron · Desarrollado por aprendices SENA para Macromet S.A.S.
      </footer>
    </div>
  )
}
