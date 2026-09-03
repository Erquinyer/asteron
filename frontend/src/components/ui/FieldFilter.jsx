import { Search } from 'lucide-react'

// Buscador con selector de campo (ej: Todo / Cliente / Responsable) — el campo
// activo acota qué propiedad se compara contra el texto ingresado.
export default function FieldFilter({ fields, field, onFieldChange, value, onValueChange, className = '' }) {
  const current = fields.find(f => f.value === field) || fields[0]

  return (
    <div className={`flex items-center h-[38px] bg-surface border border-border
      rounded-control overflow-hidden focus-within:ring-2 focus-within:ring-primary/25
      focus-within:border-primary transition-colors ${className}`}
    >
      <select
        value={field}
        onChange={e => onFieldChange(e.target.value)}
        className="h-full pl-3 pr-6 bg-surface2 border-r border-border
          text-[12px] font-medium text-muted cursor-pointer
          focus:outline-none appearance-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%239097AD%22 stroke-width=%221.4%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {fields.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <div className="relative flex-1 min-w-0">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        <input
          value={value}
          onChange={e => onValueChange(e.target.value)}
          placeholder={current.placeholder || 'Buscar…'}
          className="w-full h-[38px] pl-7 pr-3 bg-transparent text-[13px]
            text-ink placeholder:text-faint focus:outline-none"
        />
      </div>
    </div>
  )
}
