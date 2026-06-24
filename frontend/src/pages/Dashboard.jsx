import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

import StatCard       from '../components/dashboard/StatCard'
import RecentProjects from '../components/dashboard/RecentProjects'
import PlantToday     from '../components/dashboard/PlantToday'
import Spinner        from '../components/ui/Spinner'
import EmptyState     from '../components/ui/EmptyState'
import { useFetch }   from '../hooks/useFetch'
import { getDashboard } from '../api/dashboard.service'
import { getUser }    from '../utils/auth'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const initials = (nombre) =>
  (nombre || 'U').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

// Colores para las gráficas
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

// Tooltip personalizado para el PieChart
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="font-medium text-slate-700">{payload[0].name}</p>
      <p className="text-slate-500">{payload[0].value} equipos</p>
    </div>
  )
}

const Dashboard = () => {
  const user = getUser()
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
    },
    {
      id: 2, label: 'Pedidos en sistema', icon: 'clipboard', color: 'amber',
      value: stats.pedidos.total,
      total: Math.max(stats.pedidos.total, 1),
      suffix: `${stats.pedidos.destacado} pendientes`,
    },
    {
      id: 3, label: 'Equipos activos', icon: 'cog', color: 'green',
      value: stats.maquinaria.destacado,
      total: Math.max(stats.maquinaria.total, 1),
      suffix: `de ${stats.maquinaria.total} equipos`,
    },
    {
      id: 4, label: 'Usuarios activos', icon: 'users', color: 'purple',
      value: stats.usuarios.destacado,
      total: Math.max(stats.usuarios.total, 1),
      suffix: `de ${stats.usuarios.total} personas`,
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

  // Preparar datos de gráficas
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Saludo + tarjeta de perfil */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            {getGreeting()}, {user?.nombre?.split(' ')[0]} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Aquí tienes el resumen del sistema Macromet.
          </p>
        </div>

        {/* Tarjeta de perfil del usuario activo */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm shrink-0">
          <div className="w-11 h-11 rounded-full bg-slate-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
            {initials(user?.nombre)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.nombre}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
              {user?.rol || 'Sin rol'}
            </span>
          </div>
        </div>
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
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Proyectos por prioridad</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={40}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                content={({ active, payload }) =>
                  active && payload?.length
                    ? <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
                        <p className="font-medium text-slate-700">{payload[0].payload.name}</p>
                        <p className="text-slate-500">{payload[0].value} proyectos</p>
                      </div>
                    : null
                }
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Dona — Maquinaria por estado */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Maquinaria por estado</h3>
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
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Leyenda manual */}
            <div className="flex-1 space-y-2">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: entry.fill }} />
                  <span className="text-xs text-slate-600">{entry.name}</span>
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
