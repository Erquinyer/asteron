import { useState } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, X, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFetch }      from '../hooks/useFetch'
import { getProyectos, createProyecto, updateProyecto, deleteProyecto } from '../api/proyectos.service'
import { getPedidos }    from '../api/pedidos.service'
import { getUsuarios }   from '../api/usuarios.service'
import { canDo }         from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

// ── Helpers ──────────────────────────────────────────────────────────────────
const prioridadCfg = {
  alta:  { dot: 'bg-error',   badge: 'bg-error/10 text-error',     label: 'Alta'  },
  media: { dot: 'bg-warning', badge: 'bg-warning/10 text-warning', label: 'Media' },
  baja:  { dot: 'bg-success', badge: 'bg-success/10 text-success', label: 'Baja'  },
}

const progressColor = (avance) => {
  if (avance >= 80) return 'bg-success'
  if (avance < 35)  return 'bg-warning'
  return 'bg-primary'
}

const initials = (nombre) =>
  (nombre || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

// ── Estilos de formulario ─────────────────────────────────────────────────────
const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

// ── Modal ─────────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  nombre: '', objetivo: '', prioridad: 'media',
  fecha_inicio: '', fecha_fin_estimada: '',
  id_pedido: '', id_usuario_responsable: '',
}

function ProyectoModal({ proyecto, pedidos, usuarios, onClose, onSaved }) {
  const [form, setForm] = useState(proyecto ? {
    nombre:                 proyecto.nombre                || '',
    objetivo:               proyecto.objetivo              || '',
    prioridad:              proyecto.prioridad             || 'media',
    fecha_inicio:           proyecto.fecha_inicio?.slice(0,10)          || '',
    fecha_fin_estimada:     proyecto.fecha_fin_estimada?.slice(0,10)    || '',
    id_pedido:              proyecto.id_pedido             || '',
    id_usuario_responsable: proyecto.id_responsable        || '',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      if (proyecto) {
        await updateProyecto(proyecto.id_proyecto, form)
        toast.success('Proyecto actualizado')
      } else {
        await createProyecto(form)
        toast.success('Proyecto creado')
      }
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
        w-full max-w-lg animate-md-in overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border
          bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <Plus size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
              </h3>
              <p className="text-[12px] text-muted">
                {proyecto ? 'Modifica los datos del proyecto.' : 'Registra una orden de producción.'}
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

        {/* Cuerpo */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre del proyecto *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className={inputCls} placeholder="Ej: Display POP Bavaria Q3" />
          </div>

          <div>
            <label className={labelCls}>Objetivo</label>
            <textarea name="objetivo" value={form.objetivo} onChange={handleChange} rows={2}
              className={`${inputCls} h-auto py-2.5 resize-none`}
              placeholder="Descripción del objetivo" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prioridad</label>
              <select name="prioridad" value={form.prioridad} onChange={handleChange}
                className={inputCls}
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select name="id_usuario_responsable" value={form.id_usuario_responsable}
                onChange={handleChange} className={inputCls}
              >
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha inicio</label>
              <input type="date" name="fecha_inicio" value={form.fecha_inicio}
                onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha límite</label>
              <input type="date" name="fecha_fin_estimada" value={form.fecha_fin_estimada}
                onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pedido asociado</label>
            <select name="id_pedido" value={form.id_pedido} onChange={handleChange}
              className={inputCls}
            >
              <option value="">Sin pedido</option>
              {pedidos.map(p => (
                <option key={p.id_pedido} value={p.id_pedido}>
                  #{p.id_pedido} · {p.cliente}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Pie */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface2">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 bg-primary hover:bg-primary-hover disabled:opacity-50
              text-white rounded-control text-[13px] font-semibold shadow-btn
              transition-colors"
          >
            {saving ? 'Guardando…' : proyecto ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Proyectos() {
  const navigate = useNavigate()
  const { data: proyectos, loading, error, refresh } = useFetch(getProyectos)
  const { data: pedidos }  = useFetch(getPedidos)
  const { data: usuarios } = useFetch(getUsuarios)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    try {
      await deleteProyecto(p.id_proyecto)
      toast.success('Proyecto eliminado')
      refresh()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando proyectos..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const filtrados = (proyectos || []).filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (p.cliente || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Proyectos</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {proyectos?.length || 0} proyectos en sistema
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrar proyectos…"
            className="w-full h-[38px] pl-9 pr-4 bg-surface border border-border
              rounded-control text-[13px] text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
              transition-colors"
          />
        </div>

        {/* Filtro placeholder */}
        <button className="h-[38px] flex items-center gap-2 px-3 bg-surface border border-border
          rounded-control text-[13px] text-muted hover:bg-hover hover:text-ink transition-colors"
        >
          <Filter size={14} />
          Prioridad
        </button>

        <div className="flex-1" />

        {/* Botón primario */}
        {canDo('proyectos', 'crear') && (
          <button onClick={() => setModal('new')}
            className="h-[38px] flex items-center gap-2 px-4 bg-primary hover:bg-primary-hover
              text-white text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} />
            Nuevo proyecto
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      {filtrados.length === 0 ? (
        <EmptyState title="Sin proyectos" description="Crea el primer proyecto con el botón de arriba." />
      ) : (
        <div className="bg-surface border border-border rounded-card shadow-card
          dark:shadow-card-dk overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface2 border-b border-border">
                  {['Proyecto', 'Cliente', 'Prioridad', 'Responsable', 'Avance', 'Entrega', ''].map((h, i) => (
                    <th key={i}
                      className={`px-[18px] py-[13px] text-left font-mono text-[10.5px]
                        font-semibold uppercase tracking-[.08em] text-faint
                        ${i >= 3 && i <= 5 ? 'hidden lg:table-cell' : ''}
                        ${i === 1 ? 'hidden md:table-cell' : ''}
                      `}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtrados.map(p => {
                  const pCfg = prioridadCfg[p.prioridad] || prioridadCfg.baja
                  return (
                    <tr key={p.id_proyecto}
                      className="hover:bg-hover transition-colors duration-100"
                    >
                      {/* Proyecto */}
                      <td className="px-[18px] py-[13px]">
                        <p className="text-[13.5px] font-medium text-ink truncate max-w-[200px]">
                          {p.nombre}
                        </p>
                        {p.objetivo && (
                          <p className="font-mono text-[10.5px] text-faint truncate max-w-[200px] mt-0.5">
                            {p.objetivo}
                          </p>
                        )}
                      </td>

                      {/* Cliente */}
                      <td className="px-[18px] py-[13px] text-[13px] text-muted hidden md:table-cell">
                        {p.cliente || <span className="text-faint italic">Sin cliente</span>}
                      </td>

                      {/* Prioridad */}
                      <td className="px-[18px] py-[13px]">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
                          font-semibold px-[9px] py-[5px] rounded-badge ${pCfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pCfg.dot}`} />
                          {pCfg.label}
                        </span>
                      </td>

                      {/* Responsable */}
                      <td className="px-[18px] py-[13px] hidden lg:table-cell">
                        {p.responsable ? (
                          <div className="flex items-center gap-2">
                            <div className="w-[26px] h-[26px] rounded-badge shrink-0
                              bg-primary/10 text-primary text-[10px] font-bold
                              flex items-center justify-center"
                            >
                              {initials(p.responsable)}
                            </div>
                            <span className="text-[13px] text-muted truncate max-w-[90px]">
                              {p.responsable.split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-faint text-[13px]">—</span>
                        )}
                      </td>

                      {/* Avance */}
                      <td className="px-[18px] py-[13px] hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-surface2 min-w-[60px]">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500
                                ${progressColor(p.avance)}`}
                              style={{ width: `${p.avance}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-muted w-8 text-right tabular-nums">
                            {p.avance}%
                          </span>
                        </div>
                      </td>

                      {/* Entrega */}
                      <td className="px-[18px] py-[13px] hidden lg:table-cell">
                        <span className="font-mono text-[12px] text-muted">
                          {p.fecha_fin_estimada
                            ? new Date(p.fecha_fin_estimada).toLocaleDateString('es-CO', {
                                day: '2-digit', month: 'short',
                              })
                            : '—'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-[18px] py-[13px]">
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => navigate(`/proyectos/${p.id_proyecto}`)}
                            title="Ver detalle"
                            className="w-7 h-7 flex items-center justify-center rounded-badge
                              text-faint hover:bg-surface2 hover:text-primary transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {canDo('proyectos', 'editar') && (
                            <button
                              onClick={() => setModal(p)}
                              title="Editar"
                              className="w-7 h-7 flex items-center justify-center rounded-badge
                                text-faint hover:bg-surface2 hover:text-primary transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canDo('proyectos', 'eliminar') && (
                            <button
                              onClick={() => handleDelete(p)}
                              title="Eliminar"
                              className="w-7 h-7 flex items-center justify-center rounded-badge
                                text-faint hover:bg-error/10 hover:text-error transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <ProyectoModal
          proyecto={modal === 'new' ? null : modal}
          pedidos={pedidos || []}
          usuarios={usuarios || []}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
