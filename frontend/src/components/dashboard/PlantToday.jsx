import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, CheckCircle2, Clock, Ban, UserX } from 'lucide-react'
import { initials } from '../../utils/initials'
import { canDo } from '../../utils/auth'
import { relativeTime } from '../../utils/format'
import EmptyState from '../ui/EmptyState'
import ActivityDetailModal from './ActivityDetailModal'

const ESTADO_CONFIG = {
  en_proceso: { label: 'En proceso', badge: 'bg-primary/10 text-primary',     Icon: Play,        iconBg: 'bg-primary/10 text-primary'     },
  programado: { label: 'Programado', badge: 'bg-secondary/10 text-secondary', Icon: Clock,       iconBg: 'bg-secondary/10 text-secondary' },
  completado: { label: 'Completado', badge: 'bg-success/10 text-success',     Icon: CheckCircle2,iconBg: 'bg-success/10 text-success'     },
  cancelado:  { label: 'Cancelado',  badge: 'bg-error/10 text-error',         Icon: Ban,         iconBg: 'bg-error/10 text-error'         },
}

const TABS = [
  { id: 'todos',      label: 'Todos' },
  { id: 'en_proceso', label: 'En proceso' },
  { id: 'programado', label: 'Por iniciar' },
]

const horas = (min) => (min ? (min / 60).toFixed(1) : '0.0')

// schedule: filas crudas de planta (ver dashboard.controller.js) — puede ser [] o null
const PlantToday = ({ schedule }) => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('todos')
  const [selectedItem, setSelectedItem] = useState(null)

  const items = schedule ?? []
  const filtered = tab === 'todos' ? items : items.filter(i => i.estado === tab)

  const times = items.map(i => i.updated_at).filter(Boolean).sort().reverse()
  const ultimaActualizacion = times[0] ? relativeTime(times[0]) : null

  const puedeProgramar = canDo('programacion', 'crear')

  return (
    <div className="bg-surface border border-border rounded-card shadow-card
      dark:shadow-card-dk overflow-hidden h-full flex flex-col"
    >
      {/* Header */}
      <div className="px-[18px] py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Programación de hoy</h2>
          <p className="font-mono text-[10.5px] text-faint mt-0.5">
            {items.length} turno{items.length !== 1 ? 's' : ''} programado{items.length !== 1 ? 's' : ''}
            {' · '}{items.filter(i => i.maquina).length > 0
              ? `${new Set(items.map(i => i.maquina).filter(Boolean)).size} máquinas en uso`
              : 'sin máquinas asignadas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 p-0.5 bg-surface2 border border-border rounded-control">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-colors
                  ${tab === t.id ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido */}
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="No hay turnos programados para hoy"
            description="Programa un turno o revisa la semana completa."
            action={(
              <div className="flex items-center gap-2">
                {puedeProgramar && (
                  <button onClick={() => navigate('/programacion')}
                    className="h-9 px-3.5 bg-primary hover:bg-primary-hover text-white
                      text-[12.5px] font-semibold rounded-control shadow-btn transition-colors"
                  >
                    Programar turno
                  </button>
                )}
                <Link to="/programacion"
                  className="h-9 px-3.5 flex items-center border border-border rounded-control
                    text-[12.5px] font-medium text-muted hover:text-ink hover:bg-hover transition-colors"
                >
                  Ver semana
                </Link>
              </div>
            )}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="Sin turnos en este filtro" description="Prueba con otra pestaña." />
        </div>
      ) : (
        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {filtered.map((item) => {
            const cfg = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.programado
            const { Icon } = cfg
            const sinOperario = !item.operario && ['programado', 'en_proceso'].includes(item.estado)

            return (
              <div
                key={item.id_programacion}
                onClick={() => setSelectedItem(item)}
                className="px-[18px] py-3 flex items-center gap-3 hover:bg-hover transition-colors cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                  <Icon size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink truncate leading-tight">
                    {item.fase_nombre || item.observaciones?.split('\n')[0] || 'Actividad sin nombre'}
                    {item.item_producto && (
                      <span className="ml-1.5 font-mono text-[10px] font-semibold text-secondary
                        bg-secondary/10 px-1.5 py-[1px] rounded-badge align-middle"
                      >
                        {item.item_producto}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.operario && (
                      <span className="shrink-0 w-4 h-4 rounded-full bg-primary/15 text-primary
                        text-[8px] font-bold flex items-center justify-center"
                      >
                        {initials(item.operario)}
                      </span>
                    )}
                    <p className="font-mono text-[10.5px] text-faint truncate">
                      {item.operario || 'Sin operario'}
                      {' · '}{item.maquina || 'Sin máquina'}
                      {item.proyecto ? ` · ${item.proyecto}` : ''}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 font-mono text-[10px] text-faint tabular-nums hidden sm:inline">
                  Est. {horas(item.tiempo_estimado)}h · Real {item.tiempo_real ? `${horas(item.tiempo_real)}h` : '—'}
                </span>

                {sinOperario ? (
                  <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] font-semibold
                    px-2 py-1 rounded-badge bg-error/10 text-error"
                  >
                    <UserX size={10} /> Sin operario
                  </span>
                ) : (
                  <span className={`shrink-0 font-mono text-[10px] font-semibold px-2 py-1 rounded-badge ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pie */}
      {items.length > 0 && (
        <div className="px-[18px] py-2.5 border-t border-border flex items-center justify-between">
          <span className="font-mono text-[10px] text-faint uppercase tracking-[.04em]">
            {ultimaActualizacion ? `Horas reales actualizadas ${ultimaActualizacion}` : 'Sin actualizaciones registradas'}
          </span>
          <Link to="/programacion" className="text-[12px] font-medium text-primary hover:text-primary-hover transition-colors">
            Ver programación completa →
          </Link>
        </div>
      )}

      {selectedItem && (
        <ActivityDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

export default PlantToday
