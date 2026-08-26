import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { initials } from '../../utils/initials'
import EmptyState from '../ui/EmptyState'

const PRIORIDAD_DOT = { alta: 'bg-error', media: 'bg-warning', baja: 'bg-success' }
const PROGRESS_COLOR = (avance) => (avance >= 80 ? 'bg-success' : avance < 35 ? 'bg-warning' : 'bg-primary')

const TABS = [
  { id: 'urgencia', label: 'Por urgencia' },
  { id: 'alta',     label: 'Prioridad alta' },
  { id: 'riesgo',   label: 'En riesgo' },
]

const diasHasta = (fecha) => {
  if (!fecha) return null
  const ms = new Date(fecha).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

const esRiesgo = (p) => {
  const dias = diasHasta(p.fecha_fin_estimada)
  if (dias === null) return false
  if (dias < 0 && p.avance < 100) return true
  if (dias <= 3 && p.avance < 90) return true
  return false
}

// projects: recientes del dashboard (id, nombre, prioridad, cliente, responsable, avance, fase_actual, fecha_fin_estimada)
const RecentProjects = ({ projects }) => {
  const navigate = useNavigate()
  const [tab, setTab] = useState('urgencia')

  const items = projects ?? []
  const filtered = tab === 'alta' ? items.filter(p => p.prioridad === 'alta')
    : tab === 'riesgo' ? items.filter(esRiesgo)
    : items

  return (
    <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk overflow-hidden">
      {/* Header */}
      <div className="px-[18px] py-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Proyectos en curso</h2>
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
          <Link to="/proyectos" className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors">
            Ver todos →
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Sin proyectos" description="Aún no hay proyectos registrados en el sistema." />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados" description="Ningún proyecto coincide con este filtro." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                {['Proyecto', 'Cliente', 'Responsable', 'Fase / avance', 'Fecha límite'].map((h, i) => (
                  <th key={i} className={`px-[18px] py-2.5 text-left font-mono text-[10px] font-semibold
                    uppercase tracking-[.06em] text-faint ${i === 1 ? 'hidden md:table-cell' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const dias = diasHasta(p.fecha_fin_estimada)
                const vencido = dias !== null && dias < 0 && p.avance < 100

                return (
                  <tr key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    className="hover:bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-[18px] py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 w-2 h-2 rounded-full ${PRIORIDAD_DOT[p.prioridad] || 'bg-faint'}`} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink truncate leading-tight">{p.nombre}</p>
                          <p className="font-mono text-[10px] text-faint mt-0.5 truncate">
                            #{p.id}{p.fase_actual ? ` · ${p.fase_actual}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-[18px] py-3 hidden md:table-cell">
                      <span className="text-[12px] text-muted truncate">{p.cliente || '—'}</span>
                    </td>
                    <td className="px-[18px] py-3">
                      {p.responsable ? (
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary
                            text-[9px] font-bold flex items-center justify-center"
                          >
                            {initials(p.responsable)}
                          </span>
                          <span className="text-[12px] text-muted truncate">{p.responsable}</span>
                        </div>
                      ) : <span className="text-[12px] text-faint">Sin asignar</span>}
                    </td>
                    <td className="px-[18px] py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-[72px] h-1.5 rounded-full bg-surface2 shrink-0">
                          <div className={`h-1.5 rounded-full transition-all duration-500 ${PROGRESS_COLOR(p.avance)}`}
                            style={{ width: `${p.avance}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-muted tabular-nums">{p.avance}%</span>
                      </div>
                    </td>
                    <td className="px-[18px] py-3">
                      {dias === null ? (
                        <span className="font-mono text-[10.5px] text-faint">Sin fecha</span>
                      ) : (
                        <span className={`font-mono text-[10px] font-semibold px-2 py-1 rounded-badge
                          ${vencido
                            ? 'bg-error/10 text-error'
                            : dias <= 3
                              ? 'bg-warning/10 text-warning'
                              : 'bg-surface2 border border-border text-faint'}`}
                        >
                          {vencido ? 'Vencido' : `En ${dias} día${dias !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecentProjects
