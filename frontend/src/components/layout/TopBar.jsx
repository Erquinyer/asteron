import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Bell, AlertTriangle, Info, XCircle, ChevronRight, X } from 'lucide-react'
import { getNotificaciones } from '../../api/notificaciones.service'

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
  error:   { icon: <XCircle       size={15} className="text-red-500 shrink-0"/>,    bg: 'bg-red-50'    },
  warning: { icon: <AlertTriangle size={15} className="text-amber-500 shrink-0"/>,  bg: 'bg-amber-50'  },
  info:    { icon: <Info          size={15} className="text-blue-500 shrink-0"/>,   bg: 'bg-blue-50'   },
}

const TopBar = ({ user, onMenuToggle }) => {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState([])
  const panelRef = useRef(null)

  const title = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] || 'Dashboard'

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const initials = (nombre) =>
    (nombre || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  // Carga notificaciones al montar
  useEffect(() => {
    getNotificaciones()
      .then(r => setNotifs(r.data.items || []))
      .catch(() => {})
  }, [pathname])

  // Cierra panel al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = (link) => {
    setOpen(false)
    if (link) navigate(link)
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Izquierda */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md hover:bg-slate-100 text-slate-500">
          <Menu size={20}/>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 leading-tight">{title}</h1>
          <p className="text-xs text-slate-400 capitalize hidden sm:block">{today}</p>
        </div>
      </div>

      {/* Derecha */}
      <div className="flex items-center gap-3">

        {/* Campana de notificaciones */}
        <div className="relative" ref={panelRef}>
          <button onClick={() => setOpen(o => !o)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 relative">
            <Bell size={18}/>
            {notifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">
                  Notificaciones
                  {notifs.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">{notifs.length}</span>
                  )}
                </p>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={15}/>
                </button>
              </div>

              {notifs.length === 0
                ? (
                  <div className="px-4 py-8 text-center">
                    <Bell size={24} className="mx-auto text-slate-300 mb-2"/>
                    <p className="text-sm text-slate-400">Sin alertas activas</p>
                  </div>
                )
                : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifs.map(n => {
                      const cfg = tipoCfg[n.tipo] || tipoCfg.info
                      return (
                        <button key={n.id} onClick={() => handleNotifClick(n.link)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors ${cfg.bg}`}>
                          {cfg.icon}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700">{n.titulo}</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.mensaje}</p>
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

        {/* Avatar + nombre */}
        <button onClick={() => navigate('/perfil')}
          className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center">
            {initials(user?.nombre)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-800 leading-tight">{user?.nombre}</p>
            <p className="text-xs text-slate-400">{user?.rol}</p>
          </div>
        </button>
      </div>
    </header>
  )
}

export default TopBar
