import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

import StatCard       from '../components/dashboard/StatCard'
import RecentProjects from '../components/dashboard/RecentProjects'
import PlantToday     from '../components/dashboard/PlantToday'
import Spinner        from '../components/ui/Spinner'
import EmptyState     from '../components/ui/EmptyState'
import { useFetch }   from '../hooks/useFetch'
import { getDashboard } from '../api/dashboard.service'
import { getUser }    from '../utils/auth'
import { useDarkMode } from '../context/DarkModeContext'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const PRIORIDAD_COLORS = { alta: '#ef4444', media: '#f59e0b', baja: '#94a3b8' }
const ESTADO_MAQ_COLORS = {
  activa:           '#22c55e',
  en_mantenimiento: '#f59e0b',
  sin_asignar:      '#3b82f6',
  guardada:         '#a855f7',
  inactiva:         '#94a3b8',
  dado_de_baja:     '#ef4444',
}

const ESTADO_MAQ_LABELS = {
  activa:           'Activa',
  en_mantenimiento: 'En mtto.',
  sin_asignar:      'Sin asignar',
  guardada:         'Guardada',
  inactiva:         'Inactiva',
  dado_de_baja:     'Dado de baja',
}

const PRIORIDAD_LABELS = { alta: 'Alta', media: 'Media', baja: 'Baja' }

const Dashboard = () => {
  const user = getUser()
  const [dark] = useDarkMode()
  const { data, loading, error } = useFetch(getDashboard)

  if (loading) return <Spinner text="Cargando dashboard..." />
  if (error)   return <EmptyState title="Error al cargar" description={error} />

  const { stats, recientes, planta, charts } = data

  const statCards = [
    {
      id: 1, label: 'Proyectos activos', icon: 'folder', color: 'blue',
      value: stats.proyectos.total,
      total: Math.max(stats.proyectos.total, 1),
      suffix: `${stats.proyectos.destacado} prioridad alta`,
      to: '/proyectos',
    },
    {
      id: 2, label: 'Pedidos en sistema', icon: 'clipboard', color: 'amber',
      value: stats.pedidos.total,
      total: Math.max(stats.pedidos.total, 1),
      suffix: `${stats.pedidos.destacado} pendientes`,
      to: '/pedidos',
    },
    {
      id: 3, label: 'Equipos activos', icon: 'cog', color: 'green',
      value: stats.maquinaria.destacado,
      total: Math.max(stats.maquinaria.total, 1),
      suffix: `de ${stats.maquinaria.total} equipos`,
      to: '/maquinaria',
    },
    {
      id: 4, label: 'Usuarios activos', icon: 'users', color: 'purple',
      value: stats.usuarios.destacado,
      total: Math.max(stats.usuarios.total, 1),
      suffix: `de ${stats.usuarios.total} personas`,
      to: '/usuarios',
    },
  ]

  const plantaAdaptada = planta.map(item => ({
    id:       item.id_programacion,
    maquina:  item.maquina,
    operario: item.operario,
    proyecto: item.proyecto,
    horas:    item.tiempo_real
                ? (item.tiempo_real / 60).toFixed(1)
                : (item.tiempo_estimado / 60).toFixed(1),
    estado:   item.estado,
  }))

  const barData = (charts.porPrioridad || []).map(d => ({
    name:  PRIORIDAD_LABELS[d.name] || d.name,
    value: Number(d.value),
    fill:  PRIORIDAD_COLORS[d.name] || '#94a3b8',
  }))

  const pieData = (charts.porEstadoMaq || []).map(d => ({
    name:  ESTADO_MAQ_LABELS[d.name] || d.name,
    value: Number(d.value),
    fill:  ESTADO_MAQ_COLORS[d.name] || '#94a3b8',
  }))

  const axisColor  = dark ? '#94a3b8' : '#64748b'
  const tooltipBg  = dark ? '#1e293b' : '#ffffff'
  const tooltipBorder = dark ? '#334155' : '#e2e8f0'

  const ChartTooltip = ({ active, payload, unit }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: tooltipBg, border: `1px solid ${tooltipBorder}` }}
        className="rounded-lg px-3 py-2 shadow text-xs">
        <p className="font-medium text-slate-700 dark:text-slate-200">{payload[0].name ?? payload[0].payload?.name}</p>
        <p className="text-slate-500 dark:text-slate-400">{payload[0].value} {unit}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Saludo */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {getGreeting()}, {user?.nombre?.split(' ')[0]} 👋
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Aquí tienes el resumen del sistema Macromet.
        </p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>

      {/* Proyectos recientes + Planta hoy */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {recientes.length > 0
            ? <RecentProjects projects={recientes.map(p => ({ ...p, id: p.id_proyecto }))} />
            : <EmptyState title="Sin proyectos recientes" />}
        </div>
        <div>
          {plantaAdaptada.length > 0
            ? <PlantToday schedule={plantaAdaptada} />
            : <EmptyState title="Sin programación hoy" />}
        </div>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Barra — Proyectos por prioridad */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Proyectos por prioridad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: axisColor }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} width={20} />
              <Tooltip cursor={{ fill: dark ? '#334155' : '#f1f5f9' }}
                content={<ChartTooltip unit="proyectos" />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dona — Maquinaria por estado */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Maquinaria por estado</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip unit="equipos" />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Leyenda manual */}
            <div className="flex-1 space-y-2">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.fill }} />
                  <span className="text-xs text-slate-600 dark:text-slate-300">{entry.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default Dashboard
