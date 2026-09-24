import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Package, X, PlusCircle, MinusCircle } from 'lucide-react'
import { useFetch }   from '../hooks/useFetch'
import { getPedidos, getPedido, createPedido, updatePedido, deletePedido } from '../api/pedidos.service'
import { getClientes } from '../api/clientes.service'
import { canDo }       from '../utils/auth'
import Spinner          from '../components/ui/Spinner'
import EmptyState       from '../components/ui/EmptyState'
import FieldFilter      from '../components/ui/FieldFilter'
import SearchableSelect from '../components/ui/SearchableSelect'
import toast      from 'react-hot-toast'

const estadoConfig = {
  pendiente:  { label: 'Pendiente',  badge: 'bg-warning/10 text-warning',  dot: 'bg-warning'  },
  en_proceso: { label: 'En proceso', badge: 'bg-primary/10 text-primary',  dot: 'bg-primary'  },
  entregado:  { label: 'Entregado',  badge: 'bg-success/10 text-success',  dot: 'bg-success'  },
  cancelado:  { label: 'Cancelado',  badge: 'bg-error/10 text-error',      dot: 'bg-error'    },
}

const EMPTY_ITEM = { producto: '', cantidad: 1, punto_descargue: '', estado: 'pendiente', fecha_entrega_estimada: '' }

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

const itemInputCls = `w-full border border-border rounded-control px-3 h-9 text-[12px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`

