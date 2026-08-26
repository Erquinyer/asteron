import { useNavigate } from 'react-router-dom'

const TONE = {
  error:   'bg-error/10 text-error',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  neutral: 'bg-surface2 border border-border text-faint',
}
const FOOTER_TONE = { faint: 'text-faint', warning: 'text-warning', error: 'text-error' }

const Cell = ({ label, value, unit, badge, badgeTone = 'neutral', progress, footer, footerTone = 'faint', to }) => {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      className="bg-surface text-left p-4 hover:bg-hover transition-colors"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-faint">
          {label}
        </span>
        {badge && (
          <span className={`shrink-0 font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-badge ${TONE[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[27px] font-semibold text-ink leading-none tabular-nums">{value}</span>
        {unit && <span className="text-[12px] text-muted">{unit}</span>}
      </div>
      <div className="h-1 rounded-full bg-surface2 mt-3 overflow-hidden">
        <div
          className="h-1 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
        />
      </div>
      <p className={`font-mono text-[10px] mt-2 truncate ${FOOTER_TONE[footerTone]}`}>{footer}</p>
    </button>
  )
}

// kpis: { turnosHoy, cumplimiento, riesgo, capacidad } — ver dashboard.controller.js
const KpiStrip = ({ kpis }) => {
  if (!kpis) return null
  const { turnosHoy, cumplimiento, riesgo, capacidad } = kpis

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-card overflow-hidden
      border border-border shadow-card dark:shadow-card-dk"
    >
      <Cell
        label="Turnos de hoy" to="/programacion"
        value={turnosHoy.total} unit="turnos"
        badge={`${turnosHoy.enCurso} en curso`}
        badgeTone={turnosHoy.enCurso > 0 ? 'success' : 'neutral'}
        progress={turnosHoy.total > 0 ? (turnosHoy.enCurso / turnosHoy.total) * 100 : 0}
        footer={turnosHoy.sinOperario > 0
          ? `${turnosHoy.sinOperario} sin operario asignado`
          : 'Todos los turnos asignados'}
        footerTone={turnosHoy.sinOperario > 0 ? 'error' : 'faint'}
      />
      <Cell
        label="Cumplimiento planta" to="/programacion"
        value={`${cumplimiento.pct}%`}
        badge={`${cumplimiento.deltaPct >= 0 ? '+' : ''}${cumplimiento.deltaPct}%`}
        badgeTone={cumplimiento.deltaPct >= 0 ? 'success' : 'error'}
        progress={cumplimiento.pct}
        footer={`${cumplimiento.horasReales} de ${cumplimiento.horasProgramadas} horas-máquina`}
      />
      <Cell
        label="Proyectos en riesgo" to="/proyectos"
        value={riesgo.total} unit="proyectos"
        badge={riesgo.total > 0 ? 'REVISAR' : 'OK'}
        badgeTone={riesgo.total > 0 ? 'warning' : 'success'}
        progress={riesgo.total > 0 ? (riesgo.vencidos / riesgo.total) * 100 : 0}
        footer={`${riesgo.vencidos} vencidos · ${riesgo.porVencer} por vencer`}
        footerTone={riesgo.vencidos > 0 ? 'error' : 'faint'}
      />
      <Cell
        label="Capacidad disponible" to="/maquinaria"
        value={capacidad.activos} unit="equipos"
        badge={`${capacidad.pct}%`}
        progress={capacidad.pct}
        footer={`${capacidad.total - capacidad.activos} inactivos o en mantenimiento`}
      />
    </div>
  )
}

export default KpiStrip
