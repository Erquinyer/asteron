import { Link, useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, Clock, Ban } from 'lucide-react'

const estadoConfig = {
  en_proceso: {
    label: 'En proceso',
    dot:   'bg-primary',
    badge: 'bg-primary/10 text-primary',
    Icon:  Play,
    iconBg: 'bg-primary/10 text-primary',
  },
  programado: {
    label: 'Programado',
    dot:   'bg-secondary',
    badge: 'bg-secondary/10 text-secondary',
    Icon:  Clock,
    iconBg: 'bg-secondary/10 text-secondary',
  },
  completado: {
    label: 'Completado',
    dot:   'bg-success',
    badge: 'bg-success/10 text-success',
    Icon:  CheckCircle2,
    iconBg: 'bg-success/10 text-success',
  },
  cancelado: {
    label: 'Cancelado',
    dot:   'bg-error',
    badge: 'bg-error/10 text-error',
    Icon:  Ban,
    iconBg: 'bg-error/10 text-error',
  },
}

const PlantToday = ({ schedule }) => {
  const navigate = useNavigate()
  const count    = schedule.length

  return (
    <div className="bg-surface border border-border rounded-card shadow-card
      dark:shadow-card-dk overflow-hidden"
    >
      {/* Header */}
      <div className="px-[18px] py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Programación de hoy</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold tracking-[.08em]
            bg-surface2 border border-border text-faint px-2 py-1 rounded-badge uppercase"
          >
            {count} {count === 1 ? 'turno' : 'turnos'}
          </span>
          <Link
            to="/programacion"
            className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Ver →
          </Link>
        </div>
      </div>

      <div className="divide-y divide-border">
        {schedule.map((item) => {
          const cfg = estadoConfig[item.estado] || estadoConfig.programado
          const { Icon } = cfg
          return (
            <div
              key={item.id}
              onClick={() => navigate('/programacion')}
              className="px-[18px] py-3 flex items-center gap-3
                hover:bg-hover transition-colors cursor-pointer"
            >
              {/* Ícono de estado en cuadro tintado */}
              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center
                shrink-0 ${cfg.iconBg}`}
              >
                <Icon size={14} />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate leading-tight">
                  {item.maquina}
                </p>
                <p className="font-mono text-[10.5px] text-faint mt-0.5 truncate">
                  {item.operario}
                  {item.proyecto ? ` · ${item.proyecto}` : ''}
                </p>
              </div>

              {/* Badge de estado */}
              <span className={`shrink-0 font-mono text-[10px] font-semibold
                px-2 py-1 rounded-badge ${cfg.badge}`}
              >
                {cfg.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlantToday
