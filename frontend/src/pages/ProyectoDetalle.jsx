import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Calendar, User, Flag,
  CheckCircle2, Clock3, Circle, Save, Lock, Package, ChevronRight, Wrench,
  List, LayoutGrid,
} from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getProyecto, updateFase } from '../api/proyectos.service'
import { getActividadesFase } from '../api/programacion.service'
import { getUser }     from '../utils/auth'
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

// Fases únicas del proyecto (sin turno de planta, sin máquina, un solo responsable
// asignado automáticamente por rol) — orden 1 = Diseño, orden 2 = Compra.
const FASE_ESPECIAL_LABELS = {
  1: { en_curso: 'En proceso',                              completada: 'Finalizada' },
  2: { en_curso: 'En progreso de compra y cotización',      completada: 'Compra finalizada' },
}

const fmtFecha = d => d
  ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const progressColor = (pct) =>
  pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-primary' : 'bg-warning'

// ── Estados de las actividades de planta (turnos) ────────────────────────────
const turnoEstadoCfg = {
  programado: { label: 'Programado', badge: 'bg-secondary/10 text-secondary' },
  en_proceso: { label: 'En proceso', badge: 'bg-primary/10 text-primary'     },
  completado: { label: 'Completado', badge: 'bg-success/10 text-success'     },
  cancelado:  { label: 'Cancelado',  badge: 'bg-error/10 text-error'         },
}

