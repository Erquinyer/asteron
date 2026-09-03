import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

// Selector con búsqueda: por defecto muestra los `recentCount` primeros
// elementos de `options` (se asume que ya vienen ordenados por recencia,
// el más nuevo primero) y, si lo que se busca no está ahí, permite filtrar
// por texto sobre la lista completa sin salir del formulario.
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar…',
  searchPlaceholder = 'Buscar…',
  recentLabel = 'Recientes',
  recentCount = 5,
  emptyText = 'Sin resultados',
  disabled = false,
  clearable = false,
  className = '',
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const rootRef  = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find(o => String(o.value) === String(value))

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter(o =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel || '').toLowerCase().includes(q))
    : options.slice(0, recentCount)

  const showingRecent = !q && options.length > recentCount

  const handleSelect = (opt) => {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className={`w-full h-10 flex items-center justify-between gap-2 border border-border
          rounded-control px-3 text-[13px] bg-surface2 text-left transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
          disabled:opacity-60 disabled:cursor-not-allowed
          ${open ? 'ring-2 ring-primary/25 border-primary' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-ink' : 'text-faint'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="p-0.5 rounded text-faint hover:text-error hover:bg-error/10 transition-colors"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown size={14} className={`text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20
          bg-surface border border-border rounded-control shadow-modal
          overflow-hidden animate-md-in"
        >
          <div className="relative border-b border-border">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-8 pr-3 bg-transparent text-[13px]
                text-ink placeholder:text-faint focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {showingRecent && (
              <p className="px-3 pt-1.5 pb-1 font-mono text-[10px] font-semibold
                uppercase tracking-[.06em] text-faint"
              >
                {recentLabel}
              </p>
            )}
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-[12.5px] text-faint text-center">{emptyText}</p>
            ) : (
              filtered.map(opt => {
                const isSelected = String(opt.value) === String(value)
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left
                      transition-colors hover:bg-hover
                      ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-[13px] text-ink truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="block font-mono text-[10.5px] text-faint truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 text-primary" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
