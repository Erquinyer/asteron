import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

const DOT = { error: 'bg-error', warning: 'bg-warning', info: 'bg-primary' }

// alertas: [{ tipo, severidad, titulo, meta, ruta }] — ya vienen ordenadas por severidad
const AttentionList = ({ alertas }) => {
  const navigate = useNavigate()
  const items = alertas ?? []

  return (
    <div className="bg-surface border border-border rounded-card shadow-card
      dark:shadow-card-dk overflow-hidden h-full flex flex-col"
    >
      <div className="px-[18px] py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-ink">Requiere atención</h2>
        <p className="font-mono text-[10px] text-faint tracking-[.08em] uppercase mt-0.5">
          Calculado desde fecha límite, avance y estado de equipos
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <CheckCircle2 size={26} className="text-success" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-ink">Todo en orden</p>
          <p className="text-[11.5px] text-faint leading-relaxed">
            Sin proyectos vencidos, turnos sin operario, pedidos estancados
            ni exceso de equipos fuera de servicio.
          </p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-border overflow-y-auto">
          {items.map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.ruta)}
              className="w-full text-left px-[18px] py-3 flex items-start gap-3 hover:bg-hover transition-colors"
            >
              <span className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${DOT[a.severidad] || 'bg-faint'}`} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink leading-tight truncate">{a.titulo}</p>
                <p className="font-mono text-[10.5px] text-faint mt-0.5 truncate">{a.meta}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default AttentionList
