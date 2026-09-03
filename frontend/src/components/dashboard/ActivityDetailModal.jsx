import { useNavigate } from 'react-router-dom'
import { X, Play, CheckCircle2, Clock, Ban, ArrowRight } from 'lucide-react'
import { initials } from '../../utils/initials'

const ESTADO_CONFIG = {
  en_proceso: { label: 'En proceso', badge: 'bg-primary/10 text-primary',     Icon: Play        },
  programado: { label: 'Programado', badge: 'bg-secondary/10 text-secondary', Icon: Clock       },
  completado: { label: 'Completado', badge: 'bg-success/10 text-success',     Icon: CheckCircle2 },
  cancelado:  { label: 'Cancelado',  badge: 'bg-error/10 text-error',         Icon: Ban          },
}

const fmtTime = (minutes) => {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// Vista de solo lectura de una actividad de planta, abierta desde "Programación
// de hoy" en el Dashboard. Las acciones (iniciar/completar/eliminar) siguen
// viviendo en el módulo de Programación — aquí solo se consulta la información.
export default function ActivityDetailModal({ item, onClose }) {
  const navigate = useNavigate()
  const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.programado
  const { Icon } = cfg

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-lg my-4 overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
              font-semibold px-2.5 py-[5px] rounded-badge ${cfg.badge}`}
            >
              <Icon size={12} /> {cfg.label}
            </span>
            <h3 className="text-[15px] font-semibold text-ink">Detalle de actividad</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px]
              bg-surface2 text-faint hover:text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Proyecto + Fase */}
          <div className="bg-surface2 rounded-[11px] p-4">
            <p className="font-mono text-[9px] font-semibold uppercase
              tracking-[.08em] text-faint mb-1">Proyecto</p>
            <p className="text-[18px] font-bold text-ink">
              {item.proyecto || 'Sin proyecto asignado'}
            </p>
            {item.fase_nombre && (
              <p className="text-[13px] text-primary mt-1 font-medium">
                Fase: {item.fase_nombre}
                {item.item_producto && (
                  <span className="ml-1.5 font-mono text-[10.5px] font-semibold
                    text-secondary bg-secondary/10 px-1.5 py-[2px] rounded-badge"
                  >
                    {item.item_producto}
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Operario</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-badge bg-primary/10 text-primary
                  text-[9px] font-bold flex items-center justify-center shrink-0"
                >
                  {initials(item.operario)}
                </div>
                <p className="text-[13px] font-semibold text-ink">
                  {item.operario || 'Sin asignar'}
                </p>
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Máquina / Equipo</p>
              <p className="text-[13px] font-medium text-ink">
                {item.maquina_codigo ? `[${item.maquina_codigo}] ` : ''}{item.maquina || 'Sin asignar'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Tiempo estimado</p>
              <p className="font-mono text-[13px] font-semibold text-ink">
                {fmtTime(item.tiempo_estimado)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Tiempo real</p>
              <p className={`font-mono text-[13px] font-semibold ${item.tiempo_real ? 'text-success' : 'text-faint'}`}>
                {item.tiempo_real ? fmtTime(item.tiempo_real) : '—'}
              </p>
            </div>
          </div>

          {item.observaciones && (
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Observaciones</p>
              <p className="text-[13px] text-muted italic bg-surface2
                rounded-[10px] p-3 leading-relaxed">
                "{item.observaciones}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface2">
          <button
            onClick={() => navigate('/programacion')}
            className="w-full h-10 flex items-center justify-center gap-2
              bg-primary hover:bg-primary-hover text-white
              rounded-control text-[13px] font-semibold shadow-btn transition-colors"
          >
            Gestionar en Programación <ArrowRight size={14} />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
