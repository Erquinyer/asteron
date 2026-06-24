import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Wrench, Cpu, Zap, X } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getMaquinaria, createMaquina, updateMaquina, deleteMaquina } from '../api/maquinaria.service'
import { canDo }       from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import toast      from 'react-hot-toast'

const PAGE_SIZE = 10

const estadoConfig = {
  activa:           { label: 'Activa',           style: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'   },
  inactiva:         { label: 'Inactiva',          style: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'   },
  en_mantenimiento: { label: 'En mantenimiento',  style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'   },
  sin_asignar:      { label: 'Sin asignar',       style: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300'     },
  guardada:         { label: 'Guardada',          style: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' },
  dado_de_baja:     { label: 'Dado de baja',      style: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'       },
}

const categoriaIcon  = { maquinaria_pesada: <Wrench size={15}/>, equipo_mig: <Zap size={15}/>, herramienta_electrica: <Cpu size={15}/> }
const categoriaLabel = { maquinaria_pesada: 'Maquinaria pesada', equipo_mig: 'Equipo MIG', herramienta_electrica: 'Herramienta eléctrica' }
const CATEGORIAS     = ['todas','maquinaria_pesada','equipo_mig','herramienta_electrica']

const EMPTY_FORM = {
  nombre: '', codigo: '', categoria: 'maquinaria_pesada',
  marca: '', referencia: '', serial: '', descripcion: '', ubicacion: '', estado: 'activa',
}

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

function MaquinaModal({ maquina, onClose, onSaved }) {
  const [form, setForm] = useState(maquina ? {
    nombre:      maquina.nombre      || '',
    codigo:      maquina.codigo      || '',
    categoria:   maquina.categoria   || 'maquinaria_pesada',
    marca:       maquina.marca       || '',
    referencia:  maquina.referencia  || '',
    serial:      maquina.serial      || '',
    descripcion: maquina.descripcion || '',
    ubicacion:   maquina.ubicacion   || '',
    estado:      maquina.estado      || 'activa',
  } : EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      maquina ? await updateMaquina(maquina.id_maquina, form) : await createMaquina(form)
      toast.success(maquina ? 'Equipo actualizado' : 'Equipo creado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const field = (name, label, placeholder = '') => (
    <div key={name}>
      <label className={labelCls}>{label}</label>
      <input name={name} value={form[name]} onChange={set} placeholder={placeholder} className={inputCls}/>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{maquina ? 'Editar equipo' : 'Nuevo equipo'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('nombre', 'Nombre *', 'Ej: Equipo MIG')}
            {field('codigo', 'Código',   'Ej: EM-07')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Categoría</label>
              <select name="categoria" value={form.categoria} onChange={set} className={inputCls}>
                <option value="maquinaria_pesada">Maquinaria pesada</option>
                <option value="equipo_mig">Equipo MIG</option>
                <option value="herramienta_electrica">Herramienta eléctrica</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="estado" value={form.estado} onChange={set} className={inputCls}>
                {Object.entries(estadoConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('marca',      'Marca',      'Ej: ESAB')}
            {field('referencia', 'Referencia', 'Ej: Smashweld 257')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('serial',   'Serial',    'Ej: F1002540')}
            {field('ubicacion','Ubicación', 'Ej: PUESTO 3')}
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={2}
              placeholder="Descripción breve del equipo"
              className={`${inputCls} resize-none`}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : maquina ? 'Guardar cambios' : 'Crear equipo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Maquinaria() {
  const { data, loading, error, refresh } = useFetch(getMaquinaria)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('todas')
  const [modal,     setModal]     = useState(null)
  const [page,      setPage]      = useState(1)

  const handleDelete = async (m) => {
    if (!confirm(`¿Eliminar "${m.nombre} (${m.codigo})"?`)) return
    try {
      await deleteMaquina(m.id_maquina)
      toast.success('Equipo eliminado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando inventario..."/>
  if (error)   return <EmptyState title="Error" description={error}/>

  const filtrada = (data || []).filter(m => {
    const matchCat  = catFilter === 'todas' || m.categoria === catFilter
    const matchText = m.nombre.toLowerCase().includes(search.toLowerCase()) ||
                      (m.codigo || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.marca  || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  })
  const totalPages = Math.ceil(filtrada.length / PAGE_SIZE)
  const lista = filtrada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val); setPage(1) }
  const handleCat    = (cat) => { setCatFilter(cat); setPage(1) }

  const activas = (data || []).filter(m => m.estado === 'activa').length
  const mantto  = (data || []).filter(m => m.estado === 'en_mantenimiento').length

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Maquinaria e inventario</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.length || 0} equipos · {activas} activos · {mantto} en mantenimiento
          </p>
        </div>
        {canDo('maquinaria', 'crear') && (
          <button onClick={() => setModal('new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16}/> Nuevo equipo
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, código o marca…"
            className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map(cat => (
            <button key={cat} onClick={() => handleCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                catFilter === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>
              {cat === 'todas' ? 'Todas' : categoriaLabel[cat]}
            </button>
          ))}
        </div>
      </div>

      {filtrada.length === 0
        ? <EmptyState title="Sin equipos" description="No hay equipos que coincidan con los filtros."/>
        : (
          <>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Equipo</th>
                    <th className="px-6 py-3 hidden md:table-cell">Categoría</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Marca / Ref.</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Ubicación</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lista.map(m => {
                    const cfg = estadoConfig[m.estado] || estadoConfig.inactiva
                    return (
                      <tr key={m.id_maquina} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{m.codigo || '—'}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-800 dark:text-white">{m.nombre}</p>
                          {m.descripcion && <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">{m.descripcion}</p>}
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            {categoriaIcon[m.categoria]}
                            <span className="text-xs">{categoriaLabel[m.categoria] || m.categoria}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">
                          {m.marca || '—'}{m.referencia ? ` · ${m.referencia}` : ''}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs hidden lg:table-cell">{m.ubicacion || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.style}`}>{cfg.label}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            {canDo('maquinaria', 'editar') && (
                              <button onClick={() => setModal(m)}
                                className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors">
                                <Pencil size={14}/>
                              </button>
                            )}
                            {canDo('maquinaria', 'eliminar') && (
                              <button onClick={() => handleDelete(m)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors">
                                <Trash2 size={14}/>
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )
      }

      {modal && (
        <MaquinaModal
          maquina={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
