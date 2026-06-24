import { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Trash2, X, Play, CheckCircle } from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getProgramacion, createProgramacion, updateEstadoTurno, deleteProgramacion } from '../api/programacion.service'
import { getUsuarios }       from '../api/usuarios.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import { getProyectos, getProyecto } from '../api/proyectos.service'
import { canDo }             from '../utils/auth'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const estadoConfig = {
  en_proceso: { label: 'En proceso', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   dot: 'bg-blue-500'  },
  programado: { label: 'Programado', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-400' },
  completado: { label: 'Completado', style: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', dot: 'bg-green-500' },
  cancelado:  { label: 'Cancelado',  style: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',       dot: 'bg-red-400'   },
}

const toISO = d => d.toISOString().split('T')[0]

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

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
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function useTimer(startISO, active) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active || !startISO) { setElapsed(0); return }
    const start = new Date(startISO).getTime()
    const tick = () => setElapsed(Date.now() - start)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startISO, active])
  return elapsed
}

function ConfirmModal({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-green-600 dark:text-green-400"/>
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-white text-center mb-2">
          ¿Confirmar finalización?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Esta actividad se marcará como <strong>completada</strong>.
        </p>
        {item.fase_nombre && (
          <p className="text-sm text-blue-600 dark:text-blue-400 text-center mt-2 font-medium">
            La fase "{item.fase_nombre}" también quedará como completada.
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel}
            className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold">
            Sí, completar
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskDetailModal({ item, onClose, onIniciar, onCompletar, onDelete }) {
  const [showConfirm,   setShowConfirm]   = useState(false)
  const [loadingAction, setLoadingAction] = useState(false)
  const cfg = estadoConfig[item.estado] || estadoConfig.programado
  const isEnProceso = item.estado === 'en_proceso'
  const elapsed = useTimer(item.updated_at, isEnProceso)

  const handleIniciar = async () => {
    setLoadingAction(true)
    await onIniciar(item)
    setLoadingAction(false)
    onClose()
  }

  const handleConfirmCompletar = async () => {
    const tiempoReal = isEnProceso ? Math.round(elapsed / 60000) : null
    setLoadingAction(true)
    await onCompletar(item, tiempoReal)
    setLoadingAction(false)
    setShowConfirm(false)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${cfg.dot}`}/>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">Detalle de actividad</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${cfg.style}`}>{cfg.label}</span>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-1">
                <X size={18}/>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Proyecto & Fase — primary info */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Proyecto</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {item.proyecto || 'Sin proyecto asignado'}
              </p>
              {item.fase_nombre && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                  Fase: {item.fase_nombre}
                </p>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Operario</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold">{item.operario}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Máquina / Equipo</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                  {item.maquina_codigo ? `[${item.maquina_codigo}] ` : ''}{item.maquina}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Tiempo estimado</p>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{fmtTime(item.tiempo_estimado)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Tiempo real</p>
                {item.tiempo_real ? (
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">{fmtTime(item.tiempo_real)}</p>
                ) : isEnProceso ? (
                  <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{fmtElapsed(elapsed)}</p>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500">—</p>
                )}
              </div>
            </div>

            {item.observaciones && (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">Tarea / Observaciones</p>
                <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3">
                  "{item.observaciones}"
                </p>
              </div>
            )}

            {item.estado === 'completado' && (
              <div className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0"/>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Actividad completada.
                  {item.fase_nombre && ` La fase "${item.fase_nombre}" fue marcada como completada.`}
                </p>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 pb-6">
            {item.estado !== 'completado' && item.estado !== 'cancelado' ? (
              <div className="flex gap-3">
                {canDo('programacion', 'eliminar') && (
                  <button onClick={() => { onDelete(item); onClose() }}
                    className="p-2.5 border border-red-200 dark:border-red-800 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                    <Trash2 size={16}/>
                  </button>
                )}
                {item.estado === 'programado' && (
                  <button onClick={handleIniciar} disabled={loadingAction}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold">
                    <Play size={14}/>
                    {loadingAction ? 'Iniciando…' : 'Iniciar actividad'}
                  </button>
                )}
                <button onClick={() => setShowConfirm(true)} disabled={loadingAction}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold">
                  <CheckCircle size={14}/>
                  Marcar completada
                </button>
              </div>
            ) : (
              <button onClick={onClose}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
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

function TurnoModal({ fecha, usuarios, maquinas, proyectos, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha, id_operario: '', id_maquina: '', id_proyecto: '', id_fase_proyecto: '',
    tiempo_estimado: 480, observaciones: '',
  })
  const [fases,       setFases]       = useState([])
  const [loadingFases, setLoadingFases] = useState(false)
  const [saving,      setSaving]      = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => {
    if (!form.id_proyecto) {
      setFases([])
      setForm(f => ({ ...f, id_fase_proyecto: '' }))
      return
    }
    setLoadingFases(true)
    getProyecto(form.id_proyecto)
      .then(({ data }) => {
        setFases(data.fases || [])
        setForm(f => ({ ...f, id_fase_proyecto: '' }))
      })
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Nueva actividad</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            <X size={18}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" name="fecha" value={form.fecha} onChange={set} className={inputCls}/>
          </div>

          <div>
            <label className={labelCls}>Operario *</label>
            <select name="id_operario" value={form.id_operario} onChange={set} required className={inputCls}>
              <option value="">Seleccionar operario</option>
              {operarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre} — {u.rol}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Máquina / Equipo *</label>
            <select name="id_maquina" value={form.id_maquina} onChange={set} required className={inputCls}>
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
            <select name="id_proyecto" value={form.id_proyecto} onChange={set} className={inputCls}>
              <option value="">Sin proyecto</option>
              {proyectos.map(p => (
                <option key={p.id_proyecto} value={p.id_proyecto}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {form.id_proyecto && (
            <div>
              <label className={labelCls}>Fase del proyecto</label>
              <select name="id_fase_proyecto" value={form.id_fase_proyecto} onChange={set}
                disabled={loadingFases} className={inputCls}>
                <option value="">{loadingFases ? 'Cargando fases…' : 'Sin fase específica'}</option>
                {fases.map(f => (
                  <option key={f.id_fase_proyecto} value={f.id_fase_proyecto}>
                    {f.fase_nombre} ({f.estado})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Al completar esta actividad, la fase seleccionada también se marcará como completada.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>Tiempo estimado</label>
            <div className="flex items-center gap-2">
              <input type="number" name="tiempo_estimado" value={form.tiempo_estimado}
                onChange={set} min={30} step={30} className={inputCls}/>
              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">
                = {(form.tiempo_estimado / 60).toFixed(1)}h
              </span>
            </div>
          </div>

          <div>
            <label className={labelCls}>Tarea / Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={set} rows={3}
              placeholder="Describe la tarea específica, instrucciones, etc."
              className={`${inputCls} resize-none`}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold">
              {saving ? 'Guardando…' : 'Programar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Programacion() {
  const [fecha,        setFecha]       = useState(toISO(new Date()))
  const [showModal,    setShowModal]   = useState(false)
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
      toast.success(item.fase_nombre
        ? `Actividad completada y fase "${item.fase_nombre}" marcada como completada`
        : 'Actividad marcada como completada')
      refresh()
    } catch { toast.error('Error al completar') }
  }

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar la actividad de ${item.operario}?`)) return
    try {
      await deleteProgramacion(item.id_programacion)
      toast.success('Actividad eliminada')
      refresh()
    } catch { toast.error('Error al eliminar') }
  }

  const stats = {
    en_proceso: (data || []).filter(r => r.estado === 'en_proceso').length,
    programado: (data || []).filter(r => r.estado === 'programado').length,
    completado: (data || []).filter(r => r.estado === 'completado').length,
  }

  const fmtFechaLarga = () =>
    new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Programación de planta</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {(data || []).length} actividades · {stats.en_proceso} en proceso · {stats.programado} programadas · {stats.completado} completadas
          </p>
        </div>
        {canDo('programacion', 'crear') && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm">
            <Plus size={16}/> Nueva actividad
          </button>
        )}
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={prevDay}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
          <ChevronLeft size={16}/>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg">
          <Calendar size={15} className="text-slate-400"/>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            className="text-sm text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"/>
        </div>
        <button onClick={nextDay}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400">
          <ChevronRight size={16}/>
        </button>
        {!isToday && (
          <button onClick={() => setFecha(toISO(new Date()))}
            className="px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30">
            Hoy
          </button>
        )}
      </div>

      {/* Activity cards */}
      {loading ? <Spinner text="Cargando actividades..."/>
       : error   ? <EmptyState title="Error" description={error}/>
       : (data || []).length === 0 ? (
         <EmptyState
           title="Sin actividades programadas"
           description={`No hay actividades para el ${fmtFechaLarga()}.`}
         />
       ) : (
        <div className="space-y-3">
          {data.map(item => {
            const cfg = estadoConfig[item.estado] || estadoConfig.programado
            return (
              <div key={item.id_programacion}
                onClick={() => setSelectedItem(item)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-start gap-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer">

                <div className="mt-2 shrink-0">
                  <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`}/>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-slate-800 dark:text-white truncate leading-tight">
                    {item.proyecto || 'Sin proyecto asignado'}
                  </p>
                  {item.fase_nombre && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                      Fase: {item.fase_nombre}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.operario}</span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {item.maquina_codigo ? `[${item.maquina_codigo}] ` : ''}{item.maquina}
                    </span>
                  </div>
                  {item.observaciones && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 italic truncate max-w-sm">
                      {item.observaciones}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${cfg.style}`}>{cfg.label}</span>
                  <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Clock size={12}/>
                    <span className="text-xs">
                      {item.tiempo_real
                        ? fmtTime(item.tiempo_real)
                        : item.tiempo_estimado ? `${fmtTime(item.tiempo_estimado)} est.` : '—'}
                    </span>
                  </div>
                  {item.estado === 'programado' && (
                    <button
                      onClick={() => handleIniciar(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
                      <Play size={10}/> Iniciar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
       )}

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
        />
      )}
    </div>
  )
}