function PedidoModal({ pedido, clientes, onClose, onSaved, onCreated }) {
  const [form, setForm] = useState(pedido ? {
    id_cliente:  pedido.id_cliente  || '',
    descripcion: pedido.descripcion || '',
  } : { id_cliente: '', descripcion: '' })

  const [items,  setItems]  = useState([{ ...EMPTY_ITEM }])
  const [loadingItems, setLoadingItems] = useState(!!pedido)
  const [saving, setSaving] = useState(false)
  // Solo se exige "no puede ser pasada" al crear un pedido nuevo — al editar
  // uno existente no se bloquea el datepicker de un ítem cuya entrega ya venció.
  // Componentes locales, no toISOString(): esa convierte a UTC y en zonas
  // horarias negativas adelanta un día durante la tarde/noche.
  const hoyDate = new Date()
  const hoy = `${hoyDate.getFullYear()}-${String(hoyDate.getMonth() + 1).padStart(2, '0')}-${String(hoyDate.getDate()).padStart(2, '0')}`

  // Clientes más recientes primero (por defecto se muestran los 5 más
  // nuevos en el selector; si el que se busca no aparece, se filtra por texto).
  const clienteOptions = [...clientes]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .map(c => ({ value: c.id_cliente, label: c.nombre, sublabel: c.nit || c.codigo_cliente || '' }))

  // Al editar, se cargan los ítems actuales del pedido (el listado no los trae)
  useEffect(() => {
    if (!pedido) return
    getPedido(pedido.id_pedido)
      .then(({ data }) => setItems(
        data.items?.length
          ? data.items.map(it => ({
              id_detalle: it.id_detalle,
              producto: it.producto || '',
              cantidad: it.cantidad || 1,
              punto_descargue: it.punto_descargue || '',
              estado: it.estado || 'pendiente',
              fecha_entrega_estimada: it.fecha_entrega_estimada?.slice(0, 10) || '',
            }))
          : [{ ...EMPTY_ITEM }]
      ))
      .catch(() => toast.error('No se pudieron cargar los ítems del pedido'))
      .finally(() => setLoadingItems(false))
  }, [pedido])

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
      const payload = {
        ...form,
        items: items
          .filter(it => it.producto.trim())
          .map(it => ({ ...it, cantidad: Math.max(1, parseInt(it.cantidad, 10) || 1) })),
      }
      if (pedido) {
        await updatePedido(pedido.id_pedido, payload)
        toast.success('Pedido actualizado')
      } else {
        const { data: creado } = await createPedido(payload)
        toast.success('Pedido creado')
        onCreated?.(creado)
      }
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
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
          <div className={`grid ${pedido ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div>
              <label className={labelCls}>Cliente *</label>
              <SearchableSelect
                value={form.id_cliente}
                onChange={val => setForm(f => ({ ...f, id_cliente: val }))}
                options={clienteOptions}
                placeholder="Seleccionar cliente"
                searchPlaceholder="Buscar por nombre o NIT…"
                emptyText="Sin clientes que coincidan"
              />
            </div>
            {pedido && (() => {
              const cfg = estadoConfig[pedido.estado] || estadoConfig.pendiente
              return (
                <div>
                  <label className={labelCls}>Estado</label>
                  <div className="h-10 flex items-center gap-2 px-3 border border-border rounded-control bg-surface2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-[13px] text-ink">{cfg.label}</span>
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Se actualiza automáticamente según el proyecto asociado, no es editable.
                  </p>
                </div>
              )
            })()}
          </div>

          <div>
            <label className={labelCls}>Descripción del pedido</label>
            <textarea name="descripcion" value={form.descripcion} onChange={setField} rows={2}
              placeholder="Descripción general del pedido / proyecto a fabricar"
              className={`${inputCls} h-auto py-2.5 resize-none`}
            />
          </div>

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
            {loadingItems ? (
              <p className="font-mono text-[11px] text-faint py-2">Cargando ítems…</p>
            ) : (
              <div className="space-y-2">
                {/* Encabezado de columnas */}
                <div className="grid grid-cols-12 gap-2 px-1 text-[10.5px] font-semibold
                  uppercase tracking-wide text-faint"
                >
                  <span className="col-span-4">Producto / descripción</span>
                  <span className="col-span-2">Cantidad</span>
                  <span className="col-span-3">Punto de entrega</span>
                  <span className="col-span-2">Fecha entrega</span>
                  <span className="col-span-1" />
                </div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      value={item.producto}
                      onChange={e => setItem(i, 'producto', e.target.value)}
                      placeholder="Producto / descripción"
                      className={`col-span-4 ${itemInputCls}`}
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.cantidad}
                      onChange={e => setItem(i, 'cantidad', e.target.value.replace(/\D/g, ''))}
                      placeholder="Cantidad"
                      className={`col-span-2 ${itemInputCls} text-center`}
                    />
                    <input
                      value={item.punto_descargue}
                      onChange={e => setItem(i, 'punto_descargue', e.target.value)}
                      placeholder="Punto entrega"
                      className={`col-span-3 ${itemInputCls}`}
                    />
                    <input type="date"
                      value={item.fecha_entrega_estimada}
                      onChange={e => setItem(i, 'fecha_entrega_estimada', e.target.value)}
                      title="Fecha de entrega estimada de este ítem"
                      min={!pedido ? hoy : undefined}
                      className={`col-span-2 ${itemInputCls}`}
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
            )}
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
            {saving ? 'Guardando…' : pedido ? 'Guardar cambios' : 'Crear pedido'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

const itemEstadoConfig = {
  pendiente:      { label: 'Pendiente',      badge: 'bg-warning/10 text-warning' },
  en_produccion:  { label: 'En producción',  badge: 'bg-primary/10 text-primary' },
  listo:          { label: 'Listo',          badge: 'bg-secondary/10 text-secondary' },
  entregado:      { label: 'Entregado',      badge: 'bg-success/10 text-success' },
}

// ── Modal de detalle (solo lectura) ───────────────────────────────────────────
function PedidoDetailModal({ pedidoId, onClose }) {
  const { data: pedido, loading, error } = useFetch(() => getPedido(pedidoId), [pedidoId])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
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
                Pedido #{pedidoId}
              </h3>
              <p className="text-[12px] text-muted">
                {pedido?.cliente || 'Detalle del pedido'}
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
        <div className="p-6 space-y-5">
          {loading ? (
            <Spinner text="Cargando pedido..." />
          ) : error ? (
            <EmptyState title="Error" description={error} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={labelCls}>Cliente</p>
                  <p className="text-[13.5px] font-medium text-ink">{pedido.cliente}</p>
                </div>
                <div>
                  <p className={labelCls}>Estado</p>
                  <span className={`inline-flex items-center gap-1.5 font-mono
                    text-[11px] font-semibold px-2.5 py-[5px] rounded-badge
                    ${(estadoConfig[pedido.estado] || estadoConfig.pendiente).badge}`}
                  >
                    {(estadoConfig[pedido.estado] || estadoConfig.pendiente).label}
                  </span>
                </div>
              </div>

              {pedido.descripcion && (
                <div>
                  <p className={labelCls}>Descripción</p>
                  <p className="text-[13px] text-muted">{pedido.descripcion}</p>
                </div>
              )}

              <div>
                <p className={labelCls.replace('mb-1.5','mb-2')}>
                  Productos / Items ({pedido.items?.length || 0})
                </p>
                {!pedido.items?.length ? (
                  <p className="font-mono text-[12px] text-faint py-2">Sin ítems registrados.</p>
                ) : (
                  <div className="border border-border rounded-[10px] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface2 border-b border-border">
                          {['Producto', 'Cant.', 'Punto entrega', 'Entrega est.', 'Estado'].map(h => (
                            <th key={h} className="px-3 py-2 text-left font-mono text-[10px]
                              font-semibold uppercase tracking-[.06em] text-faint"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pedido.items.map(it => {
                          const cfg = itemEstadoConfig[it.estado] || itemEstadoConfig.pendiente
                          return (
                            <tr key={it.id_detalle}>
                              <td className="px-3 py-2.5 text-[13px] text-ink font-medium">{it.producto}</td>
                              <td className="px-3 py-2.5 text-[13px] text-muted">{it.cantidad}</td>
                              <td className="px-3 py-2.5 text-[13px] text-muted">{it.punto_descargue || '—'}</td>
                              <td className="px-3 py-2.5 font-mono text-[11.5px] text-muted">
                                {it.fecha_entrega_estimada
                                  ? new Date(it.fecha_entrega_estimada).toLocaleDateString('es-CO')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center font-mono
                                  text-[10.5px] font-semibold px-2 py-[3px] rounded-badge ${cfg.badge}`}
                                >
                                  {cfg.label}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex px-6 py-4 border-t border-border bg-surface2">
          <button onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default function Pedidos() {
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useFetch(getPedidos)
  const { data: clientes }                = useFetch(getClientes)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('todos') // 'todos' | 'cliente'
  const [modal,  setModal]  = useState(null)
  const [viewingId, setViewingId] = useState(null)

  const SEARCH_FIELDS = [
    { value: 'todos',   label: 'Todo',    placeholder: 'Buscar por cliente o descripción…' },
    { value: 'cliente', label: 'Cliente', placeholder: 'Nombre del cliente…' },
  ]

  const handlePedidoCreado = (pedidoCreado) => {
    if (confirm(`Pedido #${pedidoCreado.id_pedido} creado. ¿Deseas crear el proyecto asociado ahora?`)) {
      navigate(`/proyectos?nuevo=1&id_pedido=${pedidoCreado.id_pedido}`)
    }
  }

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

  const q = search.trim().toLowerCase()
  const lista = (data || []).filter(p => {
    if (!q) return true
    if (searchField === 'cliente') return (p.cliente || '').toLowerCase().includes(q)
    return (p.cliente || '').toLowerCase().includes(q) ||
      (p.descripcion || '').toLowerCase().includes(q)
  })

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
        <FieldFilter
          fields={SEARCH_FIELDS}
          field={searchField}
          onFieldChange={setSearchField}
          value={search}
          onValueChange={setSearch}
          className="flex-1 min-w-[220px] max-w-sm"
        />

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
                      onClick={() => setViewingId(p.id_pedido)}
                      className="hover:bg-hover transition-colors cursor-pointer"
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
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
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
          onCreated={handlePedidoCreado}
        />
      )}

      {viewingId && (
        <PedidoDetailModal
          pedidoId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  )
}
