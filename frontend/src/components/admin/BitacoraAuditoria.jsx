import { useState } from 'react'
import { History, User, Wrench, Search, ArrowRight } from 'lucide-react'
import { getBitacora } from '../../api/admin.service'
import { useFetch } from '../../hooks/useFetch'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'

// Bitácora de auditoría (RNF-22): quién cambió qué, cuándo, y el valor antes y después

const ACCIONES = {
  crear:      { label: 'Creación',    cls: 'bg-success/10 text-success' },
  editar:     { label: 'Edición',     cls: 'bg-primary/10 text-primary' },
  estado:     { label: 'Estado',      cls: 'bg-warning/10 text-warning' },
  contrasena: { label: 'Contraseña',  cls: 'bg-secondary/10 text-secondary' },
  eliminar:   { label: 'Eliminación', cls: 'bg-error/10 text-error' },
}

const CAMPOS = {
  codigo_empleado: 'Código', codigo: 'Código', nombre: 'Nombre', correo: 'Correo', rol: 'Rol',
  estado: 'Estado', categoria: 'Categoría', marca: 'Marca', referencia: 'Referencia',
  serial: 'Serial', descripcion: 'Descripción', ubicacion: 'Ubicación', responsable: 'Responsable',
}

// "en_mantenimiento" → "En mantenimiento"; vacío → guion
const valorLegible = (v) => {
  if (v === null || v === undefined || v === '') return '—'
  const s = String(v).replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const fmtFecha = (d) => new Date(d).toLocaleString('es-CO', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

const inputCls = `h-[38px] border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`

export default function BitacoraAuditoria() {
  const [filtros, setFiltros] = useState({ entidad: '', desde: '', hasta: '' })
  const [search,  setSearch]  = useState('')

  // Solo se envían los filtros con valor; cambiar un filtro vuelve a consultar
  const { data: registros, loading, error } = useFetch(
    () => getBitacora(Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))),
    [filtros])

  const setFiltro = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value }))

  const q = search.toLowerCase()
  const filtrados = (registros || []).filter(r =>
    (r.nombre_registro || '').toLowerCase().includes(q) ||
    (r.autor           || '').toLowerCase().includes(q) ||
    (r.detalle         || '').toLowerCase().includes(q))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Bitácora de auditoría</h2>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          Cambios en usuarios y maquinaria · últimos 300
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por registro, autor o detalle…" aria-label="Buscar en la bitácora"
            className={`${inputCls} w-full pl-9`} />
        </div>
        <select value={filtros.entidad} onChange={setFiltro('entidad')} aria-label="Tipo de registro" className={inputCls}>
          <option value="">Usuarios y maquinaria</option>
          <option value="usuario">Solo usuarios</option>
          <option value="maquinaria">Solo maquinaria</option>
        </select>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Desde
          <input type="date" value={filtros.desde} onChange={setFiltro('desde')} className={inputCls} />
        </label>
        <label className="flex items-center gap-1.5 text-[12px] text-muted">
          Hasta
          <input type="date" value={filtros.hasta} onChange={setFiltro('hasta')} className={inputCls} />
        </label>
      </div>

      {loading ? <Spinner text="Cargando bitácora..." /> : error ? (
        <EmptyState title="Error" description={error} />
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <History size={28} className="text-faint" />
          <p className="text-[13px] text-muted">No hay cambios registrados con estos filtros</p>
        </div>
      ) : (
        <div className="border border-border rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface2 border-b border-border">
                  {['Fecha', 'Registro', 'Acción', 'Cambios', 'Autor'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-mono text-[10.5px] font-semibold uppercase tracking-[.06em] text-faint">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map(r => {
                  const accion = ACCIONES[r.accion] || { label: r.accion, cls: 'bg-surface2 text-muted' }
                  const Icono = r.entidad === 'usuario' ? User : Wrench
                  const cambios = Object.entries(r.cambios || {})
                  return (
                    <tr key={r.id_bitacora} className="border-b border-border last:border-0 hover:bg-hover align-top">
                      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">{fmtFecha(r.fecha)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icono size={14} className="text-faint shrink-0" aria-hidden="true" />
                          <span className="text-[13px] font-medium text-ink">{r.nombre_registro || `#${r.id_registro}`}</span>
                        </div>
                        <span className="sr-only">{r.entidad === 'usuario' ? 'Usuario' : 'Equipo'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-[3px] rounded-badge ${accion.cls}`}>
                          {accion.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] min-w-[240px]">
                        {/* Creación y eliminación muestran la foto completa; el resto, antes → después */}
                        {cambios.length > 0 && (
                          <ul className="space-y-0.5">
                            {cambios.map(([campo, { antes, despues }]) => (
                              <li key={campo} className="flex flex-wrap items-center gap-1">
                                <span className="text-faint">{CAMPOS[campo] || campo}:</span>
                                {r.accion === 'crear' ? (
                                  <span className="text-ink">{valorLegible(despues)}</span>
                                ) : r.accion === 'eliminar' ? (
                                  <span className="text-ink">{valorLegible(antes)}</span>
                                ) : (
                                  <>
                                    <span className="text-muted line-through">{valorLegible(antes)}</span>
                                    <ArrowRight size={11} className="text-faint" aria-label="cambió a" />
                                    <span className="text-ink font-medium">{valorLegible(despues)}</span>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                        {r.detalle && <p className="text-faint mt-0.5">{r.detalle}</p>}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">{r.autor || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
