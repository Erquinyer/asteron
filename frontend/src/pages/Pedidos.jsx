import { useState } from 'react'
import { Search, Plus, Pencil, Trash2, Package, X, PlusCircle, MinusCircle } from 'lucide-react'
import { useFetch }   from '../hooks/useFetch'
import { getPedidos, createPedido, updatePedido, deletePedido } from '../api/pedidos.service'
import { getClientes } from '../api/clientes.service'
import { canDo }       from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const estadoConfig = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-warning/10 text-warning',  dot: 'bg-warning'  },
  en_proceso: { label: 'En proceso', badge: 'bg-primary/10 text-primary',  dot: 'bg-primary'  },
  entregado:  { label: 'Entregado',  badge: 'bg-success/10 text-success',  dot: 'bg-success'  },
  cancelado:  { label: 'Cancelado',  badge: 'bg-error/10 text-error',      dot: 'bg-error'    },
}

const EMPTY_ITEM = { producto: '', cantidad: 1, punto_descargue: '', estado: 'pendiente' }

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

const itemInputCls = `w-full border border-border rounded-control px-3 h-9 text-[12px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`

function PedidoModal({ pedido, clientes, onClose, onSaved }) {
  const [form, setForm] = useState(pedido ? {
    id_cliente:  pedido.id_cliente  || '',
    descripcion: pedido.descripcion || '',
    estado:      pedido.estado      || 'pendiente',
  } : { id_cliente: '', descripcion: '', estado: 'pendiente' })

  const [items,  setItems]  = useState([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  const setField = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const setItem  = (i, field, value) =>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center
      bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-ov-in"
    >
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-2xl my-4 overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface sticky top-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10
              flex items-center justify-center shrink-0"
            >
              <Package size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">
                {pedido ? 'Editar pedido' : 'Nuevo pedido'}
              </h3>
              <p className="text-[12px] text-muted">
                {pedido ? `Pedido #${pedido.id_pedido}` : 'Registrar un nuevo pedido'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Cliente *</label>
              <select name="id_cliente" value={form.id_cliente}
                onChange={setField} required className={inputCls}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select name="estado" value={form.estado}
                onChange={setField} className={inputCls}
              >
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
              className={`${inputCls} h-auto py-2.5 resize-none`}
            />
          </div>

          {!pedido && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className={labelCls.replace('mb-1.5','mb-0')}>Productos / Items</p>
                <button type="button" onClick={addItem}
                  className="flex items-center gap-1.5 text-[12px] font-medium
                    text-primary hover:text-primary-hover transition-colors"
                >
                  <PlusCircle size={14} /> Agregar item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={item.producto}
                      onChange={e => setItem(i, 'producto', e.target.value)}
                      placeholder="Producto / descripción"
                      className={`col-span-5 ${itemInputCls}`}
                    />
                    <input type="number" min={1}
                      value={item.cantidad}
                      onChange={e => setItem(i, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      className={`col-span-2 ${itemInputCls}`}
                    />
                    <input
                      value={item.punto_descargue}
                      onChange={e => setItem(i, 'punto_descargue', e.target.value)}
                      placeholder="Punto entrega"
                      className={`col-span-4 ${itemInputCls}`}
                    />
                    <button type="button" onClick={() => removeItem(i)}
                      className="col-span-1 flex justify-center items-center
                        text-faint hover:text-error transition-colors"
                    >
                      <MinusCircle size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            {saving ? 'Guardando…' : pedido ? 'Guardar cambios' : 'Crear pedido'}
          </button>
        </div>
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

  if (loading) return <Spinner text="Cargando pedidos..." />
  if (error)   return <EmptyState title="Error" description={error} />

  const lista = (data || []).filter(p =>
    (p.cliente || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.descripcion || '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = Object.fromEntries(
    Object.keys(estadoConfig).map(k => [k, (data || []).filter(p => p.estado === k).length])
  )

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Pedidos</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {data?.length || 0} pedidos · {counts.en_proceso} en proceso · {counts.pendiente} pendientes
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente o descripción…"
            className="w-full h-[38px] pl-9 pr-4 border border-border rounded-control
              text-[13px] bg-surface2 text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
              transition-colors"
          />
        </div>

        <div className="flex-1" />

        {canDo('pedidos', 'crear') && (
          <button onClick={() => setModal('new')}
            className="h-[38px] flex items-center gap-2 px-4
              bg-primary hover:bg-primary-hover text-white
              text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} /> Nuevo pedido
          </button>
        )}
      </div>

      {/* Tabla */}
      {lista.length === 0 ? (
        <EmptyState title="Sin pedidos" description="Crea el primer pedido con el botón de arriba." />
      ) : (
        <div className="bg-surface border border-border rounded-card overflow-hidden shadow-card dark:shadow-card-dk">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface2 border-b border-border">
                  {['#', 'Cliente', 'Descripción', 'Estado', 'Items', 'Fecha', ''].map((h, i) => (
                    <th key={i}
                      className={`px-5 py-3 text-left font-mono text-[10.5px] font-semibold
                        uppercase tracking-[.06em] text-faint
                        ${i === 2 ? 'hidden md:table-cell' : ''}
                        ${i === 4 || i === 5 ? 'hidden lg:table-cell' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lista.map(p => {
                  const cfg = estadoConfig[p.estado] || estadoConfig.pendiente
                  return (
                    <tr key={p.id_pedido}
                      className="hover:bg-hover transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-[11px] text-faint">
                        #{p.id_pedido}
                      </td>
                      <td className="px-5 py-3.5 text-[13.5px] font-medium text-ink">
                        {p.cliente}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] text-muted hidden md:table-cell max-w-[240px]">
                        <p className="truncate">{p.descripcion || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 font-mono
                          text-[11px] font-semibold px-2.5 py-[5px] rounded-badge ${cfg.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-[13px] text-muted">
                          <Package size={13} className="text-faint" />
                          {p.total_items}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11.5px] text-faint hidden lg:table-cell">
                        {new Date(p.fecha_pedido).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {canDo('pedidos', 'editar') && (
                            <button onClick={() => setModal(p)}
                              className="w-7 h-7 flex items-center justify-center rounded-badge
                                text-faint hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canDo('pedidos', 'eliminar') && (
                            <button onClick={() => handleDelete(p)}
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
      )}

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
