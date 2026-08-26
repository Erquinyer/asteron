import { useState, useMemo } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import Popover from '../ui/Popover'
import {
  MODULE_ORDER, MODULE_LABELS, MODULO_ACCIONES, ACCION_LABELS, ROL_INMUTABLE,
  getModuleLevel, levelDisabled,
} from '../../hooks/usePermisosDraft'

const NIVELES = [
  { id: 'ninguno', label: 'Ninguno' },
  { id: 'ver',     label: 'Ver' },
  { id: 'editar',  label: 'Editar' },
  { id: 'total',   label: 'Total' },
]

const PLANTILLAS = [
  { id: 'solo_lectura', label: 'Solo lectura', hint: 'Acceso a todos los módulos, sin acciones' },
  { id: 'operativo',    label: 'Operativo',     hint: 'Acceso + crear + editar en todos los módulos' },
  { id: 'acceso_total', label: 'Acceso total',  hint: 'Todas las acciones disponibles' },
  { id: 'revocar_todo', label: 'Revocar todo',  hint: 'Quita acceso a todos los módulos' },
]

const ACCION_ABBR = { crear: 'C', editar: 'Ed', eliminar: 'El' }

const PermissionsMatrix = ({
  selectedRoles,     // role objects del draft, ya filtrados a la selección actual
  allRoles,          // todos los roles (para "Copiar de otro rol")
  onSetLevel, onToggleAction, onApplyTemplate, onCopyFromRole,
  isModuleDirty,
}) => {
  const [moduleSearch, setModuleSearch] = useState('')

  const roleIds = useMemo(() => selectedRoles.map(r => r.id_rol), [selectedRoles])
  const single  = selectedRoles.length === 1 ? selectedRoles[0] : null

  const accesoCount = useMemo(() => {
    if (selectedRoles.length === 0) return 0
    return MODULE_ORDER.filter(m => selectedRoles.every(r => r.modulos[m].acceso)).length
  }, [selectedRoles])

  const visibleModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase()
    if (!q) return MODULE_ORDER
    return MODULE_ORDER.filter(m => {
      if (MODULE_LABELS[m].toLowerCase().includes(q)) return true
      return MODULO_ACCIONES[m].some(a => ACCION_LABELS[a].toLowerCase().includes(q))
    })
  }, [moduleSearch])

  if (selectedRoles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface border border-border rounded-card p-10">
        <p className="text-[13px] text-faint">Selecciona uno o más roles para configurar sus permisos.</p>
      </div>
    )
  }

  const roleLevel = (role, modulo) => getModuleLevel(role.modulos[modulo], modulo)

  const commonLevel = (modulo) => {
    const levels = selectedRoles.map(r => roleLevel(r, modulo))
    const first = levels[0]
    return levels.every(l => l === first) ? first : null
  }

  const actionState = (modulo, accion) => {
    const withIt = selectedRoles.filter(r => r.modulos[modulo][accion]).length
    if (withIt === 0) return 'off'
    if (withIt === selectedRoles.length) return 'on'
    return 'mixed'
  }

  return (
    <div className="flex-1 min-w-0 bg-surface border border-border rounded-card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          {single ? (
            <>
              <h2 className="text-[15px] font-semibold text-ink truncate">{single.nombre}</h2>
              <p className="text-[12px] text-muted mt-0.5 truncate">
                {single.descripcion || 'Sin descripción'}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-[15px] font-semibold text-ink">
                Editando {selectedRoles.length} roles a la vez
              </h2>
              <p className="text-[12px] text-muted mt-0.5 truncate">
                {selectedRoles.map(r => r.nombre).join(', ')}
              </p>
            </>
          )}
        </div>
        <span className="shrink-0 font-mono text-[10.5px] font-semibold px-2.5 py-1 rounded-badge
          bg-primary/10 text-primary whitespace-nowrap">
          {accesoCount}/{MODULE_ORDER.length} módulos con acceso
        </span>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap items-center gap-2">
        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle}
              className="h-[34px] flex items-center gap-1.5 px-3 border border-border rounded-control
                text-[12px] font-medium text-muted hover:text-ink hover:bg-hover transition-colors"
            >
              Aplicar plantilla <ChevronDown size={13} />
            </button>
          )}
        >
          {({ close }) => (
            <div className="w-64 py-1.5">
              {PLANTILLAS.map(p => (
                <button key={p.id}
                  onClick={() => { onApplyTemplate(p.id); close() }}
                  className="w-full text-left px-3.5 py-2 hover:bg-hover transition-colors"
                >
                  <p className="text-[12.5px] font-medium text-ink">{p.label}</p>
                  <p className="font-mono text-[10px] text-faint mt-0.5">{p.hint}</p>
                </button>
              ))}
            </div>
          )}
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button onClick={toggle}
              className="h-[34px] flex items-center gap-1.5 px-3 border border-border rounded-control
                text-[12px] font-medium text-muted hover:text-ink hover:bg-hover transition-colors"
            >
              Copiar de otro rol <ChevronDown size={13} />
            </button>
          )}
        >
          {({ close }) => (
            <div className="w-60 py-1.5 max-h-72 overflow-y-auto">
              {allRoles.filter(r => r.nombre !== ROL_INMUTABLE && !roleIds.includes(r.id_rol)).map(r => (
                <button key={r.id_rol}
                  onClick={() => { onCopyFromRole(r.id_rol); close() }}
                  className="w-full text-left px-3.5 py-2 text-[12.5px] text-ink hover:bg-hover transition-colors"
                >
                  {r.nombre}
                </button>
              ))}
            </div>
          )}
        </Popover>

        <div className="relative ml-auto w-full sm:w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            value={moduleSearch} onChange={e => setModuleSearch(e.target.value)}
            placeholder="Filtrar módulo o acción…"
            className="w-full h-[34px] pl-8 pr-3 border border-border rounded-control
              text-[12px] bg-surface2 text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Tabla de módulos */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-surface2 border-b border-border">
              <th className="text-left px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-faint">
                Módulo
              </th>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-faint">
                Nivel de acceso
              </th>
              <th className="text-left px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-faint">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleModules.map(modulo => {
              const level    = commonLevel(modulo)
              const dirty    = isModuleDirty(roleIds, modulo)
              const acciones = MODULO_ACCIONES[modulo]

              return (
                <tr key={modulo} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 align-top">
                    <div className="flex items-center gap-1.5">
                      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" title="Cambios sin guardar" />}
                      <span className="text-[12.5px] font-medium text-ink">{MODULE_LABELS[modulo]}</span>
                    </div>
                    {!level && (
                      <span className="font-mono text-[9.5px] font-semibold text-warning
                        bg-warning/10 px-1.5 py-0.5 rounded-badge mt-1 inline-block">
                        {selectedRoles.length > 1 ? 'MIXTO' : 'PERSONALIZADO'}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 align-top">
                    <div className="inline-flex p-0.5 bg-surface2 border border-border rounded-control">
                      {NIVELES.map(n => {
                        const disabled = levelDisabled(n.id, modulo)
                        const active   = level === n.id
                        return (
                          <button key={n.id}
                            disabled={disabled}
                            onClick={() => onSetLevel(roleIds, modulo, n.id)}
                            className={`px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium transition-colors
                              disabled:opacity-30 disabled:cursor-not-allowed
                              ${active
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-muted hover:text-ink hover:bg-hover'}`}
                          >
                            {n.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-3 align-top">
                    {acciones.length === 0 ? (
                      <span className="font-mono text-[10.5px] text-faint">Solo lectura</span>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        {acciones.map(accion => {
                          const state = actionState(modulo, accion)
                          return (
                            <button key={accion}
                              onClick={() => onToggleAction(roleIds, modulo, accion)}
                              className={`h-7 px-2.5 rounded-badge text-[11px] font-medium border transition-colors
                                ${state === 'on'
                                  ? 'bg-primary border-primary text-white'
                                  : state === 'mixed'
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'border-border text-muted hover:border-border-strong hover:text-ink'}`}
                            >
                              {state === 'mixed' ? `${ACCION_ABBR[accion]}·` : ACCION_LABELS[accion]}
                            </button>
                          )
                        })}
                      </div>
                    )}
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

export default PermissionsMatrix
