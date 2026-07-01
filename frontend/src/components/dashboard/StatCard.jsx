import { Link } from 'react-router-dom'
import {
  FolderKanban, ShoppingCart, Wrench, Users,
  TrendingUp, TrendingDown,
} from 'lucide-react'

const accentMap = {
  primary:   { bar: 'bg-primary',   iconBg: 'bg-primary/10',   iconText: 'text-primary'   },
  secondary: { bar: 'bg-secondary', iconBg: 'bg-secondary/10', iconText: 'text-secondary' },
  success:   { bar: 'bg-success',   iconBg: 'bg-success/10',   iconText: 'text-success'   },
  warning:   { bar: 'bg-warning',   iconBg: 'bg-warning/10',   iconText: 'text-warning'   },
  error:     { bar: 'bg-error',     iconBg: 'bg-error/10',     iconText: 'text-error'     },
}

const iconMap = {
  folder:    FolderKanban,
  cart:      ShoppingCart,
  wrench:    Wrench,
  users:     Users,
  // soporte de nombres anteriores
  clipboard: ShoppingCart,
  cog:       Wrench,
}

const StatCard = ({ label, value, suffix, accent = 'primary', icon, to, delta }) => {
  const styles     = accentMap[accent] || accentMap.primary
  const Icon       = iconMap[icon] || FolderKanban
  const isPositive = delta === undefined || delta >= 0

  const inner = (
    <div className="relative overflow-hidden bg-surface border border-border
      rounded-card shadow-card dark:shadow-card-dk p-[18px] flex flex-col gap-3"
    >
      {/* Barra de acento superior */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${styles.bar}`} />

      {/* Ícono + delta */}
      <div className="flex items-start justify-between pt-1">
        <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0
          ${styles.iconBg} ${styles.iconText}`}
        >
          <Icon size={20} />
        </div>

        {delta !== undefined ? (
          <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold
            px-2 py-1 rounded-badge
            ${isPositive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}
          >
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(delta)}%
          </span>
        ) : null}
      </div>

      {/* Número + label + sublabel */}
      <div>
        <p className="text-[30px] font-bold text-ink leading-none tabular-nums">{value}</p>
        <p className="text-[13px] font-medium text-muted mt-1.5">{label}</p>
        {suffix && (
          <p className="font-mono text-[11px] text-faint mt-0.5">{suffix}</p>
        )}
      </div>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block transition-transform duration-150 hover:-translate-y-0.5">
        {inner}
      </Link>
    )
  }
  return inner
}

export default StatCard
