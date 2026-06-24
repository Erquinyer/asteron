// Configuración de badges por estado y prioridad
const estadoBadge = {
  en_curso:   'bg-blue-100 text-blue-700',
  pendiente:  'bg-amber-100 text-amber-700',
  completada: 'bg-green-100 text-green-700',
  bloqueada:  'bg-red-100 text-red-700',
}

const estadoLabel = {
  en_curso:   'En curso',
  pendiente:  'Pendiente',
  completada: 'Completada',
  bloqueada:  'Bloqueada',
}

const prioridadBadge = {
  alta:  'bg-red-100 text-red-600',
  media: 'bg-yellow-100 text-yellow-700',
  baja:  'bg-slate-100 text-slate-600',
}

const RecentProjects = ({ projects }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Encabezado */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-800">Proyectos recientes</h2>
        <button className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
          Ver todos →
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
              <th className="px-6 py-3">Proyecto</th>
              <th className="px-6 py-3 hidden md:table-cell">Cliente</th>
              <th className="px-6 py-3">Prioridad</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Avance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                {/* Nombre */}
                <td className="px-6 py-4 font-medium text-slate-800 max-w-[200px] truncate">
                  {p.nombre}
                </td>

                {/* Cliente */}
                <td className="px-6 py-4 text-slate-500 hidden md:table-cell">
                  {p.cliente}
                </td>

                {/* Prioridad */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium capitalize ${prioridadBadge[p.prioridad]}`}>
                    {p.prioridad}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${estadoBadge[p.estado]}`}>
                    {estadoLabel[p.estado]}
                  </span>
                </td>

                {/* Avance */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5 min-w-[60px]">
                      <div
                        className="bg-slate-700 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${p.avance}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{p.avance}%</span>
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
