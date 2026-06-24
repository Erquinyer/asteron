import { Clock } from 'lucide-react'

const estadoConfig = {
  en_proceso: { label: 'En proceso', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'   },
  programado: { label: 'Programado', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  completado: { label: 'Completado', style: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  cancelado:  { label: 'Cancelado',  style: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'     },
}

const PlantToday = ({ schedule }) => {
  const today = new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Programación de planta</h2>
          <p className="text-xs text-slate-400 mt-0.5 capitalize">{today}</p>
        </div>
        <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          Ver completa →
        </button>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {schedule.map((item) => {
          const config = estadoConfig[item.estado] || estadoConfig.programado
          return (
            <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.maquina}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                  {item.operario} · {item.proyecto}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                  <Clock size={13} />
                  <span className="text-xs">{item.horas}h</span>
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${config.style}`}>
                  {config.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlantToday
