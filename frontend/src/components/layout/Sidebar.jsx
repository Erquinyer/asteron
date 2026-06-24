import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, ClipboardList, Wrench,
  CalendarDays, Building2, ClipboardCheck,
  ShieldCheck, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { getUser } from '../../utils/auth'
import { canAccess } from '../../config/permissions'

const ALL_NAV_ITEMS = [
  { to: '/dashboard',      label: 'Dashboard',        icon: LayoutDashboard, module: 'dashboard'      },
  { to: '/proyectos',      label: 'Proyectos',        icon: FolderKanban,    module: 'proyectos'      },
  { to: '/pedidos',        label: 'Pedidos',          icon: ClipboardList,   module: 'pedidos'        },
  { to: '/clientes',       label: 'Clientes',         icon: Building2,       module: 'clientes'       },
  { to: '/maquinaria',     label: 'Maquinaria',       icon: Wrench,          module: 'maquinaria'     },
  { to: '/mantenimientos', label: 'Mantenimientos',   icon: ClipboardCheck,  module: 'mantenimientos' },
  { to: '/programacion',   label: 'Programación',     icon: CalendarDays,    module: 'programacion'   },
  { to: '/admin',          label: 'Administración',   icon: ShieldCheck,     module: 'admin'          },
]

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const user = getUser()
  const navItems = ALL_NAV_ITEMS.filter(item => canAccess(user?.rol, item.module))

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full flex flex-col
          bg-white dark:bg-slate-800
          border-r border-slate-200 dark:border-slate-700
          transition-all duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Logo con animación de crossfade */}
        <div className="relative flex items-center justify-center shrink-0 h-16 border-b border-slate-100 dark:border-slate-700">

          {/* Logo completo — en flujo cuando expandido, absoluto cuando colapsado */}
          <img
            src="/logo.svg"
            alt="Asteron"
            className={`
              h-8 w-auto object-contain
              dark:brightness-0 dark:invert
              transition-all duration-300 ease-in-out
              ${collapsed
                ? 'absolute opacity-0 scale-90 pointer-events-none'
                : 'opacity-100 scale-100'
              }
            `}
          />

          {/* Ícono infinito — en flujo cuando colapsado, absoluto cuando expandido */}
          <img
            src="/logo-icon.png"
            alt="Asteron"
            className={`
              h-8 w-8 object-contain
              dark:brightness-0 dark:invert
              transition-all duration-300 ease-in-out
              ${collapsed
                ? 'opacity-100 scale-100'
                : 'absolute opacity-0 scale-75 pointer-events-none'
              }
            `}
          />

          {/* Botón cerrar — solo móvil, anclado a la derecha */}
          <button
            onClick={onClose}
            className="absolute right-3 lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className={`space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg text-sm font-medium transition-colors
                  ${collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-3 py-2.5'}
                  ${isActive
                    ? 'bg-slate-800 dark:bg-slate-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Botón colapsar — solo escritorio */}
        <div className={`
          hidden lg:flex shrink-0 border-t border-slate-100 dark:border-slate-700 py-3
          ${collapsed ? 'justify-center px-2' : 'px-3'}
        `}>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="flex items-center justify-center w-full gap-2 px-3 py-2 rounded-lg text-sm
              text-slate-500 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white
              transition-colors"
          >
            {collapsed
              ? <ChevronRight size={16} />
              : <><ChevronLeft size={16} /><span className="text-xs">Colapsar</span></>
            }
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
