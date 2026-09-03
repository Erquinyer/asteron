import { useState, useRef, useEffect } from 'react'
import { Search, Plus, Pencil, Trash2, Wrench, Cpu, Zap, Eye, X, Filter, ChevronDown, Check } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getMaquinaria, createMaquina, updateMaquina, deleteMaquina } from '../api/maquinaria.service'
import { canDo }       from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import toast      from 'react-hot-toast'

const PAGE_SIZE = 10

// ── Configuración de estados ───────────────────────────────────────────────────
const estadoConfig = {
  activa:           { label: 'Activa',          dot: 'bg-success',   badge: 'bg-success/10 text-success'     },
  inactiva:         { label: 'Inactiva',         dot: 'bg-faint',     badge: 'bg-surface2 text-faint'          },
  en_mantenimiento: { label: 'En mantenimiento', dot: 'bg-warning',   badge: 'bg-warning/10 text-warning'     },
  sin_asignar:      { label: 'Sin asignar',      dot: 'bg-secondary', badge: 'bg-secondary/10 text-secondary' },
  guardada:         { label: 'Guardada',         dot: 'bg-primary',   badge: 'bg-primary/10 text-primary'     },
  dado_de_baja:     { label: 'Dado de baja',     dot: 'bg-error',     badge: 'bg-error/10 text-error'         },
}

const categoriaIcon  = {
  maquinaria_pesada:    <Wrench size={14} />,
  equipo_mig:           <Zap size={14} />,
  herramienta_electrica:<Cpu size={14} />,
}
const categoriaLabel = {
  maquinaria_pesada:    'Maquinaria pesada',
  equipo_mig:           'Equipo MIG',
  herramienta_electrica:'Herramienta eléctrica',
}
const CATEGORIAS = ['todas', 'maquinaria_pesada', 'equipo_mig', 'herramienta_electrica']

// ── Estilos de formulario ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  nombre: '', codigo: '', categoria: 'maquinaria_pesada',
  marca: '', referencia: '', serial: '', descripcion: '', ubicacion: '', estado: 'activa',
}

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

