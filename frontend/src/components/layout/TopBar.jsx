import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, Bell, AlertTriangle, Info, XCircle, ChevronRight, X,
  ChevronDown, UserRound, LogOut, Sun, Moon,
} from 'lucide-react'
import { getNotificaciones } from '../../api/notificaciones.service'
import { logout } from '../../utils/auth'
import { useDarkMode } from '../../context/DarkModeContext'

const pageTitles = {
  '/dashboard':      'Dashboard',
  '/proyectos':      'Proyectos',
  '/pedidos':        'Pedidos',
  '/clientes':       'Clientes',
  '/maquinaria':     'Maquinaria',
  '/programacion':   'Programación de Planta',
  '/mantenimientos': 'Mantenimientos',
  '/usuarios':       'Usuarios',
  '/perfil':         'Mi perfil',
}

const tipoCfg = {
  error:   { icon: <XCircle       size={15} className="text-red-500 shrink-0"/>,    bg: 'bg-red-50 dark:bg-red-900/20'    },
  warning: { icon: <AlertTriangle size={15} className="text-amber-500 shrink-0"/>,  bg: 'bg-amber-50 dark:bg-amber-900/20'  },
  info:    { icon: <Info          size={15} className="text-blue-500 shrink-0"/>,   bg: 'bg-blue-50 dark:bg-blue-900/20'   },
}

const TopBar = ({ user, onMenuToggle }) => {
  const { pathname } = useLocation()
  const navigate      = useNavigate()
  const [dark, setDark] = useDarkMode()
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const notifRef   = useRef(null)
  const userRef    = useRef(null)

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] || 'Dashboard'

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const initials = (nombre) =>
    (nombre || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    getNotificaciones()
      .then(r => setNotifs(r.data.items || []))
      .catch(() => {})
  }, [pathname])

  // Cierra paneles al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))   setNotifOpen(false)
      if (userRef.current  && !userRef.current.contains(e.target))    setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = (link) => {
    setNotifOpen(false)
    if (link) navigate(link)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Izquierda */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
          <Menu size={20}/>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{title}</h1>
          <p className="text-xs text-slate-400 capitalize hidden sm:block">{today}</p>
        </div>
      </div>

      {/* Derecha */}
      <div className="flex items-center gap-2">

        {/* Toggle modo oscuro */}
        <button
          onClick={() => setDark(d => !d)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          title={dark ? 'Modo claro' : 'Modo oscuro'}
        >
          {dark ? <Sun size={18}/> : <Moon size={18}/>}
        </button>

        {/* Campana de notificaciones */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 relative">
            <Bell size={18}/>
            {notifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Notificaciones
                  {notifs.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">{notifs.length}</span>
                  )}
                </p>
                <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={15}/>
                </button>
              </div>

              {notifs.length === 0
                ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2"/>
                    <p className="text-sm text-slate-400">Sin alertas activas</p>
                  </div>
                )
                : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                    {notifs.map(n => {
                      const cfg = tipoCfg[n.tipo] || tipoCfg.info
                      return (
                        <button key={n.id} onClick={() => handleNotifClick(n.link)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${cfg.bg}`}>
                          {cfg.icon}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{n.titulo}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.mensaje}</p>
                          </div>
                          {n.link && <ChevronRight size={13} className="text-slate-300 mt-0.5 shrink-0"/>}
                        </button>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )}
        </div>

        {/* Avatar + menú de usuario */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-600 text-white text-xs font-bold flex items-center justify-center">
              {initials(user?.nombre)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">{user?.nombre}</p>
              <p className="text-xs text-slate-400">{user?.rol}</p>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block ml-1"/>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">{user?.nombre}</p>
                <p className="text-xs text-slate-400 mt-0.5">{user?.rol}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/perfil') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <UserRound size={16}/>
                  Mi perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={16}/>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default TopBar
