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

// Colores para el donut de proyectos por estado
const ESTADO_PROY_COLORS = {
  en_proceso: '#4F46E5',
  completado: '#10B981',
  pendiente:  '#06B6D4',
}
const ESTADO_PROY_LABELS = {
  en_proceso: 'En proceso',
  completado: 'Completado',
  pendiente:  'Programado',
}

const Dashboard = () => {
  const user = getUser()
  const [dark] = useDarkMode()
  const { data, loading, error } = useFetch(getDashboard)

  if (loading) return <Spinner text="Cargando dashboard..." />
  if (error)   return <EmptyState title="Error al cargar" description={error} />

  const { stats, recientes, planta, charts } = data

  const statCards = [
    {
      id: 1, label: 'Proyectos activos', icon: 'folder', accent: 'primary',
      value: stats.proyectos.total,
      suffix: `${stats.proyectos.destacado} prioridad alta`,
      to: '/proyectos',
    },
    {
      id: 2, label: 'Pedidos en sistema', icon: 'cart', accent: 'secondary',
      value: stats.pedidos.total,
      suffix: `${stats.pedidos.destacado} pendientes`,
      to: '/pedidos',
    },
    {
      id: 3, label: 'Equipos activos', icon: 'wrench', accent: 'success',
      value: stats.maquinaria.destacado,
      suffix: `de ${stats.maquinaria.total} equipos`,
      to: '/maquinaria',
    },
    {
      id: 4, label: 'Usuarios activos', icon: 'users', accent: 'warning',
      value: stats.usuarios.destacado,
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

  const barData = charts.produccion7dias || []

  const pieData = (charts.porEstadoProyecto || []).map(d => ({
    name:  ESTADO_PROY_LABELS[d.name] || d.name,
    value: Number(d.value),
    fill:  ESTADO_PROY_COLORS[d.name] || '#9097AD',
  }))

  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  // Colores adaptativos para ejes y tooltips
  const axisColor   = dark ? '#646C86' : '#9097AD'
  const tooltipBg   = dark ? '#10141F' : '#FFFFFF'
  const tooltipBrd  = dark ? '#222839' : '#E7E9F2'
  const tooltipText = dark ? '#ECEFF8' : '#161A2B'
  const tooltipSub  = dark ? '#98A0B8' : '#5A6178'
  const inkColor    = dark ? '#ECEFF8' : '#161A2B'
  const faintColor  = dark ? '#646C86' : '#9097AD'

  const ChartTooltip = ({ active, payload, unit }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: tooltipBg, border: `1px solid ${tooltipBrd}`,
        borderRadius: '10px', padding: '8px 12px',
        boxShadow: '0 8px 24px rgba(0,0,0,.12)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 600, color: tooltipText, marginBottom: 2 }}>
          {payload[0].name ?? payload[0].payload?.name}
        </p>
        <p style={{ fontSize: '11px', color: tooltipSub, fontFamily: 'Geist Mono, monospace' }}>
          {payload[0].value} {unit}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Saludo */}
      <div>
        <h2 className="text-[20px] font-semibold text-ink">
          {getGreeting()}, {user?.nombre?.split(' ')[0]}
        </h2>
        <p className="font-mono text-[11.5px] text-faint mt-0.5 uppercase tracking-[.06em]">
          Resumen del sistema · Macromet S.A.S.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <StatCard key={stat.id} {...stat} />
        ))}
      </div>

      {/* ── Gráficas ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">

        {/* Barras — Carga de producción (7 días) */}
        <div className="bg-surface border border-border rounded-card shadow-card
          dark:shadow-card-dk p-[18px]"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Carga de producción</h3>
              <p className="font-mono text-[10px] text-faint tracking-[.08em] uppercase mt-0.5">
                Horas-Máquina · Últimos 7 días
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-mono text-[10px] text-faint">Programado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/30" />
                <span className="font-mono text-[10px] text-faint">Real</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={barData} barSize={20} barCategoryGap="35%"
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: axisColor, fontFamily: 'Geist Mono, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: axisColor, fontFamily: 'Geist Mono, monospace' }}
                axisLine={false} tickLine={false} width={24}
              />
              <Tooltip
                cursor={{ fill: dark ? '#171C2B' : '#F4F5FB', radius: 6 }}
                content={<ChartTooltip unit="h" />}
              />
              <Bar dataKey="programado" fill="#4F46E5"
                radius={[5, 5, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="real"
                fill={dark ? 'rgba(79,70,229,.35)' : 'rgba(79,70,229,.22)'}
                radius={[5, 5, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — Proyectos por estado */}
        <div className="bg-surface border border-border rounded-card shadow-card
          dark:shadow-card-dk p-[18px]"
        >
          <h3 className="text-[15px] font-semibold text-ink">Proyectos por estado</h3>
          <p className="font-mono text-[10px] text-faint tracking-[.08em] uppercase mt-0.5 mb-4">
            Total {pieTotal} activos
          </p>
          <div className="flex items-center gap-3">
            {/* Donut + label superpuesto (evita SVG Label de Recharts v3) */}
            <div className="relative shrink-0" style={{ width: '55%', height: 190 }}>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={54} outerRadius={82}
                    dataKey="value"
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip unit="proyectos" />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Label central */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-[22px] font-bold text-ink leading-none tabular-nums">{pieTotal}</p>
                  <p className="font-mono text-[9px] font-semibold text-faint tracking-[2px] uppercase mt-1">
                    PROYECTOS
                  </p>
                </div>
              </div>
            </div>

            {/* Leyenda manual */}
            <div className="flex-1 space-y-2 py-1">
              {pieData.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ background: entry.fill }} />
                  <span className="text-[12px] text-muted flex-1 truncate">{entry.name}</span>
                  <span className="font-mono text-[11px] text-faint tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Proyectos recientes + Planta hoy ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <div>
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
    </div>
  )
}

export default Dashboard
