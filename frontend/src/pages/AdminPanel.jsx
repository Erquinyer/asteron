import { useState, useEffect, useCallback } from 'react'
import {
  Shield, Users, Tag, Lock, AlertCircle,
  Plus, Pencil, Trash2, X, Eye, EyeOff, Search, UserCheck, UserX,
} from 'lucide-react'
import {
  getUsuariosAdmin, createUsuarioAdmin, updateUsuarioAdmin,
  toggleUsuarioAdmin,
  getRoles, createRol, updateRol, deleteRol,
} from '../api/admin.service'
import Spinner from '../components/ui/Spinner'
import toast from 'react-hot-toast'
import { usePermisosDraft, ROL_INMUTABLE, MODULE_ORDER } from '../hooks/usePermisosDraft'
import { getAcciones } from '../api/admin.service'
import RoleSidebar from '../components/admin/RoleSidebar'
import PermissionsMatrix from '../components/admin/PermissionsMatrix'
import PermisosDraftBar from '../components/admin/PermisosDraftBar'

// ─── constantes ───────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-primary/15',    text: 'text-primary'   },
  { bg: 'bg-secondary/15',  text: 'text-secondary'  },
  { bg: 'bg-success/15',    text: 'text-success'    },
  { bg: 'bg-warning/15',    text: 'text-warning'    },
  { bg: 'bg-error/15',      text: 'text-error'      },
  { bg: 'bg-violet-500/15', text: 'text-violet-500' },
  { bg: 'bg-pink-500/15',   text: 'text-pink-500'   },
  { bg: 'bg-cyan-500/15',   text: 'text-cyan-500'   },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-500' },
]
const initials = n => (n || '?').split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

