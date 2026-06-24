import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  Wrench,
  CalendarDays,
  Users,
  Building2,
  ClipboardCheck,
  LogOut,
  X,
} from 'lucide-react'
import { logout, getUser } from '../../utils/auth'
import { canAccess } from '../../config/permissions'

const ALL_NAV_ITEMS = [
  { to: '/dashboard',       label: 'Dashboard',       icon: LayoutDashboard, module: 'dashboard'      },
  { to: '/proyectos',       label: 'Proyectos',       icon: FolderKanban,    module: 'proyectos'      },
  { to: '/pedidos',         label: 'Pedidos',         icon: ClipboardList,   module: 'pedidos'        },
  { to: '/clientes',        label: 'Clientes',        icon: Building2,       module: 'clientes'       },
  { to: '/maquinaria',      label: 'Maquinaria',      icon: Wrench,          module: 'maquinaria'     },
  { to: '/mantenimientos',  label: 'Mantenimientos',  icon: ClipboardCheck,  module: 'mantenimientos' },
  { to: '/programacion',    label: 'Programación',    icon: CalendarDays,    module: 'programacion'   },
  { to: '/usuarios',        label: 'Usuarios',        icon: Users,           module: 'usuarios'       },
]

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate()
  const user = getUser()
  const navItems = ALL_NAV_ITEMS.filter(item => canAccess(user?.rol, item.module))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Overlay en móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-64
          bg-white dark:bg-slate-800
          border-r border-slate-200 dark:border-slate-700
          flex flex-col transition-transform duration-300
          lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100 dark:border-slate-700">
          <img src="/logo.svg" alt="Asteron" className="h-20 w-auto object-contain dark:brightness-0 dark:invert" />
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-slate-800 dark:bg-slate-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
