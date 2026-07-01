import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Flag,
  CheckCircle2, Clock3, Circle, Save,
} from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getProyecto, updateFase } from '../api/proyectos.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

// ── Configuración de prioridades ──────────────────────────────────────────────
const prioridadCfg = {
  alta:  { label: 'Alta',  badge: 'bg-error/10 text-error',    dot: 'bg-error'   },
  media: { label: 'Media', badge: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  baja:  { label: 'Baja',  badge: 'bg-success/10 text-success', dot: 'bg-success' },
}

// ── Configuración de estados de fase ─────────────────────────────────────────
const faseCfg = {
  completada: {
    Icon:        CheckCircle2,
    iconColor:   'text-success',
    iconBg:      'bg-success/10',
    barColor:    'bg-success',
    rowBg:       'bg-success/[0.04]',
    selectStyle: 'bg-success/10 text-success',
    nameStyle:   'text-ink',
  },
  en_curso: {
    Icon:        Clock3,
    iconColor:   'text-primary',
    iconBg:      'bg-primary/10',
    barColor:    'bg-primary',
    rowBg:       'bg-primary/[0.03]',
    selectStyle: 'bg-primary/10 text-primary',
    nameStyle:   'text-ink',
  },
  pendiente: {
    Icon:        Circle,
    iconColor:   'text-faint',
    iconBg:      'bg-surface2',
    barColor:    'bg-border-strong',
    rowBg:       '',
    selectStyle: 'bg-surface2 text-muted',
    nameStyle:   'text-muted',
  },
}

// ── Estado global ─────────────────────────────────────────────────────────────
const estadoGlobalCfg = {
  completada: { label: 'Completado', badge: 'bg-success/10 text-success', dot: 'bg-success' },
  en_curso:   { label: 'En curso',   badge: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  pendiente:  { label: 'Pendiente',  badge: 'bg-warning/10 text-warning', dot: 'bg-warning' },
}

const ESTADOS_FASE = ['pendiente', 'en_curso', 'completada']
const estadoLabel  = { pendiente: 'Pendiente', en_curso: 'En curso', completada: 'Completada' }

const fmtFecha = d => d
  ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const progressColor = (pct) =>
  pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning'

export default function ProyectoDetalle() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { data: proyecto, loading, error, refresh } =
    useFetch(() => getProyecto(id), [id])

  const [edits,  setEdits]  = useState({})
  const [saving, setSaving] = useState(null)

  if (loading) return <Spinner text="Cargando proyecto..." />
  if (error)   return <EmptyState title="Error" description={error} />
  if (!proyecto) return null

  const fases  = proyecto.fases || []
  const avance = proyecto.avance || 0
  const pCfg   = prioridadCfg[proyecto.prioridad] || prioridadCfg.media

  const estadoGlobal = fases.length === 0 ? 'pendiente'
    : fases.every(f => f.estado === 'completada') ? 'completada'
    : fases.some(f => f.estado === 'en_curso')    ? 'en_curso'
    : 'pendiente'

  const egCfg = estadoGlobalCfg[estadoGlobal]

  const getEdit = (fase) =>
    edits[fase.id_fase_proyecto] ?? {
      estado:            fase.estado,
      porcentaje_avance: fase.porcentaje_avance,
    }

  const setEdit = (faseId, field, value) =>
    setEdits(prev => ({
      ...prev,
      [faseId]: { ...(prev[faseId] ?? {}), [field]: value },
    }))

  const handleSave = async (fase) => {
    const edit = getEdit(fase)
    setSaving(fase.id_fase_proyecto)
    try {
      await updateFase(proyecto.id_proyecto, fase.id_fase_proyecto, edit)
      toast.success(`Fase "${fase.fase_nombre}" actualizada`)
      setEdits(prev => {
        const n = { ...prev }; delete n[fase.id_fase_proyecto]; return n
      })
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(null) }
  }

  const isDirty = (fase) => {
    const e = edits[fase.id_fase_proyecto]
    return e && (
      e.estado !== fase.estado ||
      Number(e.porcentaje_avance) !== fase.porcentaje_avance
    )
  }

  const completadas = fases.filter(f => f.estado === 'completada').length
  const enCurso     = fases.filter(f => f.estado === 'en_curso').length

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      {/* ── Encabezado ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/proyectos')}
          className="mt-0.5 w-9 h-9 flex items-center justify-center shrink-0
            border border-border rounded-control
            text-muted hover:bg-hover hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-[20px] font-semibold text-ink leading-tight">
            {proyecto.nombre}
          </h1>
          {proyecto.objetivo && (
            <p className="text-[13px] text-muted mt-0.5 leading-snug">
              {proyecto.objetivo}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* Prioridad */}
          <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
            font-semibold px-2.5 py-[5px] rounded-badge ${pCfg.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${pCfg.dot}`} />
            {pCfg.label}
          </span>
          {/* Estado global */}
          <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
            font-semibold px-2.5 py-[5px] rounded-badge ${egCfg.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${egCfg.dot}`} />
            {egCfg.label}
          </span>
        </div>
      </div>

      {/* ── Info cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: User,     label: 'Responsable',  value: proyecto.responsable             || '—'          },
          { icon: Flag,     label: 'Cliente',       value: proyecto.cliente                 || 'Sin pedido' },
          { icon: Calendar, label: 'Inicio',        value: fmtFecha(proyecto.fecha_inicio)                 },
          { icon: Calendar, label: 'Entrega est.',  value: fmtFecha(proyecto.fecha_fin_estimada)           },
        ].map(({ icon: Icon, label, value }, i) => (
          <div key={i}
            className="bg-surface border border-border rounded-card
              shadow-card dark:shadow-card-dk p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-[7px] bg-surface2
                flex items-center justify-center shrink-0"
              >
                <Icon size={13} className="text-faint" />
              </div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint"
              >
                {label}
              </p>
            </div>
            <p className="text-[13px] font-semibold text-ink truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Avance general ── */}
      <div className="bg-surface border border-border rounded-card
        shadow-card dark:shadow-card-dk p-5"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">Avance general</h2>
            <p className="font-mono text-[11px] text-faint mt-0.5">
              {completadas} de {fases.length} fases completadas
              {enCurso > 0 && ` · ${enCurso} en curso`}
            </p>
          </div>
          <span className={`font-mono text-[28px] font-bold leading-none
            ${avance === 100 ? 'text-success' : avance >= 50 ? 'text-primary' : 'text-warning'}`}
          >
            {avance}<span className="text-[16px]">%</span>
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-surface2 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-700 ${progressColor(avance)}`}
            style={{ width: `${avance}%` }}
          />
        </div>

        {/* Mini-resumen por estado */}
        <div className="flex gap-4 mt-3">
          {[
            { label: 'Completadas', count: completadas,                              dot: 'bg-success' },
            { label: 'En curso',    count: enCurso,                                  dot: 'bg-primary' },
            { label: 'Pendientes',  count: fases.length - completadas - enCurso,     dot: 'bg-faint'   },
          ].map(({ label, count, dot }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className="font-mono text-[10.5px] text-faint">
                {label} <span className="text-ink font-semibold">{count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fases editables ── */}
      <div className="bg-surface border border-border rounded-card
        shadow-card dark:shadow-card-dk overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface2
          flex items-center justify-between"
        >
          <h2 className="text-[14px] font-semibold text-ink">Fases del proyecto</h2>
          <p className="font-mono text-[10.5px] text-faint">
            Edita el estado y el % directamente en cada fila
          </p>
        </div>

        {fases.length === 0 ? (
          <div className="p-10 text-center font-mono text-[13px] text-faint">
            No hay fases registradas.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {fases.map((fase, idx) => {
              const edit     = getEdit(fase)
              const cfg      = faseCfg[edit.estado] || faseCfg.pendiente
              const dirty    = isDirty(fase)
              const isSaving = saving === fase.id_fase_proyecto
              const IconComp = cfg.Icon

              return (
                <div
                  key={fase.id_fase_proyecto}
                  className={`px-5 py-3.5 transition-colors ${cfg.rowBg}`}
                >
                  <div className="flex items-center gap-3">
                    {/* Número */}
                    <span className="font-mono text-[10.5px] text-faint w-5
                      text-right shrink-0"
                    >
                      {idx + 1}
                    </span>

                    {/* Icono de estado */}
                    <div className={`w-8 h-8 rounded-[8px] shrink-0
                      flex items-center justify-center ${cfg.iconBg}`}
                    >
                      <IconComp size={15} className={cfg.iconColor} />
                    </div>

                    {/* Nombre de fase */}
                    <p className={`flex-1 text-[13.5px] font-medium
                      min-w-0 truncate ${cfg.nameStyle}`}
                    >
                      {fase.fase_nombre}
                    </p>

                    {/* Select de estado */}
                    <select
                      value={edit.estado}
                      onChange={e =>
                        setEdit(fase.id_fase_proyecto, 'estado', e.target.value)
                      }
                      className={`font-mono text-[11px] font-semibold
                        rounded-badge px-2.5 py-[5px]
                        border-0 cursor-pointer appearance-none text-center
                        focus:outline-none focus:ring-2 focus:ring-primary/25
                        transition-colors ${cfg.selectStyle}`}
                    >
                      {ESTADOS_FASE.map(s => (
                        <option key={s} value={s}>{estadoLabel[s]}</option>
                      ))}
                    </select>

                    {/* Mini barra + % input */}
                    <div className="hidden sm:flex items-center gap-2 w-[148px] shrink-0">
                      <div className="flex-1 bg-surface2 border border-border
                        rounded-full h-1.5 overflow-hidden"
                      >
                        <div
                          className={`${cfg.barColor} h-1.5 rounded-full
                            transition-all duration-500`}
                          style={{ width: `${edit.porcentaje_avance}%` }}
                        />
                      </div>
                      <input
                        type="number" min={0} max={100}
                        value={edit.porcentaje_avance}
                        onChange={e =>
                          setEdit(
                            fase.id_fase_proyecto,
                            'porcentaje_avance',
                            Number(e.target.value),
                          )
                        }
                        className="w-[42px] h-[26px] font-mono text-[12px] text-right
                          bg-surface border border-border rounded-[6px] px-1.5
                          text-ink focus:outline-none focus:ring-2 focus:ring-primary/25
                          focus:border-primary transition-colors
                          [appearance:textfield]
                          [&::-webkit-outer-spin-button]:appearance-none
                          [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="font-mono text-[11px] text-faint">%</span>
                    </div>

                    {/* Botón guardar (solo si hay cambios) */}
                    {dirty && (
                      <button
                        onClick={() => handleSave(fase)}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 h-[30px] px-3
                          bg-primary hover:bg-primary-hover disabled:opacity-50
                          text-white rounded-control font-mono text-[11px]
                          font-semibold shadow-btn transition-colors shrink-0"
                      >
                        <Save size={11} />
                        {isSaving ? '…' : 'Guardar'}
                      </button>
                    )}
                  </div>

                  {/* Fechas (fila secundaria) */}
                  {(fase.fecha_inicio || fase.fecha_fin) && (
                    <p className="font-mono text-[10.5px] text-faint mt-1.5 ml-[68px]">
                      {fmtFecha(fase.fecha_inicio)}
                      <span className="mx-1.5 text-faint/40">→</span>
                      {fmtFecha(fase.fecha_fin)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
