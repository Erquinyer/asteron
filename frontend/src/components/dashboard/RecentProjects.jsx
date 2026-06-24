import { useNavigate, Link } from 'react-router-dom'

const estadoBadge = {
  en_curso:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  pendiente:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  completada: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  bloqueada:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const estadoLabel = {
  en_curso:   'En curso',
  pendiente:  'Pendiente',
  completada: 'Completada',
  bloqueada:  'Bloqueada',
}

const prioridadBadge = {
  alta:  'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  media: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  baja:  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

const RecentProjects = ({ projects }) => {
  const navigate = useNavigate()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Proyectos recientes</h2>
        <Link
          to="/proyectos"
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          Ver todos →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              <th className="px-6 py-3">Proyecto</th>
              <th className="px-6 py-3 hidden md:table-cell">Cliente</th>
              <th className="px-6 py-3">Prioridad</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Avance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {projects.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/proyectos/${p.id}`)}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                title={`Ver detalle: ${p.nombre}`}
              >
                <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200 max-w-[200px]">
                  <span className="truncate block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {p.nombre}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell">
                  {p.cliente}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${prioridadBadge[p.prioridad]}`}>
                    {p.prioridad}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${estadoBadge[p.estado]}`}>
                    {estadoLabel[p.estado]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-600 rounded-full h-1.5 min-w-[60px]">
                      <div
                        className="bg-slate-700 dark:bg-slate-300 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${p.avance}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-8 text-right">{p.avance}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default RecentProjects
