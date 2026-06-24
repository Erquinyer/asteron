import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Building2, ShoppingBag, X } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../api/clientes.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Pagination from '../components/ui/Pagination'
import toast      from 'react-hot-toast'

const PAGE_SIZE = 8

const COLORS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500',
  'bg-pink-500','bg-teal-500','bg-orange-500','bg-indigo-500',
]
const initials = (n) => n?.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase() || '?'

const EMPTY = { nombre: '', nit: '', codigo_cliente: '', direccion: '' }

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { name: 'nombre',         label: 'Nombre *',          placeholder: 'Ej: Castrol Colombia' },
            { name: 'nit',            label: 'NIT',               placeholder: 'Ej: 900112233-1' },
            { name: 'codigo_cliente', label: 'Código cliente',     placeholder: 'Ej: CLI-009' },
            { name: 'direccion',      label: 'Dirección / Ciudad', placeholder: 'Ej: Bogotá, Colombia' },
          ].map(f => (
            <div key={f.name}>
              <label className={labelCls}>{f.label}</label>
              <input name={f.name} value={form[f.name]} onChange={handleChange}
                placeholder={f.placeholder} className={inputCls} />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : cliente ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Clientes() {
  const { data, loading, error, refresh } = useFetch(getClientes)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)
  const [page,   setPage]   = useState(1)

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

  const filtrada = (data || []).filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.codigo_cliente || '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtrada.length / PAGE_SIZE)
  const lista = filtrada.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Clientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{data?.length || 0} clientes registrados</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Nuevo cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Buscar por nombre o código…"
          className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {filtrada.length === 0
        ? <EmptyState title="Sin clientes" description="Crea el primer cliente con el botón de arriba."/>
        : (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map((c, i) => (
              <div key={c.id_cliente}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow group">
                <div className="flex items-start justify-between">
                  <div className={`${COLORS[i % COLORS.length]} h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {initials(c.nombre)}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setModal(c)}
                      className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600">
                      <Pencil size={13}/>
                    </button>
                    <button onClick={() => handleDelete(c)}
                      className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-slate-800 dark:text-white text-sm leading-tight">{c.nombre}</p>
                  {c.nit && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">NIT: {c.nit}</p>}
                  {c.codigo_cliente && <p className="text-xs font-mono text-slate-400 dark:text-slate-500">{c.codigo_cliente}</p>}
                </div>

                {c.direccion && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <Building2 size={12} className="mt-0.5 shrink-0 text-slate-400"/>
                    {c.direccion}
                  </p>
                )}

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700 mt-auto">
                  <ShoppingBag size={13} className="text-slate-400"/>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {c.total_pedidos} {c.total_pedidos === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )
      }

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