// ─── Tab 1: Permisos unificados ───────────────────────────────────
function PermisosUnificados({ focusRoleId, onFocusConsumed, onDirtyChange }) {
  const {
    loading, saving, roles,
    setLevel, toggleAction, applyTemplate, copyFromRole,
    undo, discard, save, canUndo, changeCount, isModuleDirty,
  } = usePermisosDraft()

  const [rolesMeta, setRolesMeta] = useState({}) // { [id_rol]: total_usuarios } — desde /admin/roles
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    getRoles().then(({ data }) => {
      const meta = {}
      data.forEach(r => { meta[r.id_rol] = r.total_usuarios })
      setRolesMeta(meta)
    }).catch(() => {})
  }, [])

  useEffect(() => { onDirtyChange?.(changeCount) }, [changeCount, onDirtyChange])

  // Selección solicitada desde otra pestaña (Usuarios/Roles → "ver permisos de este rol")
  useEffect(() => {
    if (focusRoleId && roles?.[focusRoleId]) {
      setSelectedIds([focusRoleId])
      onFocusConsumed?.()
    }
  }, [focusRoleId, roles, onFocusConsumed])

  if (loading || !roles) return <Spinner text="Cargando permisos..." />

  const roleList = Object.values(roles)
    .sort((a, b) => a.id_rol - b.id_rol)
    .map(r => ({ ...r, total_usuarios: rolesMeta[r.id_rol] }))

  const selectedRoles = selectedIds
    .map(id => roles[id])
    .filter(Boolean)

  const handleSelect = (id, additive) => {
    setSelectedIds(prev => {
      if (!additive) return [id]
      return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Permisos por Rol</h2>
          <p className="text-[12.5px] text-muted mt-0.5">
            Selecciona uno o más roles y configura el nivel de acceso por módulo.
            Los cambios aplican en el próximo inicio de sesión.
          </p>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-faint
          bg-surface2 border border-border rounded-control px-3 py-1.5"
        >
          <Lock size={11} /> Administrador Sistema es inmutable
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <RoleSidebar roles={roleList} selectedIds={selectedIds} onSelect={handleSelect} />
        <PermissionsMatrix
          selectedRoles={selectedRoles}
          allRoles={roleList}
          onSetLevel={setLevel}
          onToggleAction={toggleAction}
          onApplyTemplate={(t) => applyTemplate(selectedIds, t)}
          onCopyFromRole={(sourceId) => copyFromRole(sourceId, selectedIds)}
          isModuleDirty={(roleIds, modulo) => isModuleDirty(roleIds, modulo)}
        />
      </div>

      <PermisosDraftBar
        changeCount={changeCount}
        canUndo={canUndo}
        saving={saving}
        isInmutableOnly={selectedRoles.length > 0 && selectedRoles.every(r => r.nombre === ROL_INMUTABLE)}
        onUndo={undo}
        onDiscard={discard}
        onSave={save}
      />
    </div>
  )
}

// ─── Modal de usuario ─────────────────────────────────────────────
const EMPTY_USER = { codigo_empleado: '', nombre: '', correo: '', password: '', id_rol: '', estado: 1 }

function UsuarioModal({ usuario, roles, onClose, onSaved }) {
  const [form,     setForm]     = useState(usuario ? {
    codigo_empleado: usuario.codigo_empleado || '',
    nombre:   usuario.nombre   || '',
    correo:   usuario.correo   || '',
    password: '',
    id_rol:   usuario.id_rol   || '',
    estado:   usuario.estado   ?? 1,
  } : EMPTY_USER)
  const [showPass, setShowPass] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.correo.trim()) {
      toast.error('Nombre y correo son obligatorios'); return
    }
    if (!usuario && !form.password) {
      toast.error('La contraseña es obligatoria para usuarios nuevos'); return
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-md overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10
              flex items-center justify-center shrink-0"
            >
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {usuario ? 'Editar usuario' : 'Nuevo usuario'}
              </h3>
              <p className="text-[12px] text-muted">
                {usuario ? usuario.nombre : 'Registrar acceso al sistema'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px]
              bg-surface2 text-faint hover:text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Código empleado</label>
              <input name="codigo_empleado" value={form.codigo_empleado} onChange={set}
                placeholder="Auto (EMP-XXX)"
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Nombre completo *</label>
              <input name="nombre" value={form.nombre} onChange={set}
                placeholder="Ej: Alejandro Acuña" className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Correo electrónico *</label>
            <input name="correo" type="email" value={form.correo} onChange={set}
              placeholder="nombre@macromet.com.co" className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              {usuario ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}
            </label>
            <div className="relative">
              <input name="password" type={showPass ? 'text' : 'password'}
                value={form.password} onChange={set}
                placeholder={usuario ? '••••••••' : 'Mínimo 6 caracteres'}
                className={`${inputCls} pr-10`}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                  text-faint hover:text-muted transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Rol</label>
              <select name="id_rol" value={form.id_rol} onChange={set} className={inputCls}>
                <option value="">Sin rol</option>
                {roles.map(r => (
                  <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                ))}
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
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface2">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 bg-primary hover:bg-primary-hover
              disabled:opacity-50 text-white rounded-control text-[13px]
              font-semibold shadow-btn transition-colors"
          >
            {saving ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Gestión de Usuarios ───────────────────────────────────
function GestionUsuarios({ onNavigateToRole }) {
  const [usuarios, setUsuarios] = useState(null)
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [{ data: u }, { data: r }] = await Promise.all([getUsuariosAdmin(), getRoles()])
      setUsuarios(u); setRoles(r)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const handleToggle = async u => {
    if (u.codigo_empleado === 'EMP-000') {
      toast.error('No se puede desactivar el Administrador Sistema'); return
    }
    setUsuarios(prev => prev.map(x =>
      x.id_usuario === u.id_usuario ? { ...x, estado: x.estado ? 0 : 1 } : x))
    try {
      await toggleUsuarioAdmin(u.id_usuario)
      toast.success(u.estado ? 'Usuario desactivado' : 'Usuario activado')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error'); load()
    }
  }

  if (loading) return <Spinner text="Cargando usuarios..." />

  const filtrados = (usuarios || []).filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (u.correo         || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.codigo_empleado|| '').toLowerCase().includes(search.toLowerCase()) ||
    (u.rol            || '').toLowerCase().includes(search.toLowerCase()))

  const activos   = (usuarios || []).filter(u => u.estado === 1).length
  const inactivos = (usuarios || []).length - activos

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Gestión de Usuarios</h2>
          <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
            {usuarios?.length || 0} usuarios · {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="h-[38px] flex items-center gap-2 px-4
            bg-primary hover:bg-primary-hover text-white
            text-[13px] font-semibold rounded-control shadow-btn transition-colors"
        >
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, correo, rol…"
          className="w-full h-[38px] pl-9 pr-4 border border-border rounded-control
            text-[13px] bg-surface2 text-ink placeholder:text-faint
            focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
            transition-colors"
        />
      </div>

      <div className="border border-border rounded-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface2 border-b border-border">
              {['Usuario', 'Correo', 'Código', 'Rol', 'Estado', ''].map((h, i) => (
                <th key={i}
                  className={`px-4 py-3 text-left font-mono text-[10.5px] font-semibold
                    uppercase tracking-[.06em] text-faint
                    ${i === 1 ? 'hidden sm:table-cell' : ''}
                    ${i === 2 ? 'hidden md:table-cell' : ''}
                    ${i === 4 ? 'text-center' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((u, i) => {
              const isAdminUser = u.codigo_empleado === 'EMP-000'
              const av = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <tr key={u.id_usuario}
                  className={`border-b border-border last:border-0 transition-colors
                    ${isAdminUser
                      ? 'bg-primary/[.03]'
                      : u.estado
                        ? 'hover:bg-hover'
                        : 'opacity-60'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-8 w-8 rounded-[8px] flex items-center justify-center
                        text-[10px] font-bold shrink-0 ${av.bg} ${av.text}`}
                      >
                        {initials(u.nombre)}
                      </div>
                      <span className="text-[13px] font-medium text-ink">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted hidden sm:table-cell">
                    {u.correo}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-[11px] text-primary">{u.codigo_empleado}</span>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-muted">
                    {isAdminUser ? (
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Lock size={11} />{u.rol}
                      </span>
                    ) : u.rol ? (
                      <button
                        onClick={() => onNavigateToRole?.(u.id_rol)}
                        className="text-muted hover:text-primary hover:underline transition-colors"
                        title="Ver permisos de este rol"
                      >
                        {u.rol}
                      </button>
                    ) : (
                      <span className="text-faint">Sin rol</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
                      font-semibold px-2.5 py-[5px] rounded-badge
                      ${u.estado
                        ? 'bg-success/10 text-success'
                        : 'bg-surface2 text-faint border border-border'}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full
                        ${u.estado ? 'bg-success' : 'bg-faint'}`}
                      />
                      {u.estado ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isAdminUser && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setModal(u)}
                          className="w-7 h-7 flex items-center justify-center rounded-badge
                            text-faint hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleToggle(u)}
                          className={`w-7 h-7 flex items-center justify-center rounded-badge
                            text-faint transition-colors
                            ${u.estado
                              ? 'hover:bg-error/10 hover:text-error'
                              : 'hover:bg-success/10 hover:text-success'}`}
                          title={u.estado ? 'Desactivar' : 'Activar'}
                        >
                          {u.estado ? <UserX size={13} /> : <UserCheck size={13} />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[13px] text-faint">
                  Sin resultados
                </td>
              </tr>
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

// ─── Modal de rol ─────────────────────────────────────────────────
function RolModal({ rol, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre:      rol?.nombre      || '',
    descripcion: rol?.descripcion || '',
  })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-sm overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10
              flex items-center justify-center shrink-0"
            >
              <Tag size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {rol ? 'Editar rol' : 'Nuevo rol'}
              </h3>
              <p className="text-[12px] text-muted">
                {rol ? rol.nombre : 'Definir un nuevo rol de acceso'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px]
              bg-surface2 text-faint hover:text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre del rol *</label>
            <input name="nombre" value={form.nombre} onChange={set}
              placeholder="Ej: Coordinador de Calidad"
              className={inputCls} autoFocus
            />
          </div>
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={3}
              placeholder="Describe las responsabilidades de este rol"
              className={`${inputCls} h-auto py-2.5 resize-none`}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface2">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 bg-primary hover:bg-primary-hover
              disabled:opacity-50 text-white rounded-control text-[13px]
              font-semibold shadow-btn transition-colors"
          >
            {saving ? 'Guardando…' : rol ? 'Guardar cambios' : 'Crear rol'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 3: Gestión de Roles ──────────────────────────────────────
function GestionRoles({ onNavigateToRole }) {
  const [roles,   setRoles]   = useState(null)
  const [accesoByRol, setAccesoByRol] = useState({}) // { [id_rol]: nº de módulos con acceso }
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [{ data: rolesData }, { data: permisosData }] = await Promise.all([getRoles(), getAcciones()])
      setRoles(rolesData)
      const acceso = {}
      permisosData.roles.forEach(r => { acceso[r.id_rol] = r.modulos.length })
      setAccesoByRol(acceso)
    } catch { toast.error('Error al cargar roles') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const handleDelete = async rol => {
    if (rol.nombre === 'Administrador Sistema') {
      toast.error('No se puede eliminar este rol'); return
    }
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
          <h2 className="text-[15px] font-semibold text-ink">Roles del Sistema</h2>
          <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
            {roles?.length || 0} roles definidos
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="h-[38px] flex items-center gap-2 px-4
            bg-primary hover:bg-primary-hover text-white
            text-[13px] font-semibold rounded-control shadow-btn transition-colors"
        >
          <Plus size={15} /> Nuevo rol
        </button>
      </div>

      <div className="border border-border rounded-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface2 border-b border-border">
              {['Rol', 'Descripción', 'Acceso', 'Usuarios', ''].map((h, i) => (
                <th key={i}
                  className={`px-5 py-3 text-left font-mono text-[10.5px] font-semibold
                    uppercase tracking-[.06em] text-faint
                    ${i === 1 ? 'hidden md:table-cell' : ''}
                    ${i === 2 ? 'hidden lg:table-cell' : ''}
                    ${i === 3 ? 'text-center' : ''}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(roles || []).map((rol, i) => {
              const isAdmin = rol.nombre === 'Administrador Sistema'
              const av = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <tr key={rol.id_rol}
                  className={`border-b border-border last:border-0 transition-colors
                    ${isAdmin ? 'bg-primary/[.03]' : 'hover:bg-hover'}`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-7 w-7 rounded-[8px] flex items-center justify-center
                        text-[11px] font-bold shrink-0 ${av.bg} ${av.text}`}
                      >
                        {(rol.nombre[0] || '?').toUpperCase()}
                      </div>
                      <p className={`text-[13px] font-semibold
                        ${isAdmin ? 'text-primary' : 'text-ink'}`}
                      >
                        {rol.nombre}
                        {isAdmin && <Lock size={11} className="inline ml-1.5 opacity-60" />}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[12.5px] text-muted hidden md:table-cell max-w-xs">
                    <p className="line-clamp-2">
                      {rol.descripcion || (
                        <span className="text-faint italic">Sin descripción</span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-1.5 rounded-full bg-surface2">
                        <div className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${((accesoByRol[rol.id_rol] ?? 0) / MODULE_ORDER.length) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10.5px] text-faint tabular-nums shrink-0">
                        {accesoByRol[rol.id_rol] ?? 0}/{MODULE_ORDER.length}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center gap-1 font-mono text-[11px]
                      font-semibold px-2.5 py-[5px] rounded-badge
                      ${Number(rol.total_usuarios) > 0
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface2 text-faint border border-border'}`}
                    >
                      <Users size={11} />
                      {rol.total_usuarios}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => onNavigateToRole?.(rol.id_rol)}
                        className="w-7 h-7 flex items-center justify-center rounded-badge
                          text-faint hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Configurar permisos"
                      >
                        <Shield size={13} />
                      </button>
                      {!isAdmin && (
                        <>
                          <button onClick={() => setModal(rol)}
                            className="w-7 h-7 flex items-center justify-center rounded-badge
                              text-faint hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(rol)}
                            disabled={Number(rol.total_usuarios) > 0}
                            className="w-7 h-7 flex items-center justify-center rounded-badge
                              text-faint hover:bg-error/10 hover:text-error
                              disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-faint">
        <Lock size={11} />
        Los roles con usuarios asignados no pueden eliminarse.
        Reasigna sus usuarios desde la pestaña Usuarios.
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

// ─── Página principal ─────────────────────────────────────────────
const TABS = [
  { id: 'permisos', label: 'Permisos', icon: Shield },
  { id: 'usuarios', label: 'Usuarios', icon: Users  },
  { id: 'roles',    label: 'Roles',    icon: Tag    },
]

export default function AdminPanel() {
  const [tab, setTab] = useState('permisos')
  const [focusRoleId, setFocusRoleId] = useState(null)
  const [permisosDirty, setPermisosDirty] = useState(0)

  const navigateToRole = (id_rol) => { setFocusRoleId(id_rol); setTab('permisos') }

  const changeTab = (nextTab) => {
    if (tab === 'permisos' && nextTab !== 'permisos' && permisosDirty > 0) {
      const ok = confirm(`Tienes ${permisosDirty} cambio(s) sin guardar en Permisos. ¿Salir sin guardar?`)
      if (!ok) return
    }
    setTab(nextTab)
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-[11px] bg-primary flex items-center justify-center shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-ink">Panel de Administración</h1>
          <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
            Permisos · Usuarios · Roles
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[11px]
          text-warning bg-warning/8 border border-warning/25 rounded-control px-3 py-1.5"
        >
          <AlertCircle size={13} />
          Acceso exclusivo · Administrador Sistema
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface2 border border-border rounded-[12px] w-fit">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button key={t.id} onClick={() => changeTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[9px]
                text-[13px] font-medium transition-all
                ${isActive
                  ? 'bg-surface text-ink shadow-sm border border-border'
                  : 'text-muted hover:text-ink hover:bg-hover'}`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel de contenido */}
      <div className="bg-surface border border-border rounded-card shadow-card
        dark:shadow-card-dk p-6"
      >
        {tab === 'permisos' && (
          <PermisosUnificados
            focusRoleId={focusRoleId}
            onFocusConsumed={() => setFocusRoleId(null)}
            onDirtyChange={setPermisosDirty}
          />
        )}
        {tab === 'usuarios' && <GestionUsuarios onNavigateToRole={navigateToRole} />}
        {tab === 'roles'    && <GestionRoles onNavigateToRole={navigateToRole} />}
      </div>
    </div>
  )
}
