import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, Bell, AlertTriangle, Info, XCircle, ChevronRight,
  ChevronDown, LogOut, Sun, Moon, Search, UserRound,
} from 'lucide-react'
import { getNotificaciones } from '../../api/notificaciones.service'
import { logout } from '../../utils/auth'
import { useDarkMode } from '../../context/DarkModeContext'

const PAGE_META = {
  '/dashboard':      { title: 'Dashboard',             sub: 'MES · Macromet S.A.S.' },
  '/proyectos':      { title: 'Proyectos',             sub: 'MES · Macromet S.A.S.' },
  '/pedidos':        { title: 'Pedidos',               sub: 'MES · Macromet S.A.S.' },
  '/clientes':       { title: 'Clientes',              sub: 'MES · Macromet S.A.S.' },
  '/maquinaria':     { title: 'Maquinaria',            sub: 'MES · Macromet S.A.S.' },
  '/programacion':   { title: 'Programación de Planta',sub: 'MES · Macromet S.A.S.' },
  '/mantenimientos': { title: 'Mantenimientos',        sub: 'MES · Macromet S.A.S.' },
  '/usuarios':       { title: 'Usuarios',              sub: 'MES · Macromet S.A.S.' },
  '/perfil':         { title: 'Mi perfil',             sub: 'MES · Macromet S.A.S.' },
  '/admin':          { title: 'Administración',        sub: 'MES · Macromet S.A.S.' },
}

const tipoCfg = {
  error:   { icon: <XCircle       size={14} className="text-error shrink-0" />,   bg: 'bg-error/5'   },
  warning: { icon: <AlertTriangle size={14} className="text-warning shrink-0" />, bg: 'bg-warning/5' },
  info:    { icon: <Info          size={14} className="text-primary shrink-0" />, bg: 'bg-primary/5' },
}

const initials = (nombre) =>
  (nombre || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

const TopBar = ({ user, onMenuToggle }) => {
  const { pathname } = useLocation()
  const navigate     = useNavigate()
  const [dark, setDark] = useDarkMode()
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifs, setNotifs]             = useState([])
  const notifRef = useRef(null)
  const userRef  = useRef(null)

  const meta = Object.entries(PAGE_META).find(([k]) => pathname.startsWith(k))?.[1]
    ?? { title: 'Dashboard', sub: 'MES · Macromet S.A.S.' }

  const today = new Date().toLocaleDateString('es-CO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    getNotificaciones()
      .then(r => setNotifs(r.data.items || []))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current  && !userRef.current.contains(e.target))  setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleNotifClick = (link) => { setNotifOpen(false); if (link) navigate(link) }
  const handleLogout     = () => { logout(); navigate('/login') }

  return (
    <header className="h-16 shrink-0 flex items-center gap-4 px-4 lg:px-6
      bg-white/80 dark:bg-[#10141F]/80 backdrop-blur-md backdrop-saturate-150
      border-b border-border sticky top-0 z-10"
    >
      {/* ── Hamburger móvil ── */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-control text-faint hover:bg-surface2
          hover:text-muted transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* ── Título + subtítulo ── */}
      <div className="flex-none min-w-0">
        <h1 className="text-[17px] font-semibold text-ink leading-tight truncate">
          {meta.title}
        </h1>
        <p className="font-mono text-[11px] text-faint leading-none truncate whitespace-nowrap hidden sm:block">
          {meta.sub}
        </p>
      </div>

      {/* ── Buscador central ── */}
      <div className="flex-1 hidden md:flex justify-center">
        <div className="flex items-center gap-2 h-[38px] w-full max-w-[260px]
          bg-surface2 border border-border rounded-control px-3
          text-faint text-[13px] cursor-text select-none"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 truncate">Buscar proyecto, máquina…</span>
          <span className="font-mono text-[10px] bg-surface border border-border
            rounded px-1 py-0.5 text-faint hidden sm:inline">
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Acciones derecha ── */}
      <div className="ml-auto flex items-center gap-2">

        {/* Toggle tema */}
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? 'Modo claro' : 'Modo oscuro'}
          className="w-[38px] h-[38px] flex items-center justify-center
            bg-surface2 border border-border rounded-control
            text-faint hover:text-primary hover:border-primary/40
            transition-colors"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Campana */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="w-[38px] h-[38px] flex items-center justify-center
              bg-surface2 border border-border rounded-control
              text-faint hover:text-primary hover:border-primary/40
              transition-colors relative"
          >
            <Bell size={16} />
            {notifs.length > 0 && (
              <span className="absolute top-2 right-2 w-[7px] h-[7px] bg-error
                rounded-full ring-2 ring-surface" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-[46px] w-80 bg-surface border border-border
              rounded-card shadow-modal z-50 overflow-hidden animate-md-in"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-ink">
                  Notificaciones
                  {notifs.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-error/10 text-error
                      rounded-badge text-[10px] font-mono"
                    >
                      {notifs.length}
                    </span>
                  )}
                </p>
                <button onClick={() => setNotifOpen(false)}
                  className="text-faint hover:text-muted transition-colors">
                  <XCircle size={14} />
                </button>
              </div>

              {notifs.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell size={22} className="mx-auto text-faint mb-2" />
                  <p className="text-[13px] text-faint">Sin alertas activas</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifs.map(n => {
                    const cfg = tipoCfg[n.tipo] || tipoCfg.info
                    return (
                      <button key={n.id} onClick={() => handleNotifClick(n.link)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3
                          hover:bg-hover transition-colors ${cfg.bg}`}
                      >
                        {cfg.icon}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-ink">{n.titulo}</p>
                          <p className="text-[11px] text-muted mt-0.5 leading-relaxed">
                            {n.mensaje}
                          </p>
                        </div>
                        {n.link && <ChevronRight size={12} className="text-faint mt-0.5 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Usuario */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2 h-[38px] pl-2 pr-3
              bg-surface2 border border-border rounded-control
              hover:border-border-strong transition-colors"
          >
            {/* Avatar gradiente */}
            <div className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center
              bg-gradient-to-br from-primary to-indigo-800 text-white text-[11px] font-bold shrink-0"
            >
              {initials(user?.nombre)}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[12.5px] font-semibold text-ink leading-tight">
                {user?.nombre?.split(' ')[0]}
              </p>
              <p className="font-mono text-[10px] text-faint leading-none">{user?.rol}</p>
            </div>
            <ChevronDown size={13} className="text-faint hidden sm:block ml-1" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-[46px] w-52 bg-surface border border-border
              rounded-card shadow-modal z-50 overflow-hidden animate-md-in"
            >
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-ink leading-tight">
                  {user?.nombre}
                </p>
                <p className="font-mono text-[10px] text-faint mt-0.5">{user?.rol}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setUserMenuOpen(false); navigate('/perfil') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-[13px] text-muted hover:bg-hover hover:text-ink transition-colors"
                >
                  <UserRound size={15} />
                  Mi perfil
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5
                    text-[13px] text-error hover:bg-error/8 transition-colors"
                >
                  <LogOut size={15} />
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
