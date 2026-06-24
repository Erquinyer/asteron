import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, Tag, Check, Lock, AlertCircle, ChevronDown,
  Plus, Pencil, Trash2, X, Eye, EyeOff, Search, UserCheck, UserX,
} from 'lucide-react'
import {
  getAcciones, updateRolPermisos, updateRolAcciones,
  getUsuariosAdmin, createUsuarioAdmin, updateUsuarioAdmin,
  toggleUsuarioAdmin, updateUsuarioRol,
  getRoles, createRol, updateRol, deleteRol,
} from '../api/admin.service'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'

// ─── shared constants ────────────────────────────────────────────
const MODULE_LABELS = {
  dashboard:      'Dashboard',
  proyectos:      'Proyectos',
  pedidos:        'Pedidos',
  clientes:       'Clientes',
  maquinaria:     'Maquinaria',
  mantenimientos: 'Mantenimientos',
  programacion:   'Programación de Planta',
  usuarios:       'Usuarios',
}
const MODULE_ORDER = ['dashboard','proyectos','pedidos','clientes','maquinaria','mantenimientos','programacion','usuarios']
const MODULO_ACCIONES = {
  dashboard:      [],
  proyectos:      ['crear','editar','eliminar'],
  pedidos:        ['crear','editar','eliminar'],
  clientes:       ['crear','editar','eliminar'],
  maquinaria:     ['crear','editar','eliminar'],
  mantenimientos: ['crear','eliminar'],
  programacion:   ['crear','editar','eliminar'],
  usuarios:       ['crear','editar','eliminar'],
}
const ACCION_LABELS  = { crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' }
const ACCION_COLORS  = { crear: 'bg-blue-500 border-blue-500 hover:bg-blue-600', editar: 'bg-amber-500 border-amber-500 hover:bg-amber-600', eliminar: 'bg-red-500 border-red-500 hover:bg-red-600' }
const ACCION_HEADERS = { crear: 'text-blue-600 dark:text-blue-400', editar: 'text-amber-600 dark:text-amber-400', eliminar: 'text-red-600 dark:text-red-400' }

const AVATAR_COLORS = ['bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500','bg-pink-500','bg-indigo-500','bg-teal-500','bg-orange-500','bg-slate-500']
const initials = n => n?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() || '?'

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1'

// ─────────────────────────────────────────────────────────────────
// Tab 1 — Permisos unificados
// ─────────────────────────────────────────────────────────────────
function PermisosUnificados() {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState({ programacion: true })
  const [saving,   setSaving]   = useState({})

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data: d } = await getAcciones()
      setData(d)
    } catch {
      toast.error('Error al cargar permisos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const toggleExpand = m => setExpanded(e => ({ ...e, [m]: !e[m] }))

  const toggleAcceso = async (rol, modulo) => {
    if (rol.nombre === 'Administrador Sistema') return
    const tiene  = rol.modulos.includes(modulo)
    const nuevos = tiene ? rol.modulos.filter(m => m !== modulo) : [...rol.modulos, modulo]
    setData(prev => ({
      ...prev,
      roles: prev.roles.map(r =>
        r.id_rol === rol.id_rol
          ? { ...r, modulos: nuevos, acciones: tiene ? { ...r.acciones, [modulo]: [] } : r.acciones }
          : r),
    }))
    const key = `acc-${rol.id_rol}-${modulo}`
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await updateRolPermisos(rol.id_rol, nuevos)
      if (tiene) await updateRolAcciones(rol.id_rol, modulo, [])
      toast.success(tiene ? 'Acceso removido' : 'Acceso habilitado')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
      load()
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  const toggleAccion = async (rol, modulo, accion) => {
    if (rol.nombre === 'Administrador Sistema') return
    const accActuales = rol.acciones?.[modulo] ?? []
    const tiene  = accActuales.includes(accion)
    const nuevas = tiene ? accActuales.filter(a => a !== accion) : [...accActuales, accion]
    setData(prev => ({
      ...prev,
      roles: prev.roles.map(r =>
        r.id_rol === rol.id_rol
          ? { ...r, acciones: { ...r.acciones, [modulo]: nuevas } }
          : r),
    }))
    const key = `accion-${rol.id_rol}-${modulo}-${accion}`
    setSaving(s => ({ ...s, [key]: true }))
    try {
      await updateRolAcciones(rol.id_rol, modulo, nuevas)
      toast.success(tiene ? 'Permiso removido' : 'Permiso habilitado')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
      load()
    } finally {
      setSaving(s => ({ ...s, [key]: false }))
    }
  }

  if (loading) return <Spinner text="Cargando permisos..." />
  if (!data)   return null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Permisos por Módulo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Expande un módulo para configurar acceso y acciones por rol. Los cambios aplican en el próximo inicio de sesión.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 rounded-lg px-3 py-1.5 shrink-0">
          <Lock size={12}/> Administrador Sistema es inmutable
        </span>
      </div>

      <div className="space-y-2">
        {MODULE_ORDER.map(modulo => {
          const acciones   = MODULO_ACCIONES[modulo] ?? []
          const isExpanded = expanded[modulo]
          const conAcceso  = data.roles.filter(r => r.modulos.includes(modulo)).length

          return (
            <div key={modulo} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleExpand(modulo)}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{MODULE_LABELS[modulo]}</span>
                  {acciones.length > 0 ? (
                    <div className="flex gap-1">
                      {acciones.map(a => (
                        <span key={a} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACCION_HEADERS[a]} bg-slate-100 dark:bg-slate-700`}>
                          {ACCION_LABELS[a]}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Solo lectura</span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    conAcceso === data.roles.length
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : conAcceso === 0
                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                  }`}>
                    {conAcceso}/{data.roles.length} roles
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}/>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                        <th className="text-left px-5 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 min-w-[200px]">Rol</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-600 dark:text-slate-300 min-w-[90px]">Acceso</th>
                        {acciones.map(a => (
                          <th key={a} className={`px-4 py-2.5 text-center text-xs font-semibold min-w-[90px] ${ACCION_HEADERS[a]}`}>
                            {ACCION_LABELS[a]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.roles.map(rol => {
                        const isAdmin     = rol.nombre === 'Administrador Sistema'
                        const tieneAcceso = rol.modulos.includes(modulo)
                        const accRol      = rol.acciones?.[modulo] ?? []
                        const anyBusy     = Object.keys(saving).some(k =>
                          k.startsWith(`acc-${rol.id_rol}-${modulo}`) ||
                          k.startsWith(`accion-${rol.id_rol}-${modulo}`))
                        return (
                          <tr key={rol.id_rol}
                            className={`border-b border-slate-50 dark:border-slate-700/40 last:border-0 transition-colors
                              ${isAdmin ? 'bg-blue-50/40 dark:bg-blue-950/10' : tieneAcceso ? 'hover:bg-slate-50 dark:hover:bg-slate-800/30' : 'opacity-50'}`}>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {anyBusy && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"/>}
                                <div>
                                  <p className={`text-xs font-semibold ${isAdmin ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {rol.nombre}{isAdmin && <Lock size={10} className="inline ml-1.5 opacity-60"/>}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px] mt-0.5">{rol.descripcion}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isAdmin ? (
                                <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto"><Check size={13} strokeWidth={2.5}/></span>
                              ) : (
                                <button onClick={() => toggleAcceso(rol, modulo)}
                                  disabled={!!saving[`acc-${rol.id_rol}-${modulo}`]}
                                  className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border-2 transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed
                                    ${tieneAcceso
                                      ? 'bg-slate-700 border-slate-700 dark:bg-slate-500 dark:border-slate-500 text-white hover:bg-slate-600'
                                      : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'}`}>
                                  <Check size={13} strokeWidth={2.5}/>
                                </button>
                              )}
                            </td>
                            {acciones.map(accion => {
                              const tieneAccion = accRol.includes(accion)
                              const isBusy      = !!saving[`accion-${rol.id_rol}-${modulo}-${accion}`]
                              return (
                                <td key={accion} className="px-4 py-3 text-center">
                                  {isAdmin ? (
                                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 mx-auto"><Check size={13} strokeWidth={2.5}/></span>
                                  ) : !tieneAcceso ? (
                                    <span className="inline-block h-7 w-7 rounded-lg border-2 border-slate-100 dark:border-slate-700/40 mx-auto"/>
                                  ) : (
                                    <button onClick={() => toggleAccion(rol, modulo, accion)} disabled={isBusy}
                                      className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border-2 transition-all mx-auto disabled:opacity-50 disabled:cursor-not-allowed
                                        ${tieneAccion ? `${ACCION_COLORS[accion]} text-white` : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'}`}>
                                      <Check size={13} strokeWidth={2.5}/>
                                    </button>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
        <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 rounded bg-slate-700 dark:bg-slate-500 items-center justify-center text-white"><Check size={9}/></span>Acceso</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 rounded bg-blue-500 items-center justify-center text-white"><Check size={9}/></span>Crear</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 rounded bg-amber-500 items-center justify-center text-white"><Check size={9}/></span>Editar</span>
        <span className="flex items-center gap-1.5"><span className="inline-flex h-4 w-4 rounded bg-red-500 items-center justify-center text-white"><Check size={9}/></span>Eliminar</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-4 w-4 rounded border-2 border-slate-300 dark:border-slate-600"/>Sin permiso</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Modal compartido de usuario
// ─────────────────────────────────────────────────────────────────
const EMPTY_USER = { codigo_empleado: '', nombre: '', correo: '', password: '', id_rol: '', estado: 1 }

function UsuarioModal({ usuario, roles, onClose, onSaved }) {
  const [form, setForm] = useState(usuario ? {
    codigo_empleado: usuario.codigo_empleado || '',
    nombre:  usuario.nombre  || '',
    correo:  usuario.correo  || '',
    password: '',
    id_rol:  usuario.id_rol  || '',
    estado:  usuario.estado  ?? 1,
  } : EMPTY_USER)
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.correo.trim()) { toast.error('Nombre y correo son obligatorios'); return }
    if (!usuario && !form.password)                 { toast.error('La contraseña es obligatoria para usuarios nuevos'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      usuario
        ? await updateUsuarioAdmin(usuario.id_usuario, payload)
        : await createUsuarioAdmin(payload)
      toast.success(usuario ? 'Usuario actualizado' : 'Usuario creado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código empleado</label>
              <input name="codigo_empleado" value={form.codigo_empleado} onChange={set}
                placeholder="Auto (EMP-XXX)" className={`${inputCls} font-mono`}/>
            </div>
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={set} placeholder="Ej: Alejandro Acuña" className={inputCls}/>
            </div>
          </div>
          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input name="correo" type="email" value={form.correo} onChange={set}
              placeholder="nombre@macromet.com.co" className={inputCls}/>
          </div>
          <div>
            <label className={labelCls}>{usuario ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}</label>
            <div className="relative">
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={set}
                placeholder={usuario ? '••••••••' : 'Mínimo 6 caracteres'}
                className={`${inputCls} pr-10`}/>
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Rol</label>
              <select name="id_rol" value={form.id_rol} onChange={set} className={inputCls}>
                <option value="">Sin rol</option>
                {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="estado" value={form.estado} onChange={set} className={inputCls}>
                <option value={1}>Activo</option>
                <option value={0}>Inactivo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tab 2 — Gestión de Usuarios
// ─────────────────────────────────────────────────────────────────
function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState(null)
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [{ data: u }, { data: r }] = await Promise.all([getUsuariosAdmin(), getRoles()])
      setUsuarios(u)
      setRoles(r)
    } catch {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async u => {
    if (u.codigo_empleado === 'EMP-000') { toast.error('No se puede desactivar el Administrador Sistema'); return }
    setUsuarios(prev => prev.map(x => x.id_usuario === u.id_usuario ? { ...x, estado: x.estado ? 0 : 1 } : x))
    try {
      await toggleUsuarioAdmin(u.id_usuario)
      toast.success(u.estado ? 'Usuario desactivado' : 'Usuario activado')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
      load()
    }
  }

  if (loading) return <Spinner text="Cargando usuarios..." />

  const filtrados = (usuarios || []).filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (u.correo || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.codigo_empleado || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.rol || '').toLowerCase().includes(search.toLowerCase()))

  const activos   = (usuarios || []).filter(u => u.estado === 1).length
  const inactivos = (usuarios || []).length - activos

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {usuarios?.length || 0} usuarios · {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15}/> Nuevo usuario
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, rol…"
          className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">Correo</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Código</th>
              <th className="text-left px-4 py-3">Rol</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u, i) => {
              const isAdminUser = u.codigo_empleado === 'EMP-000'
              return (
                <tr key={u.id_usuario}
                  className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 transition-colors
                    ${isAdminUser ? 'bg-blue-50/40 dark:bg-blue-950/10' : u.estado ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'opacity-60'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                        {initials(u.nombre)}
                      </div>
                      <span className="font-medium text-slate-800 dark:text-white text-sm">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs hidden sm:table-cell">{u.correo}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{u.codigo_empleado}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {isAdminUser
                      ? <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium"><Lock size={11}/>{u.rol}</span>
                      : u.rol || <span className="text-slate-400">Sin rol</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                      ${u.estado
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.estado ? 'bg-green-500' : 'bg-slate-400'}`}/>
                      {u.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isAdminUser && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(u)}
                          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => handleToggle(u)}
                          className={`p-1.5 rounded transition-colors ${
                            u.estado
                              ? 'hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500'
                              : 'hover:bg-green-50 dark:hover:bg-green-900/30 text-slate-400 hover:text-green-500'
                          }`} title={u.estado ? 'Desactivar' : 'Activar'}>
                          {u.estado ? <UserX size={13}/> : <UserCheck size={13}/>}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <UsuarioModal
          usuario={modal === 'new' ? null : modal}
          roles={roles}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Modal de Rol
// ─────────────────────────────────────────────────────────────────
function RolModal({ rol, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: rol?.nombre || '', descripcion: rol?.descripcion || '' })
  const [saving, setSaving] = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return }
    setSaving(true)
    try {
      rol ? await updateRol(rol.id_rol, form) : await createRol(form)
      toast.success(rol ? 'Rol actualizado' : 'Rol creado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{rol ? 'Editar rol' : 'Nuevo rol'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre del rol *</label>
            <input name="nombre" value={form.nombre} onChange={set}
              placeholder="Ej: Coordinador de Calidad" className={inputCls} autoFocus/>
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={3}
              placeholder="Describe las responsabilidades de este rol"
              className={`${inputCls} resize-none`}/>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : rol ? 'Guardar cambios' : 'Crear rol'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Tab 3 — Gestión de Roles
// ─────────────────────────────────────────────────────────────────
function GestionRoles() {
  const [roles,   setRoles]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await getRoles()
      setRoles(data)
    } catch {
      toast.error('Error al cargar roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async rol => {
    if (rol.nombre === 'Administrador Sistema') { toast.error('No se puede eliminar este rol'); return }
    if (Number(rol.total_usuarios) > 0) {
      toast.error(`No se puede eliminar: ${rol.total_usuarios} usuario(s) tienen este rol`)
      return
    }
    if (!confirm(`¿Eliminar el rol "${rol.nombre}"?`)) return
    try {
      await deleteRol(rol.id_rol)
      toast.success('Rol eliminado')
      setRoles(prev => prev.filter(r => r.id_rol !== rol.id_rol))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando roles..." />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Roles del Sistema</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {roles?.length || 0} roles definidos · Los cambios de nombre aplican en el próximo inicio de sesión
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={15}/> Nuevo rol
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400">
              <th className="text-left px-5 py-3">Rol</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Descripción</th>
              <th className="text-center px-5 py-3">Usuarios</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(roles || []).map((rol, i) => {
              const isAdmin = rol.nombre === 'Administrador Sistema'
              return (
                <tr key={rol.id_rol}
                  className={`border-b border-slate-100 dark:border-slate-700/60 last:border-0 transition-colors
                    ${isAdmin ? 'bg-blue-50/40 dark:bg-blue-950/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`${AVATAR_COLORS[i % AVATAR_COLORS.length]} h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                        {(rol.nombre[0] || '?').toUpperCase()}
                      </div>
                      <p className={`font-semibold text-sm ${isAdmin ? 'text-blue-700 dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                        {rol.nombre}{isAdmin && <Lock size={11} className="inline ml-1.5 opacity-60"/>}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 dark:text-slate-400 text-xs hidden md:table-cell max-w-xs">
                    <p className="line-clamp-2">{rol.descripcion || <span className="italic text-slate-300 dark:text-slate-600">Sin descripción</span>}</p>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      ${Number(rol.total_usuarios) > 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>
                      <Users size={11}/>
                      {rol.total_usuarios}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {!isAdmin && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(rol)}
                          className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                          <Pencil size={13}/>
                        </button>
                        <button onClick={() => handleDelete(rol)}
                          disabled={Number(rol.total_usuarios) > 0}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Eliminar">
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
        <Lock size={11}/> Los roles con usuarios asignados no pueden eliminarse. Reasigna primero sus usuarios desde la pestaña Usuarios.
      </p>

      {modal && (
        <RolModal
          rol={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'permisos', label: 'Permisos', icon: Shield },
  { id: 'usuarios', label: 'Usuarios', icon: Users  },
  { id: 'roles',    label: 'Roles',    icon: Tag    },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('permisos')

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white"/>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Panel de Administración</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Permisos, usuarios y roles del sistema</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-1.5">
          <AlertCircle size={13}/>
          Acceso exclusivo · Administrador Sistema
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              <Icon size={15}/>
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        {tab === 'permisos' && <PermisosUnificados />}
        {tab === 'usuarios' && <GestionUsuarios />}
        {tab === 'roles'    && <GestionRoles />}
      </div>
    </div>
  )
}
