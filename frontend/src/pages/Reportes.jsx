import { useState } from 'react'
import { Clock3, FileSpreadsheet, FileText, TrendingUp, Wrench, AlertTriangle } from 'lucide-react'
import { useFetch } from '../hooks/useFetch'
import {
  getReporteHoras, getReporteAvance, getReporteMantenimientos, exportarReporte,
} from '../api/reportes.service'
import { getProyectos }  from '../api/proyectos.service'
import { getUsuarios }   from '../api/usuarios.service'
import { getMaquinaria } from '../api/maquinaria.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const TABS = [
  { id: 'horas',          label: 'Horas',          icon: Clock3     },
  { id: 'avance',         label: 'Avance',         icon: TrendingUp },
  { id: 'mantenimientos', label: 'Mantenimientos', icon: Wrench     },
]

const dos = (n) => String(n).padStart(2, '0')
// Siempre con componentes locales: toISOString() pasa a UTC y corre la fecha en la noche.
const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}

const fmtHoras = (h) => `${Number(h || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })} h`
const fmtCOP = (v) => `$ ${Number(v || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
const fmtFecha = (f) => f ? new Date(`${f}T00:00:00`).toLocaleDateString('es-CO') : '—'

const campoCls = `h-[38px] border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-colors`
const etiquetaCls = 'block font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-faint mb-1'

function Kpi({ etiqueta, valor, detalle }) {
  return (
    <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.06em] text-faint">{etiqueta}</p>
      <p className="text-[22px] font-bold text-ink mt-1 tabular-nums">{valor}</p>
      {detalle && <p className="text-[11.5px] text-muted mt-0.5">{detalle}</p>}
    </div>
  )
}

function Tabla({ titulo, columnas, filas, claveFila }) {
  return (
    <section className="bg-surface border border-border rounded-card overflow-hidden shadow-card dark:shadow-card-dk">
      {titulo && (
        <h2 className="px-5 py-3 text-[13.5px] font-semibold text-ink border-b border-border">{titulo}</h2>
      )}
      {filas.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-faint">Sin datos para los filtros seleccionados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface2 border-b border-border">
                {columnas.map(c => (
                  <th key={c.titulo}
                    className={`px-4 py-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[.06em]
                      text-faint whitespace-nowrap ${c.numero ? 'text-right' : 'text-left'}`}
                  >
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f, i) => (
                <tr key={claveFila ? claveFila(f) : i} className="hover:bg-hover transition-colors">
                  {columnas.map(c => (
                    <td key={c.titulo}
                      className={`px-4 py-2.5 text-[13px] text-muted
                        ${c.numero ? 'text-right font-mono tabular-nums whitespace-nowrap' : ''}`}
                    >
                      {c.valor(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

// Un costo incompleto se avisa en vez de mostrarse como si fuera el total real.
const costoGrupo = (g) => g.sin_valor_hora > 0
  ? <span title={`${g.sin_valor_hora} actividad(es) sin valor hora definido`}>{fmtCOP(g.costo)} *</span>
  : fmtCOP(g.costo)

function ReporteHoras({ datos }) {
  const { totales, ver_costos: verCostos } = datos
  const columnasGrupo = [
    { titulo: 'Actividades', numero: true, valor: g => g.actividades },
    { titulo: 'Horas est.',  numero: true, valor: g => fmtHoras(g.horas_estimadas) },
    { titulo: 'Horas reales', numero: true, valor: g => fmtHoras(g.horas_reales) },
    ...(verCostos ? [{ titulo: 'Costo', numero: true, valor: costoGrupo }] : []),
  ]

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-3 ${verCostos ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <Kpi etiqueta="Actividades" valor={totales.actividades}
          detalle={totales.sin_tiempo_real ? `${totales.sin_tiempo_real} sin tiempo real registrado` : 'Todas con tiempo real'} />
        <Kpi etiqueta="Horas reales" valor={fmtHoras(totales.horas_reales)} />
        <Kpi etiqueta="Horas estimadas" valor={fmtHoras(totales.horas_estimadas)}
          detalle={`Desviación en lo terminado: ${totales.desviacion_horas > 0 ? '+' : ''}${fmtHoras(totales.desviacion_horas)}`} />
        {verCostos && (
          <Kpi etiqueta="Costo mano de obra" valor={fmtCOP(totales.costo)}
            detalle={totales.sin_valor_hora ? `${totales.sin_valor_hora} actividad(es) sin valor hora` : 'En pesos colombianos'} />
        )}
      </div>

      {verCostos && totales.sin_valor_hora > 0 && (
        <p className="flex items-start gap-2 text-[12.5px] text-warning bg-warning/10 rounded-control px-3 py-2.5">
          <AlertTriangle size={15} className="shrink-0 mt-px" />
          El costo está incompleto: hay cargos sin valor hora. Defínelo en Administración → Roles.
        </p>
      )}

      <Tabla titulo="Por trabajador" filas={datos.por_trabajador} columnas={[
        { titulo: 'Trabajador', valor: g => <span className="font-medium text-ink">{g.operario}</span> },
        { titulo: 'Cargo', valor: g => g.cargo },
        ...columnasGrupo,
      ]} />
      <Tabla titulo="Por OP" filas={datos.por_pedido} columnas={[
        { titulo: 'OP', valor: g => <span className="font-mono text-ink">{g.pedido}</span> },
        { titulo: 'Proyecto', valor: g => g.proyecto },
        ...columnasGrupo,
      ]} />
      <Tabla titulo="Por proyecto" filas={datos.por_proyecto} columnas={[
        { titulo: 'Proyecto', valor: g => <span className="font-medium text-ink">{g.proyecto}</span> },
        ...columnasGrupo,
      ]} />
      <Tabla titulo="Por actividad" filas={datos.actividades} claveFila={a => a.id_programacion} columnas={[
        { titulo: 'Fecha', valor: a => <span className="font-mono text-[12px] whitespace-nowrap">{fmtFecha(a.fecha)}</span> },
        { titulo: 'Trabajador', valor: a => a.operario || '—' },
        { titulo: 'Proyecto', valor: a => a.proyecto || '—' },
        { titulo: 'Fase', valor: a => a.fase
          ? <>{a.fase}{a.item_producto && <span className="block text-[11px] text-faint">{a.item_producto}</span>}</>
          : '—' },
        { titulo: 'Horas est.', numero: true, valor: a => a.horas_estimadas != null ? fmtHoras(a.horas_estimadas) : '—' },
        { titulo: 'Horas reales', numero: true, valor: a => a.horas_reales != null ? fmtHoras(a.horas_reales) : '—' },
        ...(verCostos ? [{ titulo: 'Costo', numero: true, valor: a => a.costo != null ? fmtCOP(a.costo) : '—' }] : []),
      ]} />
    </div>
  )
}

const ESTADO_PROYECTO = {
  completado: { label: 'Completado', cls: 'bg-success/10 text-success' },
  en_curso:   { label: 'En curso',   cls: 'bg-primary/10 text-primary' },
  pendiente:  { label: 'Pendiente',  cls: 'bg-surface2 text-muted' },
}

function ReporteAvance({ datos }) {
  const vencidos = datos.proyectos.filter(p => p.vencido).length
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi etiqueta="Proyectos" valor={datos.proyectos.length} />
        <Kpi etiqueta="Completados" valor={datos.proyectos.filter(p => p.estado === 'completado').length} />
        <Kpi etiqueta="Vencidos" valor={vencidos} detalle={vencidos ? 'Con fases sin terminar' : 'Ninguno'} />
      </div>
      <Tabla filas={datos.proyectos} claveFila={p => p.id_proyecto} columnas={[
        { titulo: 'Proyecto', valor: p => <span className="font-medium text-ink">{p.proyecto}</span> },
        { titulo: 'Cliente', valor: p => p.cliente || '—' },
        { titulo: 'Estado', valor: p => {
          const cfg = ESTADO_PROYECTO[p.estado]
          return <span className={`font-mono text-[11px] font-semibold px-2.5 py-[5px] rounded-badge whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
        } },
        { titulo: 'Avance', valor: p => (
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 bg-surface2 border border-border rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.avance}%` }} />
            </div>
            <span className="font-mono text-[12px] tabular-nums">{p.avance}%</span>
          </div>
        ) },
        { titulo: 'Fases', numero: true, valor: p => `${p.fases_completadas} / ${p.total_fases}` },
        { titulo: 'Entrega est.', valor: p => (
          <span className={`font-mono text-[12px] whitespace-nowrap ${p.vencido ? 'text-error font-semibold' : ''}`}>
            {fmtFecha(p.fecha_fin_estimada)}{p.vencido ? ' · vencido' : ''}
          </span>
        ) },
      ]} />
    </div>
  )
}

const TIPO_MANTENIMIENTO = {
  preventivo: 'Preventivo', correctivo: 'Correctivo', calibracion: 'Calibración', predictivo: 'Predictivo',
}

function ReporteMantenimientos({ datos }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi etiqueta="Total" valor={datos.total} />
        <Kpi etiqueta="Preventivos" valor={datos.por_tipo.preventivo} />
        <Kpi etiqueta="Correctivos" valor={datos.por_tipo.correctivo} />
        <Kpi etiqueta="Calibraciones" valor={datos.por_tipo.calibracion} />
      </div>
      <Tabla titulo="Realizados" filas={datos.mantenimientos} claveFila={m => m.id_mantenimiento} columnas={[
        { titulo: 'Fecha', valor: m => <span className="font-mono text-[12px] whitespace-nowrap">{fmtFecha(m.fecha)}</span> },
        { titulo: 'Equipo', valor: m => <span className="font-medium text-ink">{m.maquina_codigo ? `[${m.maquina_codigo}] ` : ''}{m.maquina}</span> },
        { titulo: 'Tipo', valor: m => TIPO_MANTENIMIENTO[m.tipo] || m.tipo },
        { titulo: 'Técnico', valor: m => m.tecnico || '—' },
        { titulo: 'Descripción', valor: m => m.descripcion || '—' },
      ]} />
      <Tabla titulo="Programados" filas={datos.programados} claveFila={m => m.id_mantenimiento} columnas={[
        { titulo: 'Fecha prevista', valor: m => (
          <span className={`font-mono text-[12px] whitespace-nowrap ${m.situacion === 'Vencido' ? 'text-error font-semibold' : ''}`}>
            {fmtFecha(m.fecha)}{m.situacion === 'Vencido' ? ' · vencido' : ''}
          </span>
        ) },
        { titulo: 'Equipo', valor: m => <span className="font-medium text-ink">{m.maquina_codigo ? `[${m.maquina_codigo}] ` : ''}{m.maquina}</span> },
        { titulo: 'Tipo', valor: m => TIPO_MANTENIMIENTO[m.tipo] || m.tipo },
        { titulo: 'Descripción', valor: m => m.descripcion || '—' },
      ]} />
    </div>
  )
}

const OBTENER = { horas: getReporteHoras, avance: getReporteAvance, mantenimientos: getReporteMantenimientos }
const VISTA = { horas: ReporteHoras, avance: ReporteAvance, mantenimientos: ReporteMantenimientos }

// Se monta una instancia por pestaña (key={tab}): así una pestaña nunca recibe,
// ni por un render, los datos de otra mientras llegan los suyos.
function Resultado({ tab, params }) {
  const { data, loading, error } = useFetch(() => OBTENER[tab](params), [JSON.stringify(params)])
  const Vista = VISTA[tab]
  if (loading) return <Spinner />
  if (error) return <EmptyState title="No se pudo generar el reporte" description={error} />
  return data ? <Vista datos={data} /> : null
}

export default function Reportes() {
  const hoy = hoyLocal()
  const [tab, setTab] = useState('horas')
  const [filtros, setFiltros] = useState({
    desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, id_proyecto: '', id_operario: '', id_maquina: '', tipo: '',
  })
  const [exportando, setExportando] = useState(null)

  // Solo se envían los filtros que aplican a la pestaña y que tienen valor.
  const aplicables = {
    horas: ['desde', 'hasta', 'id_proyecto', 'id_operario'],
    avance: ['id_proyecto'],
    mantenimientos: ['desde', 'hasta', 'id_maquina', 'tipo'],
  }[tab]
  const params = Object.fromEntries(aplicables.filter(k => filtros[k]).map(k => [k, filtros[k]]))

  const { data: proyectos } = useFetch(() => getProyectos())
  const { data: usuarios }  = useFetch(() => getUsuarios())
  const { data: maquinas }  = useFetch(() => getMaquinaria())

  const set = e => setFiltros(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleExportar = async (formato) => {
    setExportando(formato)
    try {
      const res = await exportarReporte(tab, formato, params)
      const url = URL.createObjectURL(res.data)
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `reporte_${tab}_${hoy}.${formato}`
      enlace.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo exportar el reporte')
    } finally { setExportando(null) }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`h-[38px] px-3.5 flex items-center gap-2 rounded-control text-[12.5px] font-medium border transition-colors
              ${tab === id
                ? 'bg-primary text-white border-primary shadow-btn'
                : 'border-border text-muted bg-surface hover:bg-hover hover:text-ink'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {aplicables.includes('desde') && (
          <>
            <div>
              <label htmlFor="rep-desde" className={etiquetaCls}>Desde</label>
              <input id="rep-desde" type="date" name="desde" value={filtros.desde} max={filtros.hasta} onChange={set} className={campoCls} />
            </div>
            <div>
              <label htmlFor="rep-hasta" className={etiquetaCls}>Hasta</label>
              <input id="rep-hasta" type="date" name="hasta" value={filtros.hasta} min={filtros.desde} onChange={set} className={campoCls} />
            </div>
          </>
        )}
        {aplicables.includes('id_proyecto') && (
          <div>
            <label htmlFor="rep-proyecto" className={etiquetaCls}>Proyecto</label>
            <select id="rep-proyecto" name="id_proyecto" value={filtros.id_proyecto} onChange={set} className={`${campoCls} max-w-[220px]`}>
              <option value="">Todos</option>
              {(proyectos || []).map(p => <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        {aplicables.includes('id_operario') && (
          <div>
            <label htmlFor="rep-operario" className={etiquetaCls}>Trabajador</label>
            <select id="rep-operario" name="id_operario" value={filtros.id_operario} onChange={set} className={`${campoCls} max-w-[200px]`}>
              <option value="">Todos</option>
              {(usuarios || []).map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
            </select>
          </div>
        )}
        {aplicables.includes('id_maquina') && (
          <div>
            <label htmlFor="rep-maquina" className={etiquetaCls}>Equipo</label>
            <select id="rep-maquina" name="id_maquina" value={filtros.id_maquina} onChange={set} className={`${campoCls} max-w-[220px]`}>
              <option value="">Todos</option>
              {(maquinas || []).map(m => <option key={m.id_maquina} value={m.id_maquina}>{m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}</option>)}
            </select>
          </div>
        )}
        {aplicables.includes('tipo') && (
          <div>
            <label htmlFor="rep-tipo" className={etiquetaCls}>Tipo</label>
            <select id="rep-tipo" name="tipo" value={filtros.tipo} onChange={set} className={campoCls}>
              <option value="">Todos</option>
              <option value="preventivo">Preventivo</option>
              <option value="correctivo">Correctivo</option>
              <option value="calibracion">Calibración</option>
            </select>
          </div>
        )}

        <div className="flex-1" />

        <div className="flex gap-2">
          <button onClick={() => handleExportar('xlsx')} disabled={!!exportando}
            className="h-[38px] flex items-center gap-2 px-3.5 border border-border bg-surface text-[12.5px]
              font-medium text-muted hover:bg-hover hover:text-ink disabled:opacity-50 rounded-control transition-colors"
          >
            <FileSpreadsheet size={14} /> {exportando === 'xlsx' ? 'Generando…' : 'Excel'}
          </button>
          <button onClick={() => handleExportar('pdf')} disabled={!!exportando}
            className="h-[38px] flex items-center gap-2 px-3.5 border border-border bg-surface text-[12.5px]
              font-medium text-muted hover:bg-hover hover:text-ink disabled:opacity-50 rounded-control transition-colors"
          >
            <FileText size={14} /> {exportando === 'pdf' ? 'Generando…' : 'PDF'}
          </button>
        </div>
      </div>

      <Resultado key={tab} tab={tab} params={params} />
    </div>
  )
}
