import { useState } from 'react'
import { Plus, Search, Trash2, Wrench, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getMantenimientos, createMantenimiento, deleteMantenimiento } from '../api/mantenimientos.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const tipoCfg = {
  preventivo: { label: 'Preventivo', style: 'bg-blue-100 text-blue-700',   icon: <CheckCircle  size={13}/> },
  correctivo: { label: 'Correctivo', style: 'bg-red-100 text-red-600',     icon: <AlertTriangle size={13}/> },
  calibracion:{ label: 'Calibración',style: 'bg-purple-100 text-purple-700', icon: <Wrench size={13}/> },
}

const EMPTY = { id_maquina: '', fecha: new Date().toISOString().split('T')[0], tipo: 'preventivo', descripcion: '' }

function MantenimientoModal({ maquinas, onClose, onSaved }) {
  const [form, setForm]    = useState(EMPTY)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Registrar mantenimiento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Equipo *</label>
            <select name="id_maquina" value={form.id_maquina} onChange={set} required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
              <input type="date" name="fecha" value={form.fecha} onChange={set}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
              <select name="tipo" value={form.tipo} onChange={set}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="calibracion">Calibración</option>
              </select>
            </div>
          </div>

          {form.tipo === 'correctivo' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0"/>
              <p className="text-xs text-amber-700">El equipo quedará marcado como <strong>en mantenimiento</strong> automáticamente.</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción / Trabajo realizado</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={3}
              placeholder="Detalle del trabajo realizado o a realizar"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"/>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 rounded-lg py-2 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Mantenimientos() {
  const { data, loading, error, refresh } = useFetch(getMantenimientos)
  const { data: maquinas }                = useFetch(getMaquinaria)
  const [search,    setSearch]    = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')
  const [showModal, setShowModal] = useState(false)

  const handleDelete = async (m) => {
    if (!confirm('¿Eliminar este registro de mantenimiento?')) return
    try {
      await deleteMantenimiento(m.id_mantenimiento)
      toast.success('Registro eliminado')
      refresh()
    } catch { toast.error('Error al eliminar') }
  }

  if (loading) return <Spinner text="Cargando mantenimientos..."/>
  if (error)   return <EmptyState title="Error" description={error}/>

  const lista = (data || []).filter(m => {
    const matchTipo = tipoFilter === 'todos' || m.tipo === tipoFilter
    const matchText = (m.maquina || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.tecnico || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.descripcion || '').toLowerCase().includes(search.toLowerCase())
    return matchTipo && matchText
  })

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Mantenimientos</h1>
          <p className="text-sm text-slate-500">{data?.length || 0} registros en historial</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Registrar mantenimiento
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por equipo, técnico…"
            className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-2">
          {['todos','preventivo','correctivo','calibracion'].map(t => (
            <button key={t} onClick={() => setTipoFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                tipoFilter === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}>
              {t === 'todos' ? 'Todos' : tipoCfg[t]?.label || t}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0
        ? <EmptyState title="Sin registros" description="Registra el primer mantenimiento con el botón de arriba."/>
        : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wide text-left">
                    <th className="px-6 py-3">Equipo</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3 hidden md:table-cell">Descripción</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Técnico</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.map(m => {
                    const cfg = tipoCfg[m.tipo] || tipoCfg.preventivo
                    return (
                      <tr key={m.id_mantenimiento} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800">{m.maquina}</p>
                          {m.maquina_codigo && <p className="text-xs font-mono text-slate-400">{m.maquina_codigo}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${cfg.style}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 hidden md:table-cell max-w-[240px]">
                          <p className="truncate">{m.descripcion || '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 hidden lg:table-cell">{m.tecnico || '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(m.fecha).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleDelete(m)}
                            className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

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
