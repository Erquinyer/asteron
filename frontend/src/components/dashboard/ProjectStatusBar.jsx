const ESTADO_COLORS = {
  en_proceso: 'bg-primary',
  completado: 'bg-success',
  pendiente:  'bg-secondary',
}
const ESTADO_LABELS = {
  en_proceso: 'En proceso',
  completado: 'Completado',
  pendiente:  'Programado',
}

// charts: { porEstadoProyecto: [{name, value}], avancePromedio: number }
const ProjectStatusBar = ({ charts }) => {
  if (!charts) return null

  const data  = charts.porEstadoProyecto || []
  const total = data.reduce((s, d) => s + Number(d.value), 0)

  return (
    <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-[18px]">
      <h3 className="text-[15px] font-semibold text-ink">Proyectos por estado</h3>
      <p className="font-mono text-[10px] text-faint tracking-[.08em] uppercase mt-0.5 mb-4">
        Total {total} activos · estado derivado del avance de fases
      </p>

      {/* Barra segmentada */}
      <div className="h-[11px] w-full rounded-full overflow-hidden flex bg-surface2">
        {data.map((d, i) => {
          const pct = total > 0 ? (Number(d.value) / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div key={i} className={ESTADO_COLORS[d.name] || 'bg-faint'}
              style={{ width: `${pct}%` }}
            />
          )
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-4 space-y-2">
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((Number(d.value) / total) * 100) : 0
          return (
            <div key={i} className="flex items-center gap-2">
              <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${ESTADO_COLORS[d.name] || 'bg-faint'}`} />
              <span className="text-[12px] text-muted flex-1">
                {ESTADO_LABELS[d.name] || d.name}
              </span>
              <span className="font-mono text-[11px] text-ink tabular-nums">{d.value}</span>
              <span className="font-mono text-[10.5px] text-faint tabular-nums w-9 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>

      {/* Avance promedio */}
      <div className="mt-4 bg-surface2 border border-border rounded-control px-3.5 py-3 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold text-faint uppercase tracking-[.06em]">
          Avance promedio
        </span>
        <span className="text-[16px] font-semibold text-ink tabular-nums">{charts.avancePromedio}%</span>
      </div>
    </div>
  )
}

export default ProjectStatusBar
