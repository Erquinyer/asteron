import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

import KpiStrip           from '../components/dashboard/KpiStrip'
import AttentionList      from '../components/dashboard/AttentionList'
import ProductionChart    from '../components/dashboard/ProductionChart'
import ProjectStatusBar   from '../components/dashboard/ProjectStatusBar'
import PlantToday         from '../components/dashboard/PlantToday'
import RecentProjects     from '../components/dashboard/RecentProjects'
import { KpiStripSkeleton, CardSkeleton, ListSkeleton } from '../components/dashboard/DashboardSkeleton'
import EmptyState         from '../components/ui/EmptyState'
import { useFetch }       from '../hooks/useFetch'
import { getDashboard }   from '../api/dashboard.service'
import { getUser, canDo } from '../utils/auth'
import { useDarkMode }    from '../context/DarkModeContext'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

const getTurno = () => {
  const h = new Date().getHours()
  if (h >= 6 && h < 14)  return 'Turno diurno en curso'
  if (h >= 14 && h < 22) return 'Turno tarde en curso'
  return 'Turno nocturno en curso'
}

const BLOCK_LABELS = {
  kpis: 'los indicadores', alertas: 'las alertas', recientes: 'los proyectos',
  planta: 'la programación de hoy', charts: 'las gráficas',
}

const RetryButton = ({ onClick }) => (
  <button onClick={onClick}
    className="h-9 flex items-center gap-1.5 px-3.5 border border-border rounded-control
      text-[12.5px] font-medium text-muted hover:text-ink hover:bg-hover transition-colors"
  >
    <RefreshCw size={13} /> Reintentar
  </button>
)

const Dashboard = () => {
  const user = getUser()
  const [dark] = useDarkMode()
  const { data, loading, error, refresh } = useFetch(getDashboard)

  // Si el backend degradó algún bloque (llegó en null), avisamos una sola vez
  useEffect(() => {
    if (!data) return
    const caidos = Object.keys(BLOCK_LABELS).filter(k => data[k] == null)
    if (caidos.length > 0) {
      toast.error(`No se pudo cargar ${caidos.map(k => BLOCK_LABELS[k]).join(', ')}`)
    }
  }, [data])

  if (error) {
    return (
      <EmptyState
        title="Error al cargar el dashboard"
        description={error}
        action={<RetryButton onClick={refresh} />}
      />
    )
  }

  const puedeProgramar = canDo('programacion', 'crear')
  const today = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(',', '').toUpperCase()

  const recientesConId = data?.recientes?.map(p => ({ ...p, id: p.id_proyecto })) ?? null

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-ink">
            {getGreeting()}, {user?.nombre?.split(' ')[0]}
          </h2>
          <p className="font-mono text-[11.5px] text-faint mt-0.5 uppercase tracking-[.06em]">
            {today} · {getTurno()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/programacion"
            className="h-9 flex items-center px-3.5 border border-border rounded-control
              text-[12.5px] font-medium text-muted hover:text-ink hover:bg-hover transition-colors"
          >
            Ver planta
          </Link>
          {puedeProgramar && (
            <Link to="/programacion"
              className="h-9 flex items-center px-3.5 bg-primary hover:bg-primary-hover text-white
                text-[12.5px] font-semibold rounded-control shadow-btn transition-colors"
            >
              + Programar turno
            </Link>
          )}
        </div>
      </div>

      {/* KPIs accionables */}
      {loading ? <KpiStripSkeleton /> : data.kpis
        ? <KpiStrip kpis={data.kpis} />
        : <EmptyState title="No se pudieron cargar los indicadores" action={<RetryButton onClick={refresh} />} />}

      {/* Programación de hoy + Requiere atención */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-stretch">
        {loading ? <ListSkeleton rows={4} /> : data.planta
          ? <PlantToday schedule={data.planta} />
          : <EmptyState title="No se pudo cargar la programación de hoy" action={<RetryButton onClick={refresh} />} />}
        {loading ? <CardSkeleton height={220} /> : data.alertas
          ? <AttentionList alertas={data.alertas} />
          : <EmptyState title="No se pudieron cargar las alertas" action={<RetryButton onClick={refresh} />} />}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        {loading ? <CardSkeleton height={200} /> : data.charts
          ? <ProductionChart charts={data.charts} dark={dark} />
          : <EmptyState title="No se pudo cargar la gráfica de producción" action={<RetryButton onClick={refresh} />} />}
        {loading ? <CardSkeleton height={160} /> : data.charts
          ? <ProjectStatusBar charts={data.charts} />
          : <EmptyState title="No se pudo cargar el estado de proyectos" action={<RetryButton onClick={refresh} />} />}
      </div>

      {/* Proyectos en curso */}
      {loading ? <ListSkeleton rows={5} /> : data.recientes
        ? <RecentProjects projects={recientesConId} />
        : <EmptyState title="No se pudo cargar la lista de proyectos" action={<RetryButton onClick={refresh} />} />}
    </div>
  )
}

export default Dashboard
