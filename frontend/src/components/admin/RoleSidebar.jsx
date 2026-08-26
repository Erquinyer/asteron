import { useState, useMemo } from 'react'
import { Search, Lock } from 'lucide-react'
import { MODULE_LABELS, ROL_INMUTABLE } from '../../hooks/usePermisosDraft'

// roles: [{ id_rol, nombre, descripcion, total_usuarios, modulos: {modulo: {acceso,...}} }]
const RoleSidebar = ({ roles, selectedIds, onSelect }) => {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(r => {
      if (r.nombre.toLowerCase().includes(q)) return true
      if ((r.descripcion || '').toLowerCase().includes(q)) return true
      return Object.keys(r.modulos)
        .filter(m => r.modulos[m].acceso)
        .some(m => MODULE_LABELS[m].toLowerCase().includes(q))
    })
  }, [roles, search])

  const handleClick = (rol, e) => {
    if (rol.nombre === ROL_INMUTABLE) return
    const additive = e.metaKey || e.ctrlKey || e.shiftKey
    onSelect(rol.id_rol, additive)
  }

  return (
    <div className="w-full lg:w-[312px] shrink-0 bg-surface2 border border-border rounded-card overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13.5px] font-semibold text-ink">Roles</h2>
          <span className="font-mono text-[10.5px] text-faint">{roles.length}</span>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar rol o módulo…"
            className="w-full h-9 pl-8 pr-3 border border-border rounded-control
              text-[12.5px] bg-surface text-ink placeholder:text-faint
              focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors"
          />
        </div>
        <p className="font-mono text-[9.5px] text-faint uppercase tracking-[.06em] mt-2">
          Clic = editar · ⌘/Ctrl+clic = varios
        </p>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-border">
        {filtered.map(rol => {
          const isAdmin    = rol.nombre === ROL_INMUTABLE
          const isSelected = selectedIds.includes(rol.id_rol)
          const totalMod   = Object.keys(rol.modulos).length
          const conAcceso  = Object.values(rol.modulos).filter(m => m.acceso).length

          return (
            <button
              key={rol.id_rol}
              onClick={(e) => handleClick(rol, e)}
              disabled={isAdmin}
              className={`w-full text-left px-4 py-3 transition-colors relative
                ${isAdmin
                  ? 'cursor-default opacity-70'
                  : isSelected
                    ? 'bg-hover'
                    : 'hover:bg-hover'}`}
            >
              {isSelected && !isAdmin && (
                <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary" />
              )}
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[12.5px] font-semibold truncate ${isAdmin ? 'text-primary' : 'text-ink'}`}>
                  {rol.nombre}
                  {isAdmin && <Lock size={10} className="inline ml-1.5 opacity-60" />}
                </p>
                <span className="shrink-0 font-mono text-[10px] text-faint tabular-nums">
                  {conAcceso}/{totalMod}
                </span>
              </div>
              <p className="font-mono text-[10px] text-faint mt-1">
                {isAdmin ? 'Inmutable' : `${rol.total_usuarios ?? 0} usuario${rol.total_usuarios === 1 ? '' : 's'}`}
              </p>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[12.5px] text-faint">Sin resultados</p>
        )}
      </div>
    </div>
  )
}

export default RoleSidebar
