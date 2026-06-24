import { useState } from 'react'
import { Plus, Search, Eye, Pencil, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useFetch }      from '../hooks/useFetch'
import { getProyectos, createProyecto, updateProyecto, deleteProyecto } from '../api/proyectos.service'
import { getPedidos }    from '../api/pedidos.service'
import { getUsuarios }   from '../api/usuarios.service'
import { canDo }         from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const prioridadBadge = {
  alta:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  baja:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

const EMPTY_FORM = {
  nombre: '', objetivo: '', prioridad: 'media',
  fecha_inicio: '', fecha_fin_estimada: '',
  id_pedido: '', id_usuario_responsable: '',
}

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

function ProyectoModal({ proyecto, pedidos, usuarios, onClose, onSaved }) {
  const [form, setForm] = useState(proyecto ? {
    nombre:                proyecto.nombre                || '',
    objetivo:              proyecto.objetivo              || '',
    prioridad:             proyecto.prioridad             || 'media',
    fecha_inicio:          proyecto.fecha_inicio?.slice(0,10)          || '',
    fecha_fin_estimada:    proyecto.fecha_fin_estimada?.slice(0,10)    || '',
    id_pedido:             proyecto.id_pedido             || '',
    id_usuario_responsable: proyecto.id_responsable       || '',
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
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">
            {proyecto ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nombre *</label>
            <input name="nombre" value={form.nombre} onChange={handleChange} required
              className={inputCls} placeholder="Ej: Exhibidor Castrol Serie X" />
          </div>

          <div>
            <label className={labelCls}>Objetivo</label>
            <textarea name="objetivo" value={form.objetivo} onChange={handleChange} rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Descripción del objetivo del proyecto" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Prioridad</label>
              <select name="prioridad" value={form.prioridad} onChange={handleChange} className={inputCls}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select name="id_usuario_responsable" value={form.id_usuario_responsable} onChange={handleChange} className={inputCls}>
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
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Fecha límite</label>
              <input type="date" name="fecha_fin_estimada" value={form.fecha_fin_estimada} onChange={handleChange} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Pedido asociado</label>
            <select name="id_pedido" value={form.id_pedido} onChange={handleChange} className={inputCls}>
              <option value="">Sin pedido</option>
              {pedidos.map(p => (
                <option key={p.id_pedido} value={p.id_pedido}>#{p.id_pedido} · {p.cliente}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : proyecto ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Proyectos() {
  const navigate = useNavigate()
  const { data: proyectos, loading, error, refresh } = useFetch(getProyectos)
  const { data: pedidos }   = useFetch(getPedidos)
  const { data: usuarios }  = useFetch(getUsuarios)
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
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Proyectos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{proyectos?.length || 0} proyectos en sistema</p>
        </div>
        {canDo('proyectos', 'crear') && (
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Nuevo proyecto
          </button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o cliente…"
          className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtrados.length === 0
        ? <EmptyState title="Sin proyectos" description="Crea el primer proyecto con el botón de arriba." />
        : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                    <th className="px-6 py-3">Proyecto</th>
                    <th className="px-6 py-3 hidden md:table-cell">Cliente</th>
                    <th className="px-6 py-3">Prioridad</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Responsable</th>
                    <th className="px-6 py-3">Avance</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Entrega</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtrados.map(p => (
                    <tr key={p.id_proyecto} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-800 dark:text-white max-w-[200px] truncate">{p.nombre}</p>
                        {p.objetivo && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{p.objetivo}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {p.cliente || <span className="text-slate-300 dark:text-slate-600 italic">Sin cliente</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${prioridadBadge[p.prioridad]}`}>
                          {p.prioridad}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                        {p.responsable || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 min-w-[60px]">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${p.avance}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">{p.avance}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs hidden lg:table-cell">
                        {p.fecha_fin_estimada
                          ? new Date(p.fecha_fin_estimada).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/proyectos/${p.id_proyecto}`)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors" title="Ver detalle">
                            <Eye size={14} />
                          </button>
                          {canDo('proyectos', 'editar') && (
                            <button onClick={() => setModal(p)}
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                              <Pencil size={14} />
                            </button>
                          )}
                          {canDo('proyectos', 'eliminar') && (
                            <button onClick={() => handleDelete(p)}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

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
