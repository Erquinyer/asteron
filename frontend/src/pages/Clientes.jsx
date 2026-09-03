import { useState } from 'react'
import { Plus, Pencil, Trash2, Building2, ShoppingBag, X } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../api/clientes.service'
import { canDo }       from '../utils/auth'
import Spinner     from '../components/ui/Spinner'
import EmptyState  from '../components/ui/EmptyState'
import Pagination  from '../components/ui/Pagination'
import FieldFilter from '../components/ui/FieldFilter'
import toast      from 'react-hot-toast'

const PAGE_SIZE = 8

// Paleta de avatares usando tokens del sistema
const AVATAR_COLORS = [
  { bg: 'bg-primary/15',   text: 'text-primary'   },
  { bg: 'bg-secondary/15', text: 'text-secondary'  },
  { bg: 'bg-success/15',   text: 'text-success'    },
  { bg: 'bg-warning/15',   text: 'text-warning'    },
  { bg: 'bg-error/15',     text: 'text-error'      },
  { bg: 'bg-violet-500/15',text: 'text-violet-500' },
  { bg: 'bg-pink-500/15',  text: 'text-pink-500'   },
  { bg: 'bg-cyan-500/15',  text: 'text-cyan-500'   },
]

const initials = (n) =>
  (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

const EMPTY = { nombre: '', nit: '', codigo_cliente: '', direccion: '' }

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

function ClienteModal({ cliente, onClose, onSaved }) {
  const [form, setForm] = useState(cliente ? {
    nombre:         cliente.nombre         || '',
    nit:            cliente.nit            || '',
    codigo_cliente: cliente.codigo_cliente || '',
    direccion:      cliente.direccion      || '',
  } : EMPTY)
  const [saving, setSaving] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      cliente ? await updateCliente(cliente.id_cliente, form) : await createCliente(form)
      toast.success(cliente ? 'Cliente actualizado' : 'Cliente creado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const fields = [
    { name: 'nombre',         label: 'Nombre *',          placeholder: 'Ej: Castrol Colombia' },
    { name: 'nit',            label: 'NIT',               placeholder: 'Ej: 900112233-1' },
    { name: 'codigo_cliente', label: 'Código cliente',     placeholder: 'Ej: CLI-009' },
    { name: 'direccion',      label: 'Dirección / Ciudad', placeholder: 'Ej: Bogotá, Colombia' },
  ]

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
              <Building2 size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {cliente ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <p className="text-[12px] text-muted">
                {cliente ? cliente.nombre : 'Registrar empresa cliente'}
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
          {fields.map(f => (
            <div key={f.name}>
              <label className={labelCls}>{f.label}</label>
              <input name={f.name} value={form[f.name]}
                onChange={handleChange} placeholder={f.placeholder}
                className={inputCls}
              />
            </div>
          ))}
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
            {saving ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function Clientes() {
  const { data, loading, error, refresh } = useFetch(getClientes)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('todos') // 'todos' | 'nombre' | 'nit'
  const [modal,  setModal]  = useState(null)
  const [page,   setPage]   = useState(1)

  const SEARCH_FIELDS = [
    { value: 'todos',  label: 'Todo',     placeholder: 'Buscar por nombre o código…' },
    { value: 'nombre', label: 'Nombre',   placeholder: 'Nombre del cliente…' },
    { value: 'nit',    label: 'Documento', placeholder: 'NIT del cliente…' },
  ]

  const handleDelete = async (c) => {
    if (!confirm(`¿Eliminar "${c.nombre}"? Se perderá el historial de pedidos asociados.`)) return
    try {
      await deleteCliente(c.id_cliente)
      toast.success('Cliente eliminado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando clientes..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const q = search.trim().toLowerCase()
  const filtrada = (data || []).filter(c => {
    if (!q) return true
    if (searchField === 'nombre') return c.nombre.toLowerCase().includes(q)
    if (searchField === 'nit')    return (c.nit || '').toLowerCase().includes(q)
    return c.nombre.toLowerCase().includes(q) ||
      (c.codigo_cliente || '').toLowerCase().includes(q)
  })
  const totalPages = Math.ceil(filtrada.length / PAGE_SIZE)
  const lista = filtrada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val); setPage(1) }
  const handleSearchField = (val) => { setSearchField(val); setPage(1) }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Clientes</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {data?.length || 0} clientes registrados
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <FieldFilter
          fields={SEARCH_FIELDS}
          field={searchField}
          onFieldChange={handleSearchField}
          value={search}
          onValueChange={handleSearch}
          className="flex-1 min-w-[220px] max-w-sm"
        />

        <div className="flex-1" />

        {canDo('clientes', 'crear') && (
          <button onClick={() => setModal('new')}
            className="h-[38px] flex items-center gap-2 px-4
              bg-primary hover:bg-primary-hover text-white
              text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} /> Nuevo cliente
          </button>
        )}
      </div>

      {/* Tabla */}
      {filtrada.length === 0 ? (
        <EmptyState title="Sin clientes" description="Crea el primer cliente con el botón de arriba." />
      ) : (
        <>
          <div className="bg-surface border border-border rounded-card shadow-card
            dark:shadow-card-dk overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface2 border-b border-border">
                    {['Cliente', 'NIT / código', 'Dirección', 'Pedidos', ''].map((h, i) => (
                      <th key={i}
                        className={`px-[18px] py-[13px] text-left font-mono text-[10.5px]
                          font-semibold uppercase tracking-[.08em] text-faint
                          ${i === 1 ? 'hidden sm:table-cell' : ''}
                          ${i === 2 ? 'hidden lg:table-cell' : ''}
                          ${i === 3 ? 'hidden md:table-cell' : ''}
                        `}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {lista.map((c, i) => {
                    const av = AVATAR_COLORS[i % AVATAR_COLORS.length]
                    return (
                      <tr key={c.id_cliente} className="hover:bg-hover transition-colors duration-100">
                        {/* Cliente */}
                        <td className="px-[18px] py-[13px]">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center
                              text-[11px] font-bold shrink-0 ${av.bg} ${av.text}`}
                            >
                              {initials(c.nombre)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-medium text-ink truncate max-w-[200px]">
                                {c.nombre}
                              </p>
                              {c.codigo_cliente && (
                                <p className="font-mono text-[10.5px] text-primary sm:hidden">
                                  {c.codigo_cliente}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* NIT / código */}
                        <td className="px-[18px] py-[13px] hidden sm:table-cell">
                          <p className="font-mono text-[12px] text-muted">{c.nit || '—'}</p>
                          {c.codigo_cliente && (
                            <p className="font-mono text-[11px] text-primary mt-0.5">{c.codigo_cliente}</p>
                          )}
                        </td>

                        {/* Dirección */}
                        <td className="px-[18px] py-[13px] hidden lg:table-cell">
                          <p className="text-[13px] text-muted truncate max-w-[220px]">
                            {c.direccion || <span className="text-faint italic">Sin dirección</span>}
                          </p>
                        </td>

                        {/* Pedidos */}
                        <td className="px-[18px] py-[13px] hidden md:table-cell">
                          <div className="flex items-center gap-1.5 text-[13px] text-muted">
                            <ShoppingBag size={13} className="text-faint" />
                            {c.total_pedidos}
                          </div>
                        </td>

                        {/* Acciones */}
                        <td className="px-[18px] py-[13px]">
                          <div className="flex items-center gap-0.5">
                            {canDo('clientes', 'editar') && (
                              <button onClick={() => setModal(c)} title="Editar"
                                className="w-7 h-7 flex items-center justify-center rounded-badge
                                  text-faint hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDo('clientes', 'eliminar') && (
                              <button onClick={() => handleDelete(c)} title="Eliminar"
                                className="w-7 h-7 flex items-center justify-center rounded-badge
                                  text-faint hover:bg-error/10 hover:text-error transition-colors"
                              >
                                <Trash2 size={13} />
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
        <ClienteModal
          cliente={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
