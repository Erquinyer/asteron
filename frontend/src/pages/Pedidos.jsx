import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Package, X, PlusCircle, MinusCircle } from 'lucide-react'
import { useFetch }   from '../hooks/useFetch'
import { getPedidos, createPedido, updatePedido, deletePedido } from '../api/pedidos.service'
import { getClientes } from '../api/clientes.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const estadoConfig = {
  pendiente:  { label: 'Pendiente',  style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'  },
  en_proceso: { label: 'En proceso', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'    },
  entregado:  { label: 'Entregado',  style: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'  },
  cancelado:  { label: 'Cancelado',  style: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'      },
}

const EMPTY_ITEM = { producto: '', cantidad: 1, punto_descargue: '', estado: 'pendiente' }

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

function PedidoModal({ pedido, clientes, onClose, onSaved }) {
  const [form, setForm] = useState(pedido ? {
    id_cliente:  pedido.id_cliente  || '',
    descripcion: pedido.descripcion || '',
    estado:      pedido.estado      || 'pendiente',
  } : { id_cliente: '', descripcion: '', estado: 'pendiente' })

  const [items,  setItems]  = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  const setField = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const setItem = (i, field, value) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))

  const addItem    = () => setItems(prev => [...prev, { ...EMPTY_ITEM }])
  const removeItem = (i) => setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.id_cliente) { toast.error('Selecciona un cliente'); return }
    setSaving(true)
    try {
      if (pedido) {
        await updatePedido(pedido.id_pedido, form)
      } else {
        await createPedido({ ...form, items: items.filter(it => it.producto.trim()) })
      }
      toast.success(pedido ? 'Pedido actualizado' : 'Pedido creado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">{pedido ? 'Editar pedido' : 'Nuevo pedido'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cliente *</label>
              <select name="id_cliente" value={form.id_cliente} onChange={setField} required className={inputCls}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="estado" value={form.estado} onChange={setField} className={inputCls}>
                {Object.entries(estadoConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Descripción del pedido</label>
            <textarea name="descripcion" value={form.descripcion} onChange={setField} rows={2}
              placeholder="Descripción general del pedido / proyecto a fabricar"
              className={`${inputCls} resize-none`}/>
          </div>

          {!pedido && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Productos / Items</label>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  <PlusCircle size={14}/> Agregar item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={item.producto} onChange={e => setItem(i, 'producto', e.target.value)}
                      placeholder="Producto / descripción"
                      className="col-span-5 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <input type="number" min={1}
                      value={item.cantidad} onChange={e => setItem(i, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      className="col-span-2 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <input
                      value={item.punto_descargue} onChange={e => setItem(i, 'punto_descargue', e.target.value)}
                      placeholder="Punto entrega"
                      className="col-span-4 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    <button type="button" onClick={() => removeItem(i)}
                      className="col-span-1 flex justify-center text-slate-300 hover:text-red-500">
                      <MinusCircle size={16}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : pedido ? 'Guardar cambios' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Pedidos() {
  const { data, loading, error, refresh } = useFetch(getPedidos)
  const { data: clientes }                = useFetch(getClientes)
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(null)

  const handleDelete = async (p) => {
    if (!confirm(`¿Eliminar el pedido #${p.id_pedido} de ${p.cliente}?`)) return
    try {
      await deletePedido(p.id_pedido)
      toast.success('Pedido eliminado')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al eliminar')
    }
  }

  if (loading) return <Spinner text="Cargando pedidos..."/>
  if (error)   return <EmptyState title="Error" description={error}/>

  const lista = (data || []).filter(p =>
    (p.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = Object.fromEntries(
    Object.keys(estadoConfig).map(k => [k, (data || []).filter(p => p.estado === k).length])
  )

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Pedidos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data?.length || 0} pedidos · {counts.en_proceso} en proceso · {counts.pendiente} pendientes
          </p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Nuevo pedido
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente o descripción…"
          className="pl-9 pr-4 py-2 w-full border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
      </div>

      {lista.length === 0
        ? <EmptyState title="Sin pedidos" description="Crea el primer pedido con el botón de arriba."/>
        : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide text-left">
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Cliente</th>
                    <th className="px-6 py-3 hidden md:table-cell">Descripción</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Items</th>
                    <th className="px-6 py-3 hidden lg:table-cell">Fecha</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {lista.map(p => {
                    const cfg = estadoConfig[p.estado] || estadoConfig.pendiente
                    return (
                      <tr key={p.id_pedido} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 dark:text-slate-500">#{p.id_pedido}</td>
                        <td className="px-6 py-4 font-medium text-slate-800 dark:text-white">{p.cliente}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell max-w-[240px]">
                          <p className="truncate">{p.descripcion || '—'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.style}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                          <div className="flex items-center gap-1">
                            <Package size={13} className="text-slate-400"/>
                            {p.total_items}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-400 dark:text-slate-500 text-xs hidden lg:table-cell">
                          {new Date(p.fecha_pedido).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setModal(p)}
                              className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-400 hover:text-blue-600 transition-colors">
                              <Pencil size={14}/>
                            </button>
                            <button onClick={() => handleDelete(p)}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </div>
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

      {modal && (
        <PedidoModal
          pedido={modal === 'new' ? null : modal}
          clientes={clientes || []}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}
