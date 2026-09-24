import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, ChevronDown, Plus, Trash2, X,
  Play, Check, CheckCircle, Wrench, Pencil, Ban, List, LayoutGrid,
} from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getProgramacion, updateEstadoTurno, updateAvanceTurno, deleteProgramacion } from '../api/programacion.service'
import { getUsuarios }       from '../api/usuarios.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import { getProyectos }      from '../api/proyectos.service'
import { canDo, canManagePlanta } from '../utils/auth'
import Spinner     from '../components/ui/Spinner'
import EmptyState  from '../components/ui/EmptyState'
import FieldFilter from '../components/ui/FieldFilter'
import TurnoModal   from '../components/programacion/TurnoModal'
import toast      from 'react-hot-toast'

// ── Helpers de fecha ──────────────────────────────────────────────────────────
const toISO = d => d.toISOString().split('T')[0]

const DAYS_SHORT   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DAYS_LONG    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const MONTHS_LONG  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
  'septiembre','octubre','noviembre','diciembre']
const fmtFechaCorta = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}
const fmtFechaLarga = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} de ${MONTHS_LONG[d.getMonth()]}`
}
const isoDia = (v) => String(v ?? '').slice(0, 10)

// ── Vistas de periodo: día · semana · mes ────────────────────────────────────
const startOfWeek = (iso) => {           // lunes de la semana que contiene la fecha
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}
const rangoDe = (iso, modo) => {
  if (modo === 'semana') {
    const a = startOfWeek(iso)
    const b = new Date(a); b.setDate(a.getDate() + 6)
    return { desde: toISO(a), hasta: toISO(b) }
  }
  if (modo === 'mes') {
    const d = new Date(iso + 'T12:00:00')
    const a = new Date(d.getFullYear(), d.getMonth(), 1, 12)
    const b = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12)
    return { desde: toISO(a), hasta: toISO(b) }
  }
  return { desde: iso, hasta: iso }
}
const fmtPeriodoLabel = (iso, modo) => {
  if (modo === 'dia') return fmtFechaCorta(iso)
  if (modo === 'semana') {
    const { desde, hasta } = rangoDe(iso, 'semana')
    const a = new Date(desde + 'T12:00:00'), b = new Date(hasta + 'T12:00:00')
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
      : `${a.getDate()} ${MONTHS_SHORT[a.getMonth()]} – ${b.getDate()} ${MONTHS_SHORT[b.getMonth()]}`
  }
  const d = new Date(iso + 'T12:00:00')
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
const MODOS = [
  { value: 'dia',    label: 'Día'    },
  { value: 'semana', label: 'Semana' },
  { value: 'mes',    label: 'Mes'    },
]

// ── Helpers de tiempo ─────────────────────────────────────────────────────────
function fmtTime(minutes) {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

const initials = (n) =>
  (n || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()

// ── Config de estados ─────────────────────────────────────────────────────────
const estadoConfig = {
  programado: {
    label: 'Programado', bar: 'bg-secondary',
    badge: 'bg-secondary/10 text-secondary', dot: 'bg-secondary',
  },
  en_proceso: {
    label: 'En proceso', bar: 'bg-primary',
    badge: 'bg-primary/10 text-primary',     dot: 'bg-primary',
  },
  completado: {
    label: 'Completado', bar: 'bg-success',
    badge: 'bg-success/10 text-success',     dot: 'bg-success',
  },
  cancelado: {
    label: 'Cancelado',  bar: 'bg-error',
    badge: 'bg-error/10 text-error',         dot: 'bg-error',
  },
}

// ── useTimer hook ─────────────────────────────────────────────────────────────
function useTimer(startISO, active) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active || !startISO) { setElapsed(0); return }
    const start = new Date(startISO).getTime()
    const tick  = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startISO, active])
  return elapsed
}

// ── Badge de estado con punto pulsante (en_proceso) ───────────────────────────
function StateBadge({ estado }) {
  const cfg    = estadoConfig[estado] || estadoConfig.programado
  const isLive = estado === 'en_proceso'
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px]
      font-semibold px-2.5 py-[5px] rounded-badge ${cfg.badge}`}
    >
      <span className="relative flex items-center justify-center w-2.5 h-2.5">
        {isLive && (
          <span className={`absolute w-full h-full rounded-full animate-ring ${cfg.dot}`} />
        )}
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}
          ${isLive ? 'animate-pulse-dot' : ''}`}
        />
      </span>
      {cfg.label}
    </span>
  )
}

// ── Fila compacta de actividad ────────────────────────────────────────────────
function ActivityRow({ item, onClick, onIniciar, onCompletar, onEditar, onCancelar, onDelete, showProyecto = false }) {
  const isLive    = item.estado === 'en_proceso'
  const isDone    = item.estado === 'completado' || item.estado === 'cancelado'
  const elapsed   = useTimer(item.updated_at, isLive)

  const handleCompletar = (e) => {
    e.stopPropagation()
    const tiempoReal = isLive ? Math.round(elapsed / 60000) : null
    onCompletar(item, tiempoReal)
  }

  return (
    <div
      onClick={onClick}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3
        cursor-pointer hover:bg-hover transition-colors
        ${item.estado === 'cancelado' ? 'opacity-60' : ''}`}
    >
      {/* Fase + ítem */}
      <div className="min-w-[180px] flex-1">
        <p className="text-[13px] font-medium text-ink truncate">
          {item.fase_nombre || item.observaciones?.split('\n')[0] || 'Sin fase asignada'}
          {item.item_producto && (
            <span className="ml-1.5 font-mono text-[10px] font-semibold text-secondary
              bg-secondary/10 px-1.5 py-[1px] rounded-badge align-middle"
            >
              {item.item_producto}
            </span>
          )}
        </p>
        {showProyecto && (
          <p className="text-[11px] text-faint truncate mt-0.5">
            {item.proyecto || 'Sin proyecto'}
            {item.cliente ? ` · ${item.cliente}` : ''}
          </p>
        )}
      </div>

      {/* Operario */}
      <div className="flex items-center gap-1.5 w-[130px] shrink-0">
        <div className="w-6 h-6 rounded-badge shrink-0
          bg-primary/10 text-primary text-[9px] font-bold
          flex items-center justify-center"
        >
          {initials(item.operario)}
        </div>
        <span className="text-[12px] text-muted truncate">{item.operario || 'Sin asignar'}</span>
      </div>

      {/* Máquina */}
      <div className="hidden sm:flex items-center gap-1.5 w-[150px] shrink-0">
        <Wrench size={12} className="text-faint shrink-0" />
        <span className="text-[12px] text-muted truncate">
          {item.maquina_codigo ? `${item.maquina} · ${item.maquina_codigo}` : item.maquina}
        </span>
      </div>

      {/* Avance / tiempo */}
      <div className="hidden md:block w-[90px] shrink-0">
        {isLive ? (
          <div>
            <div className="h-1 rounded-full bg-surface2 overflow-hidden mb-1">
              <div className="h-1 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${item.porcentaje_avance}%` }}
              />
            </div>
            <span className="font-mono text-[10.5px] text-primary tabular-nums">
              {fmtElapsed(elapsed)}
            </span>
          </div>
        ) : (
          <span className="font-mono text-[11px] text-faint">
            {item.tiempo_real ? fmtTime(item.tiempo_real) : fmtTime(item.tiempo_estimado)}
          </span>
        )}
      </div>

      <StateBadge estado={item.estado} />

      {/* Acciones — solo líder de planta / coordinación de producción */}
      {!isDone && canManagePlanta() && (
        <div className="flex items-center gap-1.5 ml-auto" onClick={e => e.stopPropagation()}>
          {item.estado === 'programado' && canDo('programacion', 'editar') && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditar(item) }}
              className="w-7 h-7 flex items-center justify-center rounded-badge
                text-faint hover:bg-primary/10 hover:text-primary transition-colors"
              title="Editar"
            >
              <Pencil size={13} />
            </button>
          )}

          {canDo('programacion', 'eliminar') && (
            <button
              onClick={(e) => { e.stopPropagation(); onCancelar(item) }}
              className="w-7 h-7 flex items-center justify-center rounded-badge
                text-faint hover:bg-warning/10 hover:text-warning transition-colors"
              title="Cancelar"
            >
              <Ban size={13} />
            </button>
          )}

          {canDo('programacion', 'eliminar') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(item) }}
              className="w-7 h-7 flex items-center justify-center rounded-badge
                text-faint hover:bg-error/10 hover:text-error transition-colors"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          )}

          {item.estado === 'programado' && (
            <button
              onClick={(e) => { e.stopPropagation(); onIniciar(item) }}
              className="flex items-center gap-1.5 px-3 h-[28px]
                bg-primary hover:bg-primary-hover text-white
                rounded-control text-[11.5px] font-semibold shadow-btn transition-colors"
            >
              <Play size={10} /> Iniciar
            </button>
          )}

          {item.estado === 'en_proceso' && (
            <button
              onClick={handleCompletar}
              className="flex items-center gap-1.5 px-3 h-[28px]
                bg-success/10 hover:bg-success/20 text-success
                border border-success/30 rounded-control text-[11.5px] font-semibold
                transition-colors"
            >
              <Check size={10} /> Completar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Resumen del día ────────────────────────────────────────────────────────────
function ResumenDia({ total, enCurso, completados, sinOperario, periodoLabel = 'Turnos hoy' }) {
  const cells = [
    { label: periodoLabel,     value: total },
    { label: 'En curso',       value: enCurso,      tone: enCurso > 0 ? 'text-primary' : 'text-ink' },
    { label: 'Completados',    value: completados,  tone: 'text-success' },
    { label: 'Sin operario',   value: sinOperario,  tone: sinOperario > 0 ? 'text-error' : 'text-ink' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-card
      overflow-hidden border border-border shadow-card dark:shadow-card-dk"
    >
      {cells.map(c => (
        <div key={c.label} className="bg-surface p-4">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[.08em] text-faint">
            {c.label}
          </p>
          <p className={`text-[22px] font-semibold leading-tight mt-1 tabular-nums ${c.tone || 'text-ink'}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Grupo de actividades por proyecto (desplegable) ───────────────────────────
function ProjectGroup({ nombre, items, collapsed, onToggle, onSelect, onIniciar, onCompletar, onEditar, onCancelar, onDelete, showProyecto = false }) {
  return (
    <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 bg-surface2
          hover:bg-hover transition-colors text-left"
      >
        <ChevronRight size={14}
          className={`text-faint shrink-0 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        />
        <span className="text-[13.5px] font-semibold text-ink truncate">{nombre}</span>
        <span className="font-mono text-[10.5px] text-faint ml-auto shrink-0">
          {items.length} turno{items.length !== 1 ? 's' : ''}
        </span>
      </button>
      {!collapsed && (
        <div className="divide-y divide-border">
          {items.map(item => (
            <ActivityRow key={item.id_programacion} item={item}
              onClick={() => onSelect(item)}
              onIniciar={onIniciar} onCompletar={onCompletar}
              onEditar={onEditar} onCancelar={onCancelar} onDelete={onDelete}
              showProyecto={showProyecto}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Modal de confirmación de completar ────────────────────────────────────────
function ConfirmModal({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-sm p-6 text-center my-4 animate-md-in"
      >
        <div className="w-12 h-12 bg-success/10 rounded-[14px] flex items-center
          justify-center mx-auto mb-4"
        >
          <CheckCircle size={24} className="text-success" />
        </div>
        <h3 className="text-[16px] font-semibold text-ink mb-1">¿Confirmar finalización?</h3>
        <p className="text-[13px] text-muted">
          Esta actividad se marcará como <span className="font-semibold text-success">completada</span>.
        </p>
        {item.fase_nombre && (
          <p className="text-[12px] text-primary mt-2 font-medium">
            El avance de la fase "{item.fase_nombre}" se recalculará automáticamente.
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover transition-colors"
          >
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 h-10 bg-success hover:bg-emerald-600 text-white
              rounded-control text-[13px] font-semibold transition-colors"
          >
            Sí, completar
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// ── Modal de detalle de actividad ─────────────────────────────────────────────
function TaskDetailModal({ item, onClose, onIniciar, onCompletar, onEditar, onCancelar, onDelete, onAvance }) {
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const [avance,        setAvance]        = useState(item.porcentaje_avance ?? 0)
  const [savingAvance,  setSavingAvance]  = useState(false)
  const cfg       = estadoConfig[item.estado] || estadoConfig.programado
  const isLive    = item.estado === 'en_proceso'
  const elapsed   = useTimer(item.updated_at, isLive)
  const isDone    = item.estado === 'completado' || item.estado === 'cancelado'
  const avanceDirty = avance !== (item.porcentaje_avance ?? 0)

  const handleGuardarAvance = async () => {
    setSavingAvance(true)
    await onAvance(item, avance)
    setSavingAvance(false)
  }

  const handleIniciar = async () => {
    setLoadingAction(true)
    await onIniciar(item)
    setLoadingAction(false)
    onClose()
  }

  const handleConfirmCompletar = async () => {
    const tiempoReal = isLive ? Math.round(elapsed / 60000) : null
    setLoadingAction(true)
    await onCompletar(item, tiempoReal)
    setLoadingAction(false)
    setShowConfirm(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto
        bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
      >
        <div className="min-h-full flex items-center justify-center">
        <div className="bg-surface border border-border rounded-[18px] shadow-modal
          w-full max-w-lg my-4 overflow-hidden animate-md-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5
            border-b border-border bg-gradient-to-b from-primary/5 to-surface"
          >
            <div className="flex items-center gap-3">
              <StateBadge estado={item.estado} />
              <h3 className="text-[15px] font-semibold text-ink">Detalle de actividad</h3>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-[8px]
                bg-surface2 text-faint hover:text-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Proyecto + Fase */}
            <div className="bg-surface2 rounded-[11px] p-4">
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-1">Proyecto</p>
              <p className="text-[18px] font-bold text-ink">
                {item.proyecto || 'Sin proyecto asignado'}
              </p>
              {item.fase_nombre && (
                <p className="text-[13px] text-primary mt-1 font-medium">
                  Fase: {item.fase_nombre}
                  {item.item_producto && (
                    <span className="ml-1.5 font-mono text-[10.5px] font-semibold
                      text-secondary bg-secondary/10 px-1.5 py-[2px] rounded-badge"
                    >
                      {item.item_producto}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-1">Operario</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-badge bg-primary/10 text-primary
                    text-[9px] font-bold flex items-center justify-center shrink-0"
                  >
                    {initials(item.operario)}
                  </div>
                  <p className="text-[13px] font-semibold text-ink">{item.operario}</p>
                </div>
              </div>
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-1">Máquina / Equipo</p>
                <p className="text-[13px] font-medium text-ink">
                  {item.maquina_codigo ? `[${item.maquina_codigo}] ` : ''}{item.maquina}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-1">Tiempo estimado</p>
                <p className="font-mono text-[13px] font-semibold text-ink">
                  {fmtTime(item.tiempo_estimado)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-1">Tiempo real</p>
                {item.tiempo_real ? (
                  <p className="font-mono text-[13px] font-semibold text-success">
                    {fmtTime(item.tiempo_real)}
                  </p>
                ) : isLive ? (
                  <p className="font-mono text-[18px] font-bold text-primary tabular-nums">
                    {fmtElapsed(elapsed)}
                  </p>
                ) : (
                  <p className="font-mono text-[13px] text-faint">—</p>
                )}
              </div>
            </div>

            {isLive && canManagePlanta() && (
              <div className="bg-surface2 rounded-[11px] p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] font-semibold uppercase
                    tracking-[.08em] text-faint">Avance de la actividad</p>
                  <span className="font-mono text-[15px] font-bold text-primary tabular-nums">
                    {avance}%
                  </span>
                </div>
                <input
                  type="range" min={0} max={99} value={avance}
                  onChange={e => setAvance(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                {avanceDirty && (
                  <button
                    onClick={handleGuardarAvance} disabled={savingAvance}
                    className="mt-3 w-full h-9 flex items-center justify-center gap-2
                      bg-primary hover:bg-primary-hover disabled:opacity-50 text-white
                      rounded-control text-[12.5px] font-semibold transition-colors"
                  >
                    {savingAvance ? 'Guardando…' : 'Guardar avance'}
                  </button>
                )}
              </div>
            )}

            {item.observaciones && (
              <div>
                <p className="font-mono text-[9px] font-semibold uppercase
                  tracking-[.08em] text-faint mb-1">Observaciones</p>
                <p className="text-[13px] text-muted italic bg-surface2
                  rounded-[10px] p-3 leading-relaxed">
                  "{item.observaciones}"
                </p>
              </div>
            )}

            {item.estado === 'completado' && (
              <div className="flex items-start gap-2 bg-success/8
                border border-success/20 rounded-[10px] p-3"
              >
                <CheckCircle size={15} className="text-success mt-0.5 shrink-0" />
                <p className="text-[13px] text-success">
                  Actividad completada.
                  {item.fase_nombre && ` El avance de la fase "${item.fase_nombre}" se recalculó automáticamente.`}
                </p>
              </div>
            )}
          </div>

          {/* Footer actions — solo líder de planta / coordinación de producción */}
          <div className="px-6 py-4 border-t border-border bg-surface2">
            {!isDone && canManagePlanta() ? (
              <div className="flex gap-3">
                {item.estado === 'programado' && canDo('programacion', 'editar') && (
                  <button
                    onClick={() => { onEditar(item); onClose() }}
                    className="w-10 h-10 flex items-center justify-center rounded-control
                      border border-border text-primary hover:bg-primary/10 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDo('programacion', 'eliminar') && (
                  <button
                    onClick={() => { onCancelar(item); onClose() }}
                    className="w-10 h-10 flex items-center justify-center rounded-control
                      border border-border text-warning hover:bg-warning/10 transition-colors"
                    title="Cancelar"
                  >
                    <Ban size={16} />
                  </button>
                )}
                {canDo('programacion', 'eliminar') && (
                  <button
                    onClick={() => { onDelete(item); onClose() }}
                    className="w-10 h-10 flex items-center justify-center rounded-control
                      border border-border text-error hover:bg-error/10 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {item.estado === 'programado' && (
                  <button
                    onClick={handleIniciar} disabled={loadingAction}
                    className="flex-1 h-10 flex items-center justify-center gap-2
                      bg-primary hover:bg-primary-hover disabled:opacity-50 text-white
                      rounded-control text-[13px] font-semibold shadow-btn transition-colors"
                  >
                    <Play size={14} />
                    {loadingAction ? 'Iniciando…' : 'Iniciar actividad'}
                  </button>
                )}
                <button
                  onClick={() => setShowConfirm(true)} disabled={loadingAction}
                  className="flex-1 h-10 flex items-center justify-center gap-2
                    bg-success/10 hover:bg-success/20 text-success disabled:opacity-50
                    border border-success/30 rounded-control text-[13px] font-semibold
                    transition-colors"
                >
                  <Check size={14} />
                  Marcar completada
                </button>
              </div>
            ) : (
              <button onClick={onClose}
                className="w-full h-10 border border-border rounded-control text-[13px]
                  text-muted hover:bg-hover transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          item={item}
          onConfirm={handleConfirmCompletar}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}

// ── Tablero Kanban de turnos (arrastrar y soltar entre columnas de estado) ────
const KANBAN_ESTADOS = ['programado', 'en_proceso', 'completado', 'cancelado']

function KanbanCard({ item, draggable, onDragStart, onClick }) {
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onClick={onClick}
      className={`bg-surface border border-border rounded-control p-3 shadow-card
        dark:shadow-card-dk transition-colors hover:bg-hover
        ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${item.estado === 'cancelado' ? 'opacity-60' : ''}`}
    >
      <p className="text-[12.5px] font-medium text-ink truncate">
        {item.fase_nombre || item.observaciones?.split('\n')[0] || 'Sin fase asignada'}
      </p>
      <p className="text-[11px] text-faint truncate mt-0.5">
        {item.proyecto || 'Sin proyecto'}
      </p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-badge shrink-0 bg-primary/10 text-primary
            text-[8px] font-bold flex items-center justify-center"
          >
            {initials(item.operario)}
          </div>
          <span className="text-[11px] text-muted truncate">{item.operario || 'Sin asignar'}</span>
        </div>
        {item.estado === 'en_proceso' && (
          <span className="font-mono text-[10.5px] text-primary tabular-nums shrink-0">
            {item.porcentaje_avance}%
          </span>
        )}
      </div>
    </div>
  )
}

function KanbanBoard({ items, onSelect, onDrop }) {
  const [dragId, setDragId] = useState(null)
  const puedeArrastrar = canManagePlanta()

  const handleDropColumn = (estado) => {
    if (dragId == null) return
    const item = items.find(i => i.id_programacion === dragId)
    setDragId(null)
    if (item) onDrop(item, estado)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {KANBAN_ESTADOS.map(estado => {
        const cfg = estadoConfig[estado]
        const cards = items.filter(i => i.estado === estado)
        return (
          <div key={estado}
            onDragOver={e => puedeArrastrar && e.preventDefault()}
            onDrop={() => handleDropColumn(estado)}
            className="bg-surface2 border border-border rounded-card p-2.5 min-h-[120px]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]
                font-semibold text-ink"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
              <span className="font-mono text-[10.5px] text-faint">{cards.length}</span>
            </div>
            <div className="space-y-2">
              {cards.map(item => (
                <KanbanCard
                  key={item.id_programacion}
                  item={item}
                  draggable={puedeArrastrar}
                  onDragStart={() => setDragId(item.id_programacion)}
                  onClick={() => onSelect(item)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Programacion() {
  const [fecha,           setFecha]           = useState(toISO(new Date()))
  const [modo,            setModo]            = useState('dia') // 'dia' | 'semana' | 'mes'
  const [modoMenu,        setModoMenu]        = useState(false)
  const [modalTurno,      setModalTurno]      = useState(null) // null | 'new' | <turno a editar>
  const [selectedItem,    setSelectedItem]    = useState(null)
  const [vista,           setVista]           = useState('lista') // 'lista' | 'kanban'
  const [activeTab,       setActiveTab]       = useState('todas')
  const [search,          setSearch]          = useState('')
  const [searchField,     setSearchField]     = useState('todos') // 'todos' | 'operario' | 'proyecto' | 'cliente'
  // Grupos abiertos manualmente (por defecto todos colapsados; al buscar se
  // autoexpanden los que tengan coincidencias, sin tocar este estado).
  const [expandedGroups,  setExpandedGroups]  = useState(new Set())

  const toggleGroup = (key) => setExpandedGroups(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const SEARCH_FIELDS = [
    { value: 'todos',     label: 'Todo',      placeholder: 'Filtrar actividades…' },
    { value: 'operario',  label: 'Operario',  placeholder: 'Nombre del operario…' },
    { value: 'proyecto',  label: 'Proyecto',  placeholder: 'Nombre del proyecto…' },
    { value: 'cliente',   label: 'Cliente',   placeholder: 'Nombre del cliente…' },
  ]

  const rango = rangoDe(fecha, modo)
  const { data, loading, error, refresh } = useFetch(
    () => getProgramacion(modo === 'dia' ? fecha : rango),
    [rango.desde, rango.hasta])
  const { data: usuarios }  = useFetch(getUsuarios)
  const { data: maquinas }  = useFetch(getMaquinaria)
  const { data: proyectos } = useFetch(getProyectos)

  // Navegación: las flechas avanzan/retroceden según el modo (día, semana o mes).
  const step = (dir) => {
    const d = new Date(fecha + 'T12:00:00')
    if (modo === 'semana')   d.setDate(d.getDate() + dir * 7)
    else if (modo === 'mes') d.setMonth(d.getMonth() + dir)
    else                     d.setDate(d.getDate() + dir)
    setFecha(toISO(d))
  }
  const prevDay = () => step(-1)
  const nextDay = () => step(1)
  const hoyISO  = toISO(new Date())
  const hoyEnRango = hoyISO >= rango.desde && hoyISO <= rango.hasta

  const handleIniciar = async (item) => {
    try {
      await updateEstadoTurno(item.id_programacion, { estado: 'en_proceso' })
      toast.success('Actividad iniciada')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al iniciar')
    }
  }

  const handleCompletar = async (item, tiempoReal) => {
    try {
      await updateEstadoTurno(item.id_programacion, { estado: 'completado', tiempo_real: tiempoReal })
      toast.success('Actividad marcada como completada')
      refresh()
    } catch { toast.error('Error al completar') }
  }

  const handleAvance = async (item, porcentaje) => {
    try {
      await updateAvanceTurno(item.id_programacion, porcentaje)
      toast.success('Avance actualizado')
      refresh()
    } catch { toast.error('Error al actualizar el avance') }
  }

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar la actividad de ${item.operario}?`)) return
    try {
      await deleteProgramacion(item.id_programacion)
      toast.success('Actividad eliminada')
      refresh()
    } catch { toast.error('Error al eliminar') }
  }

  const handleCancelar = async (item) => {
    if (!confirm('¿Cancelar esta actividad?')) return
    try {
      await updateEstadoTurno(item.id_programacion, { estado: 'cancelado' })
      toast.success('Actividad cancelada')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al cancelar')
    }
  }

  // Cambio de estado arrastrando una card en la vista Kanban. Reusa los mismos
  // handlers que la vista lista; a "completado" no pide tiempo real (se puede
  // ajustar luego desde el detalle) y a "programado" se llama directo al backend.
  const handleKanbanDrop = async (item, estado) => {
    if (item.estado === estado) return
    if (estado === 'en_proceso') return handleIniciar(item)
    if (estado === 'completado') return handleCompletar(item, null)
    if (estado === 'cancelado')  return handleCancelar(item)
    try {
      await updateEstadoTurno(item.id_programacion, { estado })
      toast.success('Actividad actualizada')
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al mover la actividad')
    }
  }

  // Conteo por estado
  const stats = {
    programado: (data || []).filter(r => r.estado === 'programado').length,
    en_proceso: (data || []).filter(r => r.estado === 'en_proceso').length,
    completado: (data || []).filter(r => r.estado === 'completado').length,
    cancelado:  (data || []).filter(r => r.estado === 'cancelado').length,
  }
  const sinOperario = (data || []).filter(r => !r.id_operario).length

  const TABS = [
    { key: 'todas',      label: 'Todas',        count: (data || []).length },
    { key: 'en_proceso', label: 'En curso',     count: stats.en_proceso },
    { key: 'programado', label: 'Programadas',  count: stats.programado },
    { key: 'completado', label: 'Completadas',  count: stats.completado },
  ]

  // Actividades de la pestaña activa, agrupadas por proyecto (orden de llegada del backend)
  const filtradasPorTab = activeTab === 'todas'
    ? (data || [])
    : (data || []).filter(r => r.estado === activeTab)

  const searchActive = search.trim().length > 0
  const q = search.trim().toLowerCase()
  const matchesSearch = item => {
    if (!q) return true
    if (searchField === 'operario') return (item.operario || '').toLowerCase().includes(q)
    if (searchField === 'proyecto') return (item.proyecto || '').toLowerCase().includes(q)
    if (searchField === 'cliente')  return (item.cliente || '').toLowerCase().includes(q)
    return (item.operario || '').toLowerCase().includes(q) ||
      (item.proyecto || '').toLowerCase().includes(q) ||
      (item.cliente || '').toLowerCase().includes(q) ||
      (item.fase_nombre || '').toLowerCase().includes(q)
  }
  // Vista Kanban: todas las actividades del periodo (sin filtrar por pestaña de
  // estado, ya que cada estado es una columna), solo respetando el buscador.
  const kanbanItems = (data || []).filter(matchesSearch)

  const filtradasPorSearch = filtradasPorTab.filter(matchesSearch)

  // En vista día se agrupa por proyecto; en semana / mes por fecha.
  const agruparPorFecha = modo !== 'dia'
  const grupos = []
  const gruposPorId = new Map()
  for (const item of filtradasPorSearch) {
    const key = agruparPorFecha
      ? (isoDia(item.fecha) || 'sin-fecha')
      : (item.id_proyecto ?? 'sin-proyecto')
    if (!gruposPorId.has(key)) {
      const g = {
        key,
        nombre: agruparPorFecha
          ? fmtFechaLarga(key)
          : (item.proyecto || 'Sin proyecto'),
        items: [],
      }
      gruposPorId.set(key, g)
      grupos.push(g)
    }
    gruposPorId.get(key).items.push(item)
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">

      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-[20px] font-semibold text-ink">Programación de planta</h1>
        <p className="font-mono text-[11px] text-faint mt-0.5 uppercase tracking-[.06em]">
          {(data || []).length} actividades · {stats.en_proceso} en proceso
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Navegador de fecha */}
        <div className="flex items-center gap-1">
          <button onClick={prevDay}
            className="w-[38px] h-[38px] flex items-center justify-center
              bg-surface border border-border rounded-control
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Etiqueta del periodo — al hacer clic se elige día / semana / mes o se salta a una fecha */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setModoMenu(o => !o)}
              className="flex items-center gap-2 h-[38px] px-4
                bg-surface border border-border rounded-control
                font-mono text-[13px] font-semibold text-ink whitespace-nowrap
                hover:bg-hover transition-colors select-none"
            >
              {fmtPeriodoLabel(fecha, modo)}
              <ChevronDown size={14}
                className={`text-faint transition-transform ${modoMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {modoMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setModoMenu(false)} />
                <div className="absolute left-0 top-[44px] z-20 w-[248px]
                  bg-surface border border-border rounded-card shadow-modal p-3 space-y-3"
                >
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase
                      tracking-[.08em] text-faint mb-1.5">Ver por</p>
                    <div className="flex gap-1">
                      {MODOS.map(m => (
                        <button key={m.value} type="button"
                          onClick={() => { setModo(m.value); setModoMenu(false) }}
                          className={`flex-1 h-8 rounded-control text-[12px] font-semibold
                            border transition-colors
                            ${modo === m.value
                              ? 'bg-primary text-white border-primary'
                              : 'bg-surface border-border text-muted hover:bg-hover hover:text-ink'}`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase
                      tracking-[.08em] text-faint mb-1.5">Ir a una fecha</p>
                    <input
                      type="date"
                      value={fecha}
                      onChange={e => { if (e.target.value) { setFecha(e.target.value); setModoMenu(false) } }}
                      className="w-full h-9 border border-border rounded-control px-2.5 text-[12px]
                        bg-surface2 text-ink focus:outline-none focus:ring-2 focus:ring-primary/25"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <button onClick={nextDay}
            className="w-[38px] h-[38px] flex items-center justify-center
              bg-surface border border-border rounded-control
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {!hoyEnRango && (
            <button onClick={() => setFecha(hoyISO)}
              className="h-[38px] px-3 font-mono text-[12px] text-primary
                border border-primary/30 bg-primary/8 hover:bg-primary/15
                rounded-control transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Buscador con selector de campo */}
        <FieldFilter
          fields={SEARCH_FIELDS}
          field={searchField}
          onFieldChange={setSearchField}
          value={search}
          onValueChange={setSearch}
          className="flex-1 min-w-[220px] max-w-xs"
        />

        <div className="flex-1" />

        {/* Alternar Lista / Kanban */}
        <div className="flex items-center gap-1 h-[38px] p-[3px] bg-surface border border-border rounded-control">
          {[
            { value: 'lista',  label: 'Lista',  icon: List },
            { value: 'kanban', label: 'Kanban', icon: LayoutGrid },
          ].map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => setVista(value)}
              className={`flex items-center gap-1.5 h-[30px] px-3 rounded-[7px] text-[12px]
                font-semibold transition-colors
                ${vista === value ? 'bg-primary text-white' : 'text-muted hover:bg-hover hover:text-ink'}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Botón primario — solo líder de planta / coordinación de producción */}
        {canManagePlanta() && (
          <button onClick={() => setModalTurno('new')}
            className="h-[38px] flex items-center gap-2 px-4
              bg-primary hover:bg-primary-hover text-white
              text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} />
            Programar actividad
          </button>
        )}
      </div>

      {loading ? (
        <Spinner text="Cargando actividades..." />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : (data || []).length === 0 ? (
        <EmptyState
          title="Sin actividades programadas"
          description={
            modo === 'dia'
              ? `No hay actividades para el ${fmtFechaCorta(fecha)}.`
              : `No hay actividades en ${modo === 'semana' ? 'la semana' : 'el mes'} de ${fmtPeriodoLabel(fecha, modo)}.`
          }
        />
      ) : (
        <>
          {/* ── Resumen del periodo ── */}
          <ResumenDia
            periodoLabel={modo === 'dia' ? 'Turnos hoy' : modo === 'semana' ? 'Turnos (semana)' : 'Turnos (mes)'}
            total={(data || []).length}
            enCurso={stats.en_proceso}
            completados={stats.completado}
            sinOperario={sinOperario}
          />

          {vista === 'kanban' ? (
            <KanbanBoard
              items={kanbanItems}
              onSelect={setSelectedItem}
              onDrop={handleKanbanDrop}
            />
          ) : (
            <>
              {/* ── Pestañas por estado ── */}
              <div className="flex flex-wrap gap-1.5">
                {TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`h-[34px] px-3.5 rounded-control font-mono text-[12px]
                      font-semibold transition-colors border
                      ${activeTab === t.key
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-border text-muted hover:bg-hover hover:text-ink'}`}
                  >
                    {t.label} {t.count}
                  </button>
                ))}
              </div>

              {/* ── Actividades agrupadas por proyecto ── */}
              {grupos.length === 0 ? (
                <EmptyState title="Sin actividades" description={
                  searchActive
                    ? 'No hay coincidencias con el filtro de búsqueda.'
                    : 'No hay turnos en este estado para la fecha seleccionada.'
                } />
              ) : (
                <div className="space-y-3">
                  {grupos.map(g => (
                    <ProjectGroup key={g.key} nombre={g.nombre} items={g.items}
                      showProyecto={agruparPorFecha}
                      collapsed={searchActive ? false
                        : agruparPorFecha ? expandedGroups.has(g.key) : !expandedGroups.has(g.key)}
                      onToggle={() => toggleGroup(g.key)}
                      onSelect={setSelectedItem}
                      onIniciar={handleIniciar}
                      onCompletar={handleCompletar}
                      onEditar={setModalTurno}
                      onCancelar={handleCancelar}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modales ── */}
      {modalTurno && (
        <TurnoModal
          fecha={fecha}
          turno={modalTurno === 'new' ? null : modalTurno}
          usuarios={usuarios || []}
          maquinas={maquinas || []}
          proyectos={proyectos || []}
          onClose={() => setModalTurno(null)}
          onSaved={refresh}
        />
      )}

      {selectedItem && (
        <TaskDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onIniciar={handleIniciar}
          onCompletar={handleCompletar}
          onEditar={setModalTurno}
          onCancelar={handleCancelar}
          onDelete={handleDelete}
          onAvance={handleAvance}
        />
      )}
    </div>
  )
}
