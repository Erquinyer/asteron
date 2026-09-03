import { useState } from 'react'
import { Plus, Search, Trash2, Wrench, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getMantenimientos, createMantenimiento, deleteMantenimiento } from '../api/mantenimientos.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import { canDo }             from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const tipoCfg = {
  preventivo: {
    label: 'Preventivo', badge: 'bg-primary/10 text-primary',    dot: 'bg-primary',
    Icon: CheckCircle,
  },
  correctivo: {
    label: 'Correctivo', badge: 'bg-error/10 text-error',        dot: 'bg-error',
    Icon: AlertTriangle,
  },
  calibracion: {
    label: 'Calibración', badge: 'bg-secondary/10 text-secondary', dot: 'bg-secondary',
    Icon: Wrench,
  },
}

const TIPOS = ['todos', 'preventivo', 'correctivo', 'calibracion']

const EMPTY = {
  id_maquina: '', fecha: new Date().toISOString().split('T')[0],
  tipo: 'preventivo', descripcion: '',
}

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

function MantenimientoModal({ maquinas, onClose, onSaved }) {
  const [form, setForm]     = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.id_maquina) { toast.error('Selecciona un equipo'); return }
    setSaving(true)
    try {
      await createMantenimiento(form)
      toast.success('Mantenimiento registrado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-md my-4 overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10
              flex items-center justify-center shrink-0"
            >
              <Wrench size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Registrar mantenimiento</h3>
              <p className="text-[12px] text-muted">Historial de intervención de equipo</p>
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
            <label className={labelCls}>Equipo *</label>
            <select name="id_maquina" value={form.id_maquina}
              onChange={set} required className={inputCls}
            >
              <option value="">Seleccionar equipo</option>
              {maquinas.map(m => (
                <option key={m.id_maquina} value={m.id_maquina}>
                  {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha *</label>
              <input type="date" name="fecha" value={form.fecha}
                onChange={set} className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={set} className={inputCls}>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="calibracion">Calibración</option>
              </select>
            </div>
          </div>

          {form.tipo === 'correctivo' && (
            <div className="flex items-start gap-2.5 p-3.5
              bg-warning/8 border border-warning/25 rounded-[10px]"
            >
              <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
              <p className="text-[12.5px] text-warning">
                El equipo quedará marcado como <strong>en mantenimiento</strong> automáticamente.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>Descripción / Trabajo realizado</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={3}
              placeholder="Detalle del trabajo realizado o a realizar"
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
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function Mantenimientos() {
  const { data, loading, error, refresh } = useFetch(getMantenimientos)
  const { data: maquinas }                = useFetch(getMaquinaria)
  const [search,     setSearch]     = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [showModal,  setShowModal]  = useState(false)

  const handleDelete = async (m) => {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return
    try {
      await deleteMantenimiento(m.id_mantenimiento)
      toast.success('Registro eliminado')
      refresh()
    } catch { toast.error('Error al eliminar') }
  }

  if (loading) return <Spinner text="Cargando mantenimientos..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const lista = (data || []).filter(m => {
    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter
    const matchText = (m.maquina     || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.tecnico     || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.descripcion || '').toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchText
  })

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Mantenimientos</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {data?.length || 0} registros en historial
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por equipo, técnico…"
            className="w-full h-[38px] pl-9 pr-4 border border-border rounded-control
              text-[13px] bg-surface2 text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
              transition-colors"
          />
        </div>

        {/* Filtros de tipo */}
        <div className="flex gap-1.5">
          {TIPOS.map(t => {
            const cfg = tipoCfg[t]
            const isActive = tipoFilter === t
            return (
              <button key={t} onClick={() => setTipoFilter(t)}
                className={`h-[38px] px-3.5 rounded-control text-[12px] font-medium
                  border capitalize transition-colors
                  ${isActive
                    ? 'bg-primary text-white border-primary shadow-btn'
                    : 'border-border text-muted bg-surface hover:bg-hover hover:text-ink'
                  }`}
              >
                {t === 'todos' ? 'Todos' : cfg?.label || t}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {canDo('mantenimientos', 'crear') && (
          <button onClick={() => setShowModal(true)}
            className="h-[38px] flex items-center gap-2 px-4
              bg-primary hover:bg-primary-hover text-white
              text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} /> Registrar mantenimiento
          </button>
        )}
      </div>

      {/* Tabla */}
      {lista.length === 0 ? (
        <EmptyState
          title="Sin registros"
          description="Registra el primer mantenimiento con el botón de arriba."
        />
      ) : (
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card dark:shadow-card-dk">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface2 border-b border-border">
                  {['Equipo', 'Tipo', 'Descripción', 'Técnico', 'Fecha', ''].map((h, i) => (
                    <th key={i}
                      className={`px-5 py-3 text-left font-mono text-[10.5px] font-semibold
                        uppercase tracking-[.06em] text-faint
                        ${i === 2 ? 'hidden md:table-cell' : ''}
                        ${i === 3 ? 'hidden lg:table-cell' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map(m => {
                  const cfg = tipoCfg[m.tipo] || tipoCfg.preventivo
                  const IconComp = cfg.Icon
                  return (
                    <tr key={m.id_mantenimiento}
                      className="hover:bg-hover transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[13.5px] font-medium text-ink">{m.maquina}</p>
                        {m.maquina_codigo && (
                          <p className="font-mono text-[11px] text-faint">{m.maquina_codigo}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 font-mono
                          text-[11px] font-semibold px-2.5 py-[5px] rounded-badge ${cfg.badge}`}
                        >
                          <IconComp size={11} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted hidden md:table-cell max-w-[240px]">
                        <p className="truncate">{m.descripcion || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted hidden lg:table-cell">
                        {m.tecnico || '—'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11.5px] text-faint">
                        {new Date(m.fecha).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3.5">
                        {canDo('mantenimientos', 'eliminar') && (
                          <button onClick={() => handleDelete(m)}
                            className="w-7 h-7 flex items-center justify-center rounded-badge
                              text-faint hover:bg-error/10 hover:text-error transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <MantenimientoModal
          maquinas={maquinas || []}
          onClose={() => setShowModal(false)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
