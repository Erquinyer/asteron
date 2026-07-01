import { useNavigate, Link } from 'react-router-dom'

const prioridadDot = {
  alta:  'bg-error',
  media: 'bg-warning',
  baja:  'bg-success',
}

const progressColor = (avance) => {
  if (avance >= 80) return 'bg-success'
  if (avance < 35)  return 'bg-warning'
  return 'bg-primary'
}

const RecentProjects = ({ projects }) => {
  const navigate = useNavigate()

  return (
    <div className="bg-surface border border-border rounded-card shadow-card
      dark:shadow-card-dk overflow-hidden"
    >
      {/* Header */}
      <div className="px-[18px] py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Proyectos recientes</h2>
        <Link
          to="/proyectos"
          className="text-[13px] font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      <div className="divide-y divide-border">
        {projects.map((p) => (
          <div
            key={p.id}
            onClick={() => navigate(`/proyectos/${p.id}`)}
            className="px-[18px] py-3 flex items-center gap-3 hover:bg-hover
              transition-colors cursor-pointer"
          >
            {/* Dot de prioridad */}
            <span className={`shrink-0 w-2 h-2 rounded-full ${prioridadDot[p.prioridad] || 'bg-faint'}`} />

            {/* Nombre + sublabel */}
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium text-ink truncate leading-tight">
                {p.nombre}
              </p>
              <p className="font-mono text-[10.5px] text-faint mt-0.5 truncate">
                #{p.id}{p.cliente ? ` · ${p.cliente}` : ''}
              </p>
            </div>

            {/* Barra de avance + % */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-[84px] h-1.5 rounded-full bg-surface2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${progressColor(p.avance)}`}
                  style={{ width: `${p.avance}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-muted w-8 text-right tabular-nums">
                {p.avance}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default RecentProjects