// ── Modal ─────────────────────────────────────────────────────────────────────
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
      <input name={name} value={form[name]} onChange={set}
        placeholder={placeholder} className={inputCls} />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-lg my-4 animate-md-in overflow-hidden"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <Wrench size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {maquina ? 'Editar equipo' : 'Nuevo equipo'}
              </h3>
              <p className="text-[12px] text-muted">
                {maquina ? 'Modifica los datos del equipo.' : 'Registra un equipo en el inventario.'}
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
            {field('serial',    'Serial',     'Ej: F1002540')}
            {field('ubicacion', 'Ubicación',  'Ej: Planta A')}
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={set} rows={2}
              placeholder="Descripción breve del equipo"
              className={`${inputCls} h-auto py-2.5 resize-none`} />
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
              text-white rounded-control text-[13px] font-semibold shadow-btn transition-colors"
          >
            {saving ? 'Guardando…' : maquina ? 'Guardar cambios' : 'Crear equipo'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Maquinaria() {
  const { data, loading, error, refresh } = useFetch(getMaquinaria)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('todas')
  const [catOpen,   setCatOpen]   = useState(false)
  const [modal,     setModal]     = useState(null)
  const [page,      setPage]      = useState(1)
  const catRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleDelete = async (m) => {
    if (!confirm(`¿Eliminar "${m.nombre}${m.codigo ? ` (${m.codigo})` : ''}"?`)) return
    try {
      await deleteMaquina(m.id_maquina)
      toast.success('Equipo eliminado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando inventario..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const filtrada = (data || []).filter(m => {
    const matchCat  = catFilter === 'todas' || m.categoria === catFilter
    const matchText = m.nombre.toLowerCase().includes(search.toLowerCase()) ||
                      (m.codigo || '').toLowerCase().includes(search.toLowerCase()) ||
                      (m.marca  || '').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchText
  })
  const totalPages = Math.ceil(filtrada.length / PAGE_SIZE)
  const lista      = filtrada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = val => { setSearch(val);    setPage(1) }
  const handleCat    = cat => { setCatFilter(cat); setPage(1) }

  const activas = (data || []).filter(m => m.estado === 'activa').length
  const mantto  = (data || []).filter(m => m.estado === 'en_mantenimiento').length

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Maquinaria e inventario</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {data?.length || 0} equipos · {activas} activos · {mantto} en mantenimiento
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar por código o serial…"
            className="w-full h-[38px] pl-9 pr-4 bg-surface border border-border
              rounded-control text-[13px] text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
              transition-colors"
          />
        </div>

        {/* Filtro de categoría */}
        <div className="relative" ref={catRef}>
          <button
            onClick={() => setCatOpen(o => !o)}
            className={`h-[38px] flex items-center gap-2 px-3 rounded-control text-[13px]
              border transition-colors
              ${catFilter !== 'todas'
                ? 'bg-primary/5 border-primary/40 text-primary'
                : 'bg-surface border-border text-muted hover:bg-hover hover:text-ink'
              }`}
          >
            <Filter size={14} className="shrink-0" />
            <span>{catFilter === 'todas' ? 'Categoría' : categoriaLabel[catFilter]}</span>
            <ChevronDown size={12} className={`text-faint transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>

          {catOpen && (
            <div className="absolute top-[44px] left-0 z-20 w-52 bg-surface border border-border
              rounded-card shadow-modal overflow-hidden animate-md-in"
            >
              {CATEGORIAS.map(cat => (
                <button
                  key={cat}
                  onClick={() => { handleCat(cat); setCatOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left
                    transition-colors
                    ${catFilter === cat
                      ? 'text-primary bg-primary/5'
                      : 'text-muted hover:bg-hover hover:text-ink'
                    }`}
                >
                  {cat !== 'todas' && (
                    <span className="text-faint">{categoriaIcon[cat]}</span>
                  )}
                  <span className="flex-1">
                    {cat === 'todas' ? 'Todas las categorías' : categoriaLabel[cat]}
                  </span>
                  {catFilter === cat && (
                    <Check size={13} className="text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Botón primario */}
        {canDo('maquinaria', 'crear') && (
          <button onClick={() => setModal('new')}
            className="h-[38px] flex items-center gap-2 px-4 bg-primary hover:bg-primary-hover
              text-white text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} />
            Registrar máquina
          </button>
        )}
      </div>

      {/* ── Tabla ── */}
      {filtrada.length === 0 ? (
        <EmptyState title="Sin equipos" description="No hay equipos que coincidan con los filtros." />
      ) : (
        <>
          <div className="bg-surface border border-border rounded-card shadow-card
            dark:shadow-card-dk overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface2 border-b border-border">
                    <th className="px-[18px] py-[13px] text-left font-mono text-[10.5px]
                      font-semibold uppercase tracking-[.08em] text-faint">
                      Código
                    </th>
                    <th className="px-[18px] py-[13px] text-left font-mono text-[10.5px]
                      font-semibold uppercase tracking-[.08em] text-faint hidden md:table-cell">
                      Categoría
                    </th>
                    <th className="px-[18px] py-[13px] text-left font-mono text-[10.5px]
                      font-semibold uppercase tracking-[.08em] text-faint hidden lg:table-cell">
                      Marca / Ref.
                    </th>
                    <th className="px-[18px] py-[13px] text-left font-mono text-[10.5px]
                      font-semibold uppercase tracking-[.08em] text-faint hidden lg:table-cell">
                      Ubicación
                    </th>
                    <th className="px-[18px] py-[13px] text-left font-mono text-[10.5px]
                      font-semibold uppercase tracking-[.08em] text-faint">
                      Estado
                    </th>
                    <th className="px-[18px] py-[13px]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map(m => {
                    const cfg = estadoConfig[m.estado] || estadoConfig.inactiva
                    return (
                      <tr key={m.id_maquina}
                        className="hover:bg-hover transition-colors duration-100"
                      >
                        {/* Código + nombre */}
                        <td className="px-[18px] py-[13px]">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[8px] bg-surface2
                              flex items-center justify-center text-faint shrink-0"
                            >
                              {categoriaIcon[m.categoria] || <Wrench size={14} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-mono text-[12px] font-semibold text-ink leading-tight">
                                {m.codigo || '—'}
                              </p>
                              <p className="text-[12px] text-muted truncate max-w-[140px]">
                                {m.nombre}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-[18px] py-[13px] hidden md:table-cell">
                          <span className="text-[12.5px] text-muted">
                            {categoriaLabel[m.categoria] || m.categoria}
                          </span>
                        </td>

                        {/* Marca / Referencia */}
                        <td className="px-[18px] py-[13px] hidden lg:table-cell">
                          <p className="text-[13px] font-medium text-ink">
                            {m.marca || '—'}
                          </p>
                          {m.referencia && (
                            <p className="font-mono text-[10.5px] text-faint mt-0.5">
                              {m.referencia}
                            </p>
                          )}
                        </td>

                        {/* Ubicación */}
                        <td className="px-[18px] py-[13px] hidden lg:table-cell">
                          <span className="text-[12.5px] text-muted">
                            {m.ubicacion || '—'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="px-[18px] py-[13px]">
                          <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
                            font-semibold px-[9px] py-[5px] rounded-badge ${cfg.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-[18px] py-[13px]">
                          <div className="flex items-center gap-0.5">
                            {canDo('maquinaria', 'editar') && (
                              <button
                                onClick={() => setModal(m)}
                                title="Editar"
                                className="w-7 h-7 flex items-center justify-center rounded-badge
                                  text-faint hover:bg-surface2 hover:text-primary transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDo('maquinaria', 'eliminar') && (
                              <button
                                onClick={() => handleDelete(m)}
                                title="Eliminar"
                                className="w-7 h-7 flex items-center justify-center rounded-badge
                                  text-faint hover:bg-error/10 hover:text-error transition-colors"
                              >
                                <Trash2 size={14} />
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
      )}

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