// Actividades de Programación de planta vinculadas a una fase concreta de un ítem.
// Se carga bajo demanda al desplegar la fila (sin salir de ProyectoDetalle).
function ActividadesFase({ faseId, indent = true }) {
  const { data, loading, error } = useFetch(() => getActividadesFase(faseId), [faseId])
  const ind = indent ? 'ml-[68px]' : ''

  if (loading) return (
    <p className={`font-mono text-[10.5px] text-faint mt-2 ${ind}`}>Cargando actividades…</p>
  )
  if (error) return (
    <p className={`font-mono text-[10.5px] text-error mt-2 ${ind}`}>
      No se pudieron cargar las actividades
    </p>
  )
  if (!data || data.length === 0) return (
    <p className={`font-mono text-[10.5px] text-faint mt-2 ${ind}`}>
      Esta fase no tiene actividades programadas.
    </p>
  )

  return (
    <ul className={`mt-2 ${ind} space-y-1.5`}>
      {data.map(a => {
        const cfg = turnoEstadoCfg[a.estado] || turnoEstadoCfg.programado
        return (
          <li key={a.id_programacion}
            className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-[11.5px]
              border border-border rounded-control bg-surface2 px-2.5 py-2"
          >
            <span className={`font-mono text-[10px] font-semibold px-1.5 py-[2px]
              rounded-badge shrink-0 ${cfg.badge}`}
            >
              {cfg.label}
            </span>
            <span className="font-mono text-[10.5px] text-faint">{fmtFecha(a.fecha)}</span>
            <span className="flex items-center gap-1 text-muted">
              <User size={11} className="text-faint" />
              {a.operario || 'Sin operario'}
            </span>
            <span className="flex items-center gap-1 text-muted">
              <Wrench size={11} className="text-faint" />
              {a.maquina_codigo || a.maquina || 'Sin máquina'}
            </span>
            <span className="ml-auto font-mono text-[10.5px] text-ink font-semibold tabular-nums">
              {a.porcentaje_avance}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// ── Tablero Kanban de fases (arrastrar y soltar entre Pendiente/En curso/Completada) ──
function FaseKanbanCard({ fase, draggable, onDragStart, mostrarItem, abierta, onToggleActividades }) {
  const locked = fase.turnos_vinculados > 0
  return (
    <div
      draggable={draggable && !locked}
      onDragStart={draggable && !locked ? onDragStart : undefined}
      className={`bg-surface border border-border rounded-control p-3 shadow-card
        dark:shadow-card-dk transition-colors
        ${draggable && !locked ? 'cursor-grab active:cursor-grabbing hover:bg-hover' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink truncate">{fase.fase_nombre}</p>
        {locked && <Lock size={12} className="text-faint shrink-0 mt-0.5" />}
      </div>
      {mostrarItem && fase.item_producto && (
        <span className="inline-block mt-1 font-mono text-[10px] font-semibold text-secondary
          bg-secondary/10 px-1.5 py-[1px] rounded-badge"
        >
          {fase.item_producto}
        </span>
      )}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 bg-surface2 border border-border rounded-full h-1.5 overflow-hidden">
          <div className={`${progressColor(fase.porcentaje_avance)} h-1.5 rounded-full`}
            style={{ width: `${fase.porcentaje_avance}%` }}
          />
        </div>
        <span className="font-mono text-[10.5px] text-faint tabular-nums">{fase.porcentaje_avance}%</span>
      </div>

      {locked && (
        <div className="mt-2 pt-2 border-t border-border">
          <button
            type="button"
            draggable={false}
            onClick={(e) => { e.stopPropagation(); onToggleActividades(fase.id_fase_proyecto) }}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <ChevronRight size={11} className={`transition-transform ${abierta ? 'rotate-90' : ''}`} />
            {abierta ? 'Ocultar actividades' : 'Ver actividades'} ({fase.turnos_vinculados})
          </button>
          {abierta && <ActividadesFase faseId={fase.id_fase_proyecto} indent={false} />}
        </div>
      )}
    </div>
  )
}

function FasesKanban({ fases, mostrarItem, onDrop, openTurnos, onToggleTurnos }) {
  const [dragId, setDragId] = useState(null)

  const handleDropColumn = (estado) => {
    if (dragId == null) return
    const fase = fases.find(f => f.id_fase_proyecto === dragId)
    setDragId(null)
    if (fase) onDrop(fase, estado)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
      {ESTADOS_FASE.map(estado => {
        const cfg   = faseCfg[estado]
        const cards = fases.filter(f => f.estado === estado)
        return (
          <div key={estado}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDropColumn(estado)}
            className="bg-surface2 border border-border rounded-card p-2.5 min-h-[120px]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className={`font-mono text-[11px] font-semibold ${cfg.iconColor}`}>
                {estadoLabel[estado]}
              </span>
              <span className="font-mono text-[10.5px] text-faint">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map(fase => (
                <FaseKanbanCard
                  key={fase.id_fase_proyecto}
                  fase={fase}
                  mostrarItem={mostrarItem}
                  draggable
                  onDragStart={() => setDragId(fase.id_fase_proyecto)}
                  abierta={openTurnos.has(fase.id_fase_proyecto)}
                  onToggleActividades={onToggleTurnos}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Kanban agrupado por ítem cuando el proyecto tiene 2+ productos: un
// acabado colapsable por ítem (mismo encabezado que la vista Lista), con un
// tablero Pendiente/En curso/Completada propio adentro — así con varios
// ítems no queda todo mezclado en las mismas tres columnas.
function ItemsKanban({ grupos, openItems, onToggleItem, openTurnos, onToggleTurnos, onDrop }) {
  return (
    <div className="divide-y divide-border">
      {grupos.map(grupo => {
        const abierto = openItems.has(grupo.id_detalle_pedido)
        const avanceGrupo = grupo.fases.length
          ? Math.round(grupo.fases.reduce((s, f) => s + f.porcentaje_avance, 0) / grupo.fases.length)
          : 0
        const estadoGrupo = grupo.fases.every(f => f.estado === 'completada') ? 'completada'
          : grupo.fases.some(f => f.estado === 'en_curso') ? 'en_curso'
          : 'pendiente'
        const egCfgGrupo = estadoGlobalCfg[estadoGrupo]
        return (
          <div key={grupo.id_detalle_pedido}>
            <button onClick={() => onToggleItem(grupo.id_detalle_pedido)}
              className="w-full flex items-center gap-2.5 px-5 py-3
                bg-surface2/60 hover:bg-surface2 transition-colors text-left"
            >
              <ChevronRight size={14}
                className={`text-faint shrink-0 transition-transform ${abierto ? 'rotate-90' : ''}`}
              />
              <Package size={13} className="text-faint shrink-0" />
              <p className="text-[12.5px] font-semibold text-ink truncate">
                {grupo.item_producto || `Ítem #${grupo.id_detalle_pedido}`}
              </p>
              <span className={`font-mono text-[10px] font-semibold px-2 py-[3px]
                rounded-badge shrink-0 ${egCfgGrupo.badge}`}
              >
                {egCfgGrupo.label}
              </span>
              <div className="hidden sm:flex items-center gap-1.5 w-[90px] shrink-0">
                <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className={`h-1.5 rounded-full ${progressColor(avanceGrupo)}`}
                    style={{ width: `${avanceGrupo}%` }}
                  />
                </div>
                <span className="font-mono text-[10.5px] text-muted tabular-nums">{avanceGrupo}%</span>
              </div>
              {grupo.item_fecha_entrega && (
                <span className="font-mono text-[10.5px] text-faint ml-auto shrink-0 hidden md:inline">
                  Entrega: {fmtFecha(grupo.item_fecha_entrega)}
                </span>
              )}
            </button>
            {abierto && (
              <FasesKanban fases={grupo.fases} mostrarItem={false} onDrop={onDrop}
                openTurnos={openTurnos} onToggleTurnos={onToggleTurnos}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ProyectoDetalle() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { data: proyecto, loading, error, refresh } =
    useFetch(() => getProyecto(id), [id])

  const [edits,      setEdits]      = useState({})
  const [saving,     setSaving]     = useState(null)
  const [openItems,  setOpenItems]  = useState(new Set())
  const [openTurnos, setOpenTurnos] = useState(new Set())
  const [vista,      setVista]      = useState('lista') // 'lista' | 'kanban'

  const toggleTurnos = (faseId) => setOpenTurnos(prev => {
    const next = new Set(prev)
    next.has(faseId) ? next.delete(faseId) : next.add(faseId)
    return next
  })

  if (loading) return <Spinner text="Cargando proyecto..." />
  if (error)   return <EmptyState title="Error" description={error} />
  if (!proyecto) return null

  const fases  = proyecto.fases || []
  const avance = proyecto.avance || 0
  const pCfg   = prioridadCfg[proyecto.prioridad] || prioridadCfg.media
  const user   = getUser()

  // Fases únicas (Diseño, Compra): un solo responsable, sin turno de planta.
  const fasesAsignadas = fases.filter(f => f.id_usuario_asignado != null)
  // Resto de fases (Corte → Despacho): una copia por ítem del pedido cuando aplica.
  const fasesResto = fases.filter(f => f.id_usuario_asignado == null)
  const gruposItem = []
  for (const f of fasesResto) {
    let grupo = gruposItem.find(g => g.id_detalle_pedido === f.id_detalle_pedido)
    if (!grupo) {
      grupo = {
        id_detalle_pedido:  f.id_detalle_pedido,
        item_producto:      f.item_producto,
        item_fecha_entrega: f.item_fecha_entrega,
        fases: [],
      }
      gruposItem.push(grupo)
    }
    grupo.fases.push(f)
  }
  const mostrarPorItem = gruposItem.length > 1

  const toggleItem = (key) => setOpenItems(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

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

  // Cambio de estado arrastrando una card en la vista Kanban.
  const handleKanbanDrop = async (fase, estado) => {
    if (fase.estado === estado || fase.turnos_vinculados > 0) return
    // Sin ninguna actividad programada no tiene sentido marcarla "en curso":
    // ese estado debe reflejar trabajo real (turnos) en marcha, no un arrastre
    // manual sin nada detrás — queda bloqueada hasta que se le programe algo.
    // No aplica a fases de control manual (ej. Pintura y acabados, la hace un
    // tercero): esas nunca tienen turnos y su estado siempre se mueve a mano.
    if (fase.requiere_turno && estado === 'en_curso' && fase.turnos_vinculados === 0) {
      toast.error(`"${fase.fase_nombre}" no tiene actividades programadas — prográmale un turno desde Programación de planta antes de marcarla en curso`)
      return
    }
    const porcentaje_avance = estado === 'completada' ? 100
      : estado === 'pendiente' ? 0
      : fase.porcentaje_avance
    try {
      await updateFase(proyecto.id_proyecto, fase.id_fase_proyecto, { estado, porcentaje_avance })
      toast.success(`Fase "${fase.fase_nombre}" actualizada`)
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    }
  }

  const completadas = fases.filter(f => f.estado === 'completada').length
  const enCurso     = fases.filter(f => f.estado === 'en_curso').length

  const renderFilaFase = (fase, idx) => {
    const edit     = getEdit(fase)
    const cfg      = faseCfg[edit.estado] || faseCfg.pendiente
    const locked   = fase.turnos_vinculados > 0
    const turnosAbierto = openTurnos.has(fase.id_fase_proyecto)
    const dirty    = !locked && isDirty(fase)
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
            disabled={locked}
            onChange={e =>
              setEdit(fase.id_fase_proyecto, 'estado', e.target.value)
            }
            className={`font-mono text-[11px] font-semibold
              rounded-badge px-2.5 py-[5px]
              border-0 appearance-none text-center
              focus:outline-none focus:ring-2 focus:ring-primary/25
              transition-colors ${cfg.selectStyle}
              ${locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
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
              disabled={locked}
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
                focus:border-primary transition-colors disabled:opacity-60
                disabled:cursor-not-allowed
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

        {locked && (
          <div className="mt-1.5 ml-[68px]">
            <button
              type="button"
              onClick={() => toggleTurnos(fase.id_fase_proyecto)}
              className="flex items-center gap-1 text-[11.5px] font-semibold
                text-primary hover:underline"
            >
              <ChevronRight size={12}
                className={`transition-transform ${turnosAbierto ? 'rotate-90' : ''}`}
              />
              {turnosAbierto ? 'Ocultar actividades' : 'Ver actividades'}
              {' '}({fase.turnos_vinculados})
            </button>
            {turnosAbierto && <ActividadesFase faseId={fase.id_fase_proyecto} />}
          </div>
        )}
      </div>
    )
  }

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

      {/* ── Fases únicas: Diseño / Compra ── */}
      {fasesAsignadas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fasesAsignadas.map(fase => {
            const labels    = FASE_ESPECIAL_LABELS[fase.orden] || {}
            const puedeEditar = user && (
              user.id_usuario === fase.id_usuario_asignado || user.rol === 'Administrador Sistema')
            const isSaving  = saving === fase.id_fase_proyecto
            const setEstado = async (estado) => {
              setSaving(fase.id_fase_proyecto)
              try {
                await updateFase(proyecto.id_proyecto, fase.id_fase_proyecto,
                  { estado, porcentaje_avance: estado === 'completada' ? 100 : 0 })
                toast.success(`Fase "${fase.fase_nombre}" actualizada`)
                refresh()
              } catch (err) {
                toast.error(err.response?.data?.message || 'Error al guardar')
              } finally { setSaving(null) }
            }
            return (
              <div key={fase.id_fase_proyecto}
                className="bg-surface border border-border rounded-card
                  shadow-card dark:shadow-card-dk p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-[13.5px] font-semibold text-ink">{fase.fase_nombre}</p>
                    <p className="font-mono text-[10.5px] text-faint mt-0.5 flex items-center gap-1">
                      <User size={11} /> {fase.usuario_asignado_nombre || 'Sin asignar'}
                    </p>
                  </div>
                  {!puedeEditar && (
                    <span title="Solo la persona asignada puede gestionar esta fase"
                      className="text-faint shrink-0"
                    >
                      <Lock size={13} />
                    </span>
                  )}
                </div>

                {!puedeEditar ? (
                  <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
                    font-semibold px-2.5 py-[5px] rounded-badge
                    ${(faseCfg[fase.estado] || faseCfg.pendiente).selectStyle}`}
                  >
                    {fase.estado === 'pendiente' ? 'Pendiente' : (labels[fase.estado] || estadoLabel[fase.estado])}
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" disabled={isSaving || fase.estado === 'en_curso'}
                      onClick={() => setEstado('en_curso')}
                      className={`flex-1 h-9 rounded-control text-[12px] font-semibold
                        border transition-colors disabled:opacity-60
                        ${fase.estado === 'en_curso'
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border text-muted hover:bg-hover'}`}
                    >
                      {labels.en_curso}
                    </button>
                    <button type="button" disabled={isSaving || fase.estado === 'completada'}
                      onClick={() => setEstado('completada')}
                      className={`flex-1 h-9 rounded-control text-[12px] font-semibold
                        border transition-colors disabled:opacity-60
                        ${fase.estado === 'completada'
                          ? 'bg-success/10 border-success/30 text-success'
                          : 'border-border text-muted hover:bg-hover'}`}
                    >
                      {labels.completada}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Fases editables ── */}
      <div className="bg-surface border border-border rounded-card
        shadow-card dark:shadow-card-dk overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-surface2
          flex items-center justify-between"
        >
          <h2 className="text-[14px] font-semibold text-ink">Fases del proyecto</h2>
          {fasesResto.length > 0 && (
            <div className="flex items-center gap-1 p-[3px] bg-surface border border-border rounded-control">
              {[
                { value: 'lista',  label: 'Lista',  icon: List },
                { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
              ].map(({ value, label, icon: Icon }) => (
                <button key={value} type="button" onClick={() => setVista(value)}
                  className={`flex items-center gap-1.5 h-[26px] px-2.5 rounded-[6px] text-[11.5px]
                    font-semibold transition-colors
                    ${vista === value ? 'bg-primary text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {fasesResto.length === 0 ? (
          <div className="p-10 text-center font-mono text-[13px] text-faint">
            No hay fases registradas.
          </div>
        ) : vista === 'kanban' ? (
          mostrarPorItem ? (
            <ItemsKanban grupos={gruposItem} openItems={openItems} onToggleItem={toggleItem}
              openTurnos={openTurnos} onToggleTurnos={toggleTurnos} onDrop={handleKanbanDrop}
            />
          ) : (
            <FasesKanban fases={fasesResto} mostrarItem={false} onDrop={handleKanbanDrop}
              openTurnos={openTurnos} onToggleTurnos={toggleTurnos}
            />
          )
        ) : !mostrarPorItem ? (
          <div className="divide-y divide-border">
            {fasesResto.map((fase, idx) => renderFilaFase(fase, idx))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {gruposItem.map(grupo => {
              const abierto = openItems.has(grupo.id_detalle_pedido)
              const avanceGrupo = grupo.fases.length
                ? Math.round(grupo.fases.reduce((s, f) => s + f.porcentaje_avance, 0) / grupo.fases.length)
                : 0
              const estadoGrupo = grupo.fases.every(f => f.estado === 'completada') ? 'completada'
                : grupo.fases.some(f => f.estado === 'en_curso') ? 'en_curso'
                : 'pendiente'
              const egCfgGrupo = estadoGlobalCfg[estadoGrupo]
              return (
                <div key={grupo.id_detalle_pedido}>
                  <button onClick={() => toggleItem(grupo.id_detalle_pedido)}
                    className="w-full flex items-center gap-2.5 px-5 py-3
                      bg-surface2/60 hover:bg-surface2 transition-colors text-left"
                  >
                    <ChevronRight size={14}
                      className={`text-faint shrink-0 transition-transform ${abierto ? 'rotate-90' : ''}`}
                    />
                    <Package size={13} className="text-faint shrink-0" />
                    <p className="text-[12.5px] font-semibold text-ink truncate">
                      {grupo.item_producto || `Ítem #${grupo.id_detalle_pedido}`}
                    </p>
                    <span className={`font-mono text-[10px] font-semibold px-2 py-[3px]
                      rounded-badge shrink-0 ${egCfgGrupo.badge}`}
                    >
                      {egCfgGrupo.label}
                    </span>
                    <div className="hidden sm:flex items-center gap-1.5 w-[90px] shrink-0">
                      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                        <div className={`h-1.5 rounded-full ${progressColor(avanceGrupo)}`}
                          style={{ width: `${avanceGrupo}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10.5px] text-muted tabular-nums">{avanceGrupo}%</span>
                    </div>
                    {grupo.item_fecha_entrega && (
                      <span className="font-mono text-[10.5px] text-faint ml-auto shrink-0 hidden md:inline">
                        Entrega: {fmtFecha(grupo.item_fecha_entrega)}
                      </span>
                    )}
                  </button>
                  {abierto && (
                    <div className="divide-y divide-border">
                      {grupo.fases.map((fase, idx) => renderFilaFase(fase, idx))}
                    </div>
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
