import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, FolderKanban, ClipboardList, Wrench,
  CalendarDays, Building2, ClipboardCheck, ShieldCheck,
  PanelLeft, PanelRight, X,
} from 'lucide-react'
import { getUser } from '../../utils/auth'
import { canAccess } from '../../config/permissions'
import { Logo } from '../Logo'
import { getCounts } from '../../api/dashboard.service'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard, module: 'dashboard'    },
      { to: '/proyectos',    label: 'Proyectos',      icon: FolderKanban,    module: 'proyectos'    },
      { to: '/programacion', label: 'Programación',   icon: CalendarDays,    module: 'programacion' },
      { to: '/pedidos',      label: 'Pedidos',         icon: ClipboardList,   module: 'pedidos'      },
    ],
  },
  {
    label: 'Recursos',
    items: [
      { to: '/maquinaria',     label: 'Maquinaria',     icon: Wrench,         module: 'maquinaria'     },
      { to: '/mantenimientos', label: 'Mantenimientos',  icon: ClipboardCheck, module: 'mantenimientos' },
      { to: '/clientes',       label: 'Clientes',        icon: Building2,      module: 'clientes'       },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/admin', label: 'Administración', icon: ShieldCheck, module: 'admin' },
    ],
  },
]

const Sidebar = ({ open, onClose, collapsed, onToggleCollapse }) => {
  const user = getUser()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    getCounts().then(r => setCounts(r.data)).catch(() => {})
  }, [])

  const getBadge = (module) => {
    if (module === 'proyectos') return counts.proyectos || null
    if (module === 'pedidos')   return counts.pedidos   || null
    return null
  }

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-ov-in"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full flex flex-col
          bg-sidebar border-r border-border
          transition-all duration-[220ms] cubic-bezier(.4,0,.2,1)
          lg:static lg:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'w-[74px]' : 'w-[248px]'}
        `}
      >
        {/* ── Cabecera ── */}
        <div className={`relative flex items-center shrink-0 h-16 border-b border-border
          ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}
        >
          <Logo
            variant="auto"
            showWord={!collapsed}
            size="md"
            className="flex-1 min-w-0"
          />

          {/* Botón cerrar — solo móvil */}
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-[8px] text-faint hover:text-muted
                hover:bg-surface2 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Navegación ── */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <div className={`space-y-4 ${collapsed ? 'px-2' : 'px-3'}`}>
            {NAV_GROUPS.map(group => {
              const visibles = group.items.filter(item => canAccess(user?.rol, item.module))
              if (visibles.length === 0) return null

              return (
                <div key={group.label}>
                  {/* Encabezado de grupo */}
                  {!collapsed && (
                    <p className="px-[10px] mb-1.5 font-mono text-[10px] font-semibold
                      uppercase tracking-[.16em] text-faint"
                    >
                      {group.label}
                    </p>
                  )}

                  <div className="space-y-0.5">
                    {visibles.map(({ to, label, icon: Icon, module }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        title={collapsed ? label : undefined}
                        className={({ isActive }) =>
                          `relative flex items-center rounded-[10px] text-[13.5px] font-medium
                          transition-colors duration-150
                          ${collapsed
                            ? 'justify-center px-0 py-3'
                            : 'gap-[11px] px-[10px] py-[9px]'
                          }
                          ${isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted hover:bg-hover hover:text-ink'
                          }`
                        }
                      >
                        {({ isActive }) => {
                          const badge = getBadge(module)
                          return (
                            <>
                              {/* Barra de acento activo */}
                              {isActive && !collapsed && (
                                <span className="absolute -left-3 top-1/2 -translate-y-1/2
                                  w-[3px] h-5 bg-primary rounded-r-full" />
                              )}
                              <Icon size={18} className="shrink-0" />
                              {!collapsed && (
                                <>
                                  <span className="flex-1 truncate">{label}</span>
                                  {!isActive && badge && (
                                    <span className="ml-auto font-mono text-[10px] font-semibold
                                      px-1.5 py-0.5 rounded-[6px] bg-primary/10 text-primary
                                      leading-none shrink-0">
                                      {badge}
                                    </span>
                                  )}
                                </>
                              )}
                            </>
                          )
                        }}
                      </NavLink>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        {/* ── Pie — botón colapsar (solo escritorio) ── */}
        <div className={`
          hidden lg:flex shrink-0 border-t border-border py-3
          ${collapsed ? 'justify-center px-2' : 'px-3'}
        `}>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className={`flex items-center rounded-[10px] text-[13.5px] font-medium
              text-muted hover:bg-hover hover:text-ink transition-colors duration-150
              ${collapsed
                ? 'justify-center w-full py-[9px]'
                : 'gap-[11px] w-full px-[10px] py-[9px]'
              }`}
          >
            {collapsed
              ? <PanelRight size={18} className="shrink-0" />
              : <><PanelLeft size={18} className="shrink-0" /><span>Colapsar</span></>
            }
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
