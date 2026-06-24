import { useState, useEffect, useCallback } from 'react'
import { Shield, Users, Check, Lock, AlertCircle, ChevronDown } from 'lucide-react'
import { getPermisos, updateRolPermisos, getUsuariosAdmin, updateUsuarioRol } from '../api/admin.service'
import { getRoles } from '../api/usuarios.service'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

const MODULE_LABELS = {
  dashboard:      'Dashboard',
  proyectos:      'Proyectos',
  pedidos:        'Pedidos',
  clientes:       'Clientes',
  maquinaria:     'Maquinaria',
  mantenimientos: 'Mantenimientos',
  programacion:   'Programación',
  usuarios:       'Usuarios',
}

const COLORS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500',
  'bg-pink-500','bg-indigo-500','bg-teal-500','bg-orange-500','bg-slate-500',
]
const initials = n => n?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'

// ─────────────────────────────────────────────
// Tab: Matriz de Permisos
// ─────────────────────────────────────────────
function MatrizPermisos() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState({}) // { [id_rol]: true|false }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data: d } = await getPermisos()
      setData(d)
    } catch {
      toast.error('Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (rol, modulo) => {
    if (rol.nombre === 'Administrador Sistema') return

    const tiene  = rol.modulos.includes(modulo)
    const nuevos = tiene
      ? rol.modulos.filter(m => m !== modulo)
      : [...rol.modulos, modulo]

    // Optimistic update
    setData(prev => ({
      ...prev,
      roles: prev.roles.map(r =>
        r.id_rol === rol.id_rol ? { ...r, modulos: nuevos } : r),
    }))

    setSaving(s => ({ ...s, [rol.id_rol]: true }))
    try {
      await updateRolPermisos(rol.id_rol, nuevos)
      toast.success(`${tiene ? 'Permiso removido' : 'Permiso otorgado'}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
      load() // revert on error
    } finally {
      setSaving(s => ({ ...s, [rol.id_rol]: false }))
    }
  }

  if (loading) return <Spinner text="Cargando matriz de permisos..." />
  if (!data)   return null

  const modulos = data.modulos

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Permisos por Rol
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Haz clic en una celda para activar o desactivar el acceso. Los cambios se aplican de inmediato.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
          <Lock size={12} /> Administrador Sistema es inmutable
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 min-w-[200px]">
                Rol
              </th>
              {modulos.map(m => (
                <th key={m} className="px-3 py-3 text-center font-medium text-slate-600 dark:text-slate-300 min-w-[110px]">
                  <span className="text-xs">{MODULE_LABELS[m] ?? m}</span>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-slate-500 dark:text-slate-400 min-w-[80px] text-xs">
                Módulos
              </th>
            </tr>
          </thead>
          <tbody>
            {data.roles.map((rol, i) => {
              const isAdminRol = rol.nombre === 'Administrador Sistema'
              const isSaving   = saving[rol.id_rol]
              return (
                <tr
                  key={rol.id_rol}
                  className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 transition-colors
                    ${isAdminRol
                      ? 'bg-blue-50/60 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {isSaving && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                      )}
                      <div>
                        <p className={`font-medium ${isAdminRol ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                          {rol.nombre}
                          {isAdminRol && <Lock size={11} className="inline ml-1.5 opacity-60" />}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">
                          {rol.descripcion}
                        </p>
                      </div>
                    </div>
                  </td>
                  {modulos.map(m => {
                    const tiene = rol.modulos.includes(m)
                    return (
                      <td key={m} className="px-3 py-3 text-center">
                        {isAdminRol ? (
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto">
                            <Check size={13} strokeWidth={2.5} />
                          </span>
                        ) : (
                          <button
                            onClick={() => toggle(rol, m)}
                            disabled={isSaving}
                            className={`
                              inline-flex items-center justify-center h-7 w-7 rounded-lg
                              border-2 transition-all mx-auto
                              disabled:opacity-50 disabled:cursor-not-allowed
                              ${tiene
                                ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600'
                                : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400 dark:hover:border-slate-500'
                              }
                            `}
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center">
                    <span className={`
                      inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                      ${rol.modulos.length === modulos.length
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : rol.modulos.length === 0
                          ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                      }
                    `}>
                      {rol.modulos.length}/{modulos.length}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 rounded bg-green-500 items-center justify-center text-white">
            <Check size={10} />
          </span>
          Acceso habilitado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border-2 border-slate-300 dark:border-slate-600" />
          Sin acceso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 rounded bg-blue-100 dark:bg-blue-900/40 items-center justify-center text-blue-600">
            <Check size={10} />
          </span>
          Fijo (no editable)
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Tab: Usuarios y Roles
// ─────────────────────────────────────────────
function UsuariosRoles() {
  const [usuarios, setUsuarios] = useState(null)
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState({})
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    Promise.all([getUsuariosAdmin(), getRoles()])
      .then(([{ data: u }, { data: r }]) => { setUsuarios(u); setRoles(r) })
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false))
  }, [])

  const handleRolChange = async (usuario, id_rol) => {
    const old = usuario.id_rol
    setUsuarios(prev => prev.map(u =>
      u.id_usuario === usuario.id_usuario
        ? { ...u, id_rol: Number(id_rol), rol: roles.find(r => r.id_rol === Number(id_rol))?.nombre || '' }
        : u))
    setSaving(s => ({ ...s, [usuario.id_usuario]: true }))
    try {
      await updateUsuarioRol(usuario.id_usuario, id_rol)
      toast.success(`Rol de ${usuario.nombre} actualizado`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cambiar rol')
      setUsuarios(prev => prev.map(u =>
        u.id_usuario === usuario.id_usuario ? { ...u, id_rol: old } : u))
    } finally {
      setSaving(s => ({ ...s, [usuario.id_usuario]: false }))
    }
  }

  if (loading) return <Spinner text="Cargando usuarios..." />

  const filtrados = (usuarios || []).filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (u.correo || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.codigo_empleado || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            Asignación de Roles
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cambia el rol de cada usuario. El cambio de permisos aplica en el próximo inicio de sesión.
          </p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar usuario…"
          className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm
            bg-white dark:bg-slate-800 text-slate-800 dark:text-white
            placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden sm:table-cell">Correo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300 hidden md:table-cell">Código</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Rol</th>
              <th className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u, i) => {
              const isAdminUser = u.codigo_empleado === 'EMP-000'
              const isSaving    = saving[u.id_usuario]
              return (
                <tr
                  key={u.id_usuario}
                  className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 transition-colors
                    ${isAdminUser ? 'bg-blue-50/40 dark:bg-blue-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`${COLORS[i % COLORS.length]} h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                        {initials(u.nombre)}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell text-xs">
                    {u.correo}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{u.codigo_empleado}</span>
                  </td>
                  <td className="px-4 py-3">
                    {isAdminUser ? (
                      <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 text-sm font-medium">
                        <Lock size={13} /> {u.rol}
                      </span>
                    ) : (
                      <div className="relative">
                        <select
                          value={u.id_rol || ''}
                          onChange={e => handleRolChange(u, e.target.value)}
                          disabled={isSaving}
                          className="appearance-none border border-slate-300 dark:border-slate-600 rounded-lg
                            px-3 py-1.5 pr-7 text-sm bg-white dark:bg-slate-800
                            text-slate-700 dark:text-slate-200
                            focus:outline-none focus:ring-2 focus:ring-blue-500
                            disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-[220px]"
                        >
                          <option value="">Sin rol</option>
                          {roles.filter(r => r.nombre !== 'Administrador Sistema').map(r => (
                            <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        {isSaving && <span className="absolute -right-5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${u.estado
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.estado ? 'bg-green-500' : 'bg-slate-400'}`} />
                      {u.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="text-center py-10 text-sm text-slate-400">Sin resultados para "{search}"</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────
const TABS = [
  { id: 'permisos', label: 'Matriz de Permisos', icon: Shield },
  { id: 'usuarios', label: 'Usuarios y Roles',   icon: Users  },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('permisos')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Panel de Administración</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestión de permisos, roles y accesos del sistema
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-1.5">
          <AlertCircle size={13} />
          Acceso exclusivo · Administrador Sistema
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        {tab === 'permisos' && <MatrizPermisos />}
        {tab === 'usuarios' && <UsuariosRoles />}
      </div>
    </div>
  )
}
