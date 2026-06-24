import { useState } from 'react'
import { Search, Plus, Pencil, UserCheck, UserX, X, Eye, EyeOff } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getUsuarios, getRoles, createUsuario, updateUsuario, toggleUsuario } from '../api/usuarios.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import toast      from 'react-hot-toast'

const PAGE_SIZE = 8

const COLORS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500',
  'bg-pink-500','bg-indigo-500','bg-teal-500','bg-orange-500',
]
const initials = (n) => n?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

const EMPTY = { codigo_empleado: '', nombre: '', correo: '', password: '', id_rol: '', estado: 1 }

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

function UsuarioModal({ usuario, roles, onClose, onSaved }) {
  const [form, setForm] = useState(usuario ? {
    codigo_empleado: usuario.codigo_empleado || '',
    nombre:  usuario.nombre  || '',
    correo:  usuario.correo  || '',
    password: '',
    id_rol:  usuario.id_rol  || '',
    estado:  usuario.estado  ?? 1,
  } : EMPTY)
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.correo.trim()) { toast.error('Nombre y correo son obligatorios'); return }
    if (!usuario && !form.password) { toast.error('La contraseña es obligatoria para usuarios nuevos'); return }
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      usuario ? await updateUsuario(usuario.id_usuario, payload) : await createUsuario(payload)
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
                placeholder="Auto (EMP-XXX)"
                className={`${inputCls} font-mono`}/>
            </div>
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={set}
                placeholder="Ej: Alejandro Acuña" className={inputCls}/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input name="correo" type="email" value={form.correo} onChange={set}
              placeholder="nombre@macromet.com.co" className={inputCls}/>
          </div>

          <div>
            <label className={labelCls}>
              {usuario ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
            </label>
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

export default function Usuarios() {
  const { data: usuarios, loading, error, refresh } = useFetch(getUsuarios)
  const { data: roles }                              = useFetch(getRoles)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)
  const [page,   setPage]   = useState(1)

  const handleToggle = async (u) => {
    try {
      await toggleUsuario(u.id_usuario)
      toast.success(u.estado ? 'Usuario desactivado' : 'Usuario activado')
      refresh()
    } catch { toast.error('Error al cambiar estado') }
  }

  if (loading) return <Spinner text="Cargando equipo..."/>
  if (error)   return <EmptyState title="Error" description={error}/>

  const filtrada = (usuarios || []).filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.correo.toLowerCase().includes(search.toLowerCase()) ||
    (u.rol || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.codigo_empleado || '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtrada.length / PAGE_SIZE)
  const lista = filtrada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  const activos   = (usuarios || []).filter(u => u.estado === 1).length
  const inactivos = (usuarios || []).length - activos

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Equipo Macromet</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {usuarios?.length || 0} personas · {activos} activas · {inactivos} inactivas
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Nuevo usuario
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, código o rol…"
          className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {filtrada.length === 0
        ? <EmptyState title="Sin usuarios" description="No hay coincidencias."/>
        : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map((u, i) => (
              <div key={u.id_usuario}
                className={`bg-white dark:bg-slate-800 border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow ${
                  u.estado ? 'border-slate-200 dark:border-slate-700' : 'border-slate-200 dark:border-slate-700 opacity-60'
                }`}>
                <div className="flex items-center justify-between">
                  <div className={`${COLORS[i % COLORS.length]} h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                    {initials(u.nombre)}
                  </div>
                  <div className="flex gap-1">
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
                </div>

                <div>
                  {u.codigo_empleado && (
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold mb-0.5">{u.codigo_empleado}</p>
                  )}
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{u.nombre}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{u.correo}</p>
                </div>

                <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs w-fit">
                  {u.rol || 'Sin rol'}
                </span>

                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700 mt-auto">
                  <div className={`h-1.5 w-1.5 rounded-full ${u.estado ? 'bg-green-500' : 'bg-slate-300'}`}/>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {u.estado
                      ? u.ultimo_login
                        ? `Último acceso: ${new Date(u.ultimo_login).toLocaleDateString('es-CO')}`
                        : 'Sin accesos registrados'
                      : 'Usuario inactivo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )
      }

      {modal && (
        <UsuarioModal
          usuario={modal === 'new' ? null : modal}
          roles={roles || []}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
