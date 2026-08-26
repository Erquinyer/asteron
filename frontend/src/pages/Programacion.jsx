import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X,
  Play, Check, CheckCircle, Calendar, Wrench,
} from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getProgramacion, createProgramacion, updateEstadoTurno, updateAvanceTurno, deleteProgramacion } from '../api/programacion.service'
import { getUsuarios }       from '../api/usuarios.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import { getProyectos, getProyecto } from '../api/proyectos.service'
import { canDo }             from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

// ── Helpers de fecha ──────────────────────────────────────────────────────────
const toISO = d => d.toISOString().split('T')[0]

const DAYS_SHORT   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const MONTHS_SHORT = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const fmtFechaCorta = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

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

// ── Estilos de formulario ─────────────────────────────────────────────────────
const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

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

// ── Card de actividad ─────────────────────────────────────────────────────────
function ActivityCard({ item, onClick, onIniciar, onCompletar, onDelete }) {
  const cfg       = estadoConfig[item.estado] || estadoConfig.programado
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
      className={`relative bg-surface border border-border rounded-card
        shadow-card dark:shadow-card-dk overflow-hidden cursor-pointer
        hover:border-border-strong hover:shadow-md transition-all duration-150
        ${item.estado === 'cancelado' ? 'opacity-60' : ''}`}
    >
      {/* Franja superior de color */}
      <div className={`h-1 w-full ${cfg.bar}`} />

      <div className="p-[18px]">
        {/* ── Header: código + badge ── */}
        <div className="flex items-start justify-between mb-2.5">
          <span className="font-mono text-[10.5px] text-faint">
            ACT-{String(item.id_programacion).padStart(4, '0')}
          </span>
          <StateBadge estado={item.estado} />
        </div>

        {/* ── Fase + Proyecto ── */}
        <p className="text-[15px] font-semibold text-ink leading-tight">
          {item.fase_nombre || item.observaciones?.split('\n')[0] || 'Sin fase asignada'}
        </p>
        <p className="text-[12.5px] text-muted mt-0.5 truncate">
          {item.proyecto || 'Sin proyecto'}
        </p>

        {/* ── Divider ── */}
        <div className="my-3 border-t border-border" />

        {/* ── Operario + Máquina ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-badge shrink-0
              bg-primary/10 text-primary text-[10px] font-bold
              flex items-center justify-center"
            >
              {initials(item.operario)}
            </div>
            <span className="text-[13px] text-muted">{item.operario}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-badge shrink-0
              bg-surface2 text-faint flex items-center justify-center"
            >
              <Wrench size={13} />
            </div>
            <span className="text-[12.5px] text-muted truncate">
              {item.maquina_codigo
                ? `${item.maquina} · ${item.maquina_codigo}`
                : item.maquina}
            </span>
          </div>
        </div>

        {/* ── Avance (solo si está en proceso) ── */}
        {isLive && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-faint">
                Avance
              </span>
              <span className="font-mono text-[10.5px] font-semibold text-primary tabular-nums">
                {item.porcentaje_avance}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
              <div className="h-1.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${item.porcentaje_avance}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="my-3 border-t border-border" />

        {/* ── Tiempos + Acción ── */}
        <div className="flex items-end justify-between gap-2">
          {/* Tiempos */}
          <div className="flex gap-4">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-0.5">Estim.</p>
              <p className="font-mono text-[13px] font-semibold text-ink">
                {fmtTime(item.tiempo_estimado)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase
                tracking-[.08em] text-faint mb-0.5">Real</p>
              {item.tiempo_real ? (
                <p className="font-mono text-[13px] font-semibold text-success">
                  {fmtTime(item.tiempo_real)}
                </p>
              ) : isLive ? (
                <p className="font-mono text-[13px] font-semibold text-primary tabular-nums">
                  {fmtElapsed(elapsed)}
                </p>
              ) : (
                <p className="font-mono text-[13px] font-semibold text-faint">—</p>
              )}
            </div>
          </div>

          {/* Botón de acción inline */}
          {!isDone && (
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {canDo('programacion', 'eliminar') && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item) }}
                  className="w-7 h-7 flex items-center justify-center rounded-badge
                    text-faint hover:bg-error/10 hover:text-error transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}

              {item.estado === 'programado' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onIniciar(item) }}
                  className="flex items-center gap-1.5 px-3 h-[30px]
                    bg-primary hover:bg-primary-hover text-white
                    rounded-control text-[12px] font-semibold shadow-btn transition-colors"
                >
                  <Play size={11} /> Iniciar
                </button>
              )}

              {item.estado === 'en_proceso' && (
                <button
                  onClick={handleCompletar}
                  className="flex items-center gap-1.5 px-3 h-[30px]
                    bg-success/10 hover:bg-success/20 text-success
                    border border-success/30 rounded-control text-[12px] font-semibold
                    transition-colors"
                >
                  <Check size={11} /> Completar
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmación de completar ────────────────────────────────────────
function ConfirmModal({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-sm p-6 text-center animate-md-in"
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
  )
}

// ── Modal de detalle de actividad ─────────────────────────────────────────────
function TaskDetailModal({ item, onClose, onIniciar, onCompletar, onDelete, onAvance }) {
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
      <div className="fixed inset-0 z-50 flex items-center justify-center
        bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
      >
        <div className="bg-surface border border-border rounded-[18px] shadow-modal
          w-full max-w-lg overflow-hidden animate-md-in"
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

            {isLive && (
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

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border bg-surface2">
            {!isDone ? (
              <div className="flex gap-3">
                {canDo('programacion', 'eliminar') && (
                  <button
                    onClick={() => { onDelete(item); onClose() }}
                    className="w-10 h-10 flex items-center justify-center rounded-control
                      border border-border text-error hover:bg-error/10 transition-colors"
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

// ── Modal de nueva actividad (TurnoModal) ─────────────────────────────────────
function TurnoModal({ fecha, usuarios, maquinas, proyectos, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha,
    id_operario: '', id_maquina: '', id_proyecto: '', id_fase_proyecto: '',
    tiempo_estimado: 480, observaciones: '',
  })
  const [fases,        setFases]        = useState([])
  const [loadingFases, setLoadingFases] = useState(false)
  const [saving,       setSaving]       = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => {
    if (!form.id_proyecto) { setFases([]); setForm(f => ({ ...f, id_fase_proyecto: '' })); return }
    setLoadingFases(true)
    getProyecto(form.id_proyecto)
      .then(({ data }) => { setFases(data.fases || []); setForm(f => ({ ...f, id_fase_proyecto: '' })) })
      .catch(() => setFases([]))
      .finally(() => setLoadingFases(false))
  }, [form.id_proyecto])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.id_operario || !form.id_maquina) {
      toast.error('Operario y máquina son requeridos'); return
    }
    setSaving(true)
    try {
      await createProgramacion(form)
      toast.success('Actividad programada')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al programar')
    } finally { setSaving(false) }
  }

  const operarios  = usuarios.filter(u => u.estado === 1)
  const maqActivas = maquinas.filter(m => ['activa', 'sin_asignar'].includes(m.estado))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center
      bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-ov-in"
    >
      <div className="bg-surface border border-border rounded-[18px] shadow-modal
        w-full max-w-md my-4 overflow-hidden animate-md-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface sticky top-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <Calendar size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Nueva actividad</h3>
              <p className="text-[12px] text-muted">Programar un turno de trabajo</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px]
              bg-surface2 text-faint hover:text-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" name="fecha" value={form.fecha} onChange={set}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Operario *</label>
            <select name="id_operario" value={form.id_operario} onChange={set}
              required className={inputCls}
            >
              <option value="">Seleccionar operario</option>
              {operarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre} — {u.rol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Máquina / Equipo *</label>
            <select name="id_maquina" value={form.id_maquina} onChange={set}
              required className={inputCls}
            >
              <option value="">Seleccionar equipo</option>
              {maqActivas.map(m => (
                <option key={m.id_maquina} value={m.id_maquina}>
                  {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Proyecto</label>
            <select name="id_proyecto" value={form.id_proyecto} onChange={set}
              className={inputCls}
            >
              <option value="">Sin proyecto</option>
              {proyectos.map(p => (
                <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {form.id_proyecto && (
            <div>
              <label className={labelCls}>Fase del proyecto</label>
              <select name="id_fase_proyecto" value={form.id_fase_proyecto}
                onChange={set} disabled={loadingFases} className={inputCls}
              >
                <option value="">{loadingFases ? 'Cargando fases…' : 'Sin fase específica'}</option>
                {fases.map(f => (
                  <option key={f.id_fase_proyecto} value={f.id_fase_proyecto}>
                    {f.fase_nombre} ({f.estado})
                  </option>
                ))}
              </select>
              <p className="font-mono text-[10px] text-faint mt-1">
                El avance de la fase se recalcula automáticamente a partir de sus turnos.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>Tiempo estimado (minutos)</label>
            <div className="flex items-center gap-2">
              <input type="number" name="tiempo_estimado" value={form.tiempo_estimado}
                onChange={set} min={30} step={30} className={inputCls} />
              <span className="font-mono text-[11px] text-faint whitespace-nowrap shrink-0">
                = {(form.tiempo_estimado / 60).toFixed(1)}h
              </span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Tarea / Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={set} rows={3}
              placeholder="Describe la tarea específica, instrucciones, etc."
              className={`${inputCls} h-auto py-2.5 resize-none`} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface2">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 h-10 bg-primary hover:bg-primary-hover disabled:opacity-50
              text-white rounded-control text-[13px] font-semibold shadow-btn transition-colors"
          >
            {saving ? 'Guardando…' : 'Programar actividad'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Programacion() {
  const [fecha,        setFecha]        = useState(toISO(new Date()))
  const [showModal,    setShowModal]    = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  const { data, loading, error, refresh } = useFetch(() => getProgramacion(fecha), [fecha])
  const { data: usuarios }  = useFetch(getUsuarios)
  const { data: maquinas }  = useFetch(getMaquinaria)
  const { data: proyectos } = useFetch(getProyectos)

  const prevDay = () => { const d = new Date(fecha); d.setDate(d.getDate() - 1); setFecha(toISO(d)) }
  const nextDay = () => { const d = new Date(fecha); d.setDate(d.getDate() + 1); setFecha(toISO(d)) }
  const isToday = fecha === toISO(new Date())

  const handleIniciar = async (item) => {
    try {
      await updateEstadoTurno(item.id_programacion, { estado: 'en_proceso' })
      toast.success('Actividad iniciada')
      refresh()
    } catch { toast.error('Error al iniciar') }
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

  // Conteo por estado
  const stats = {
    programado: (data || []).filter(r => r.estado === 'programado').length,
    en_proceso: (data || []).filter(r => r.estado === 'en_proceso').length,
    completado: (data || []).filter(r => r.estado === 'completado').length,
    cancelado:  (data || []).filter(r => r.estado === 'cancelado').length,
  }

  const stateChips = [
    { key: 'programado', dot: 'bg-secondary', label: 'Programado' },
    { key: 'en_proceso', dot: 'bg-primary',   label: 'En proceso' },
    { key: 'completado', dot: 'bg-success',   label: 'Completado' },
    { key: 'cancelado',  dot: 'bg-error',     label: 'Cancelado'  },
  ].filter(c => stats[c.key] > 0)

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

          <div className="flex items-center gap-2 h-[38px] px-4
            bg-surface border border-border rounded-control"
          >
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="opacity-0 absolute pointer-events-none"
              id="date-picker-hidden"
            />
            <label
              htmlFor="date-picker-hidden"
              className="font-mono text-[13px] font-semibold text-ink cursor-pointer
                whitespace-nowrap select-none"
            >
              {fmtFechaCorta(fecha)}
            </label>
          </div>

          <button onClick={nextDay}
            className="w-[38px] h-[38px] flex items-center justify-center
              bg-surface border border-border rounded-control
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button onClick={() => setFecha(toISO(new Date()))}
              className="h-[38px] px-3 font-mono text-[12px] text-primary
                border border-primary/30 bg-primary/8 hover:bg-primary/15
                rounded-control transition-colors"
            >
              Hoy
            </button>
          )}
        </div>

        {/* Chips de estado */}
        {stateChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {stateChips.map(c => (
              <span key={c.key}
                className="inline-flex items-center gap-1.5 h-[38px] px-3
                  bg-surface border border-border rounded-control
                  font-mono text-[11.5px] text-muted"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {c.label} {stats[c.key]}
              </span>
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Botón primario */}
        {canDo('programacion', 'crear') && (
          <button onClick={() => setShowModal(true)}
            className="h-[38px] flex items-center gap-2 px-4
              bg-primary hover:bg-primary-hover text-white
              text-[13px] font-semibold rounded-control shadow-btn transition-colors"
          >
            <Plus size={15} />
            Programar actividad
          </button>
        )}
      </div>

      {/* ── Cards de actividad ── */}
      {loading ? (
        <Spinner text="Cargando actividades..." />
      ) : error ? (
        <EmptyState title="Error" description={error} />
      ) : (data || []).length === 0 ? (
        <EmptyState
          title="Sin actividades programadas"
          description={`No hay actividades para el ${fmtFechaCorta(fecha)}.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(item => (
            <ActivityCard
              key={item.id_programacion}
              item={item}
              onClick={() => setSelectedItem(item)}
              onIniciar={handleIniciar}
              onCompletar={handleCompletar}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modales ── */}
      {showModal && (
        <TurnoModal
          fecha={fecha}
          usuarios={usuarios || []}
          maquinas={maquinas || []}
          proyectos={proyectos || []}
          onClose={() => setShowModal(false)}
          onSaved={refresh}
        />
      )}

      {selectedItem && (
        <TaskDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onIniciar={handleIniciar}
          onCompletar={handleCompletar}
          onDelete={handleDelete}
          onAvance={handleAvance}
        />
      )}
    </div>
  )
}
