import { useState, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import { getProyecto } from '../../api/proyectos.service'
import { createProgramacion, getOcupados } from '../../api/programacion.service'
import toast from 'react-hot-toast'

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'

// Modal de creación de una actividad de planta (turno). Compartido entre la
// página de Programación y el botón "Programar turno" del Dashboard.
export default function TurnoModal({ fecha, usuarios, maquinas, proyectos, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha,
    id_operario: '', id_maquina: '', id_proyecto: '', id_fase_proyecto: '',
    tiempo_estimado: 480, observaciones: '',
  })
  const [fases,        setFases]        = useState([])
  const [loadingFases, setLoadingFases] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [ocupados,     setOcupados]     = useState({ operarios: [], maquinas: [] })

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Operarios/máquinas con una actividad en_proceso ahora mismo: no se pueden
  // asignar a una actividad nueva hasta que esa termine o se cancele.
  useEffect(() => {
    getOcupados()
      .then(({ data }) => setOcupados(data))
      .catch(() => {})
  }, [])

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
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
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
              {operarios.map(u => {
                const ocupado = ocupados.operarios.includes(u.id_usuario)
                return (
                  <option key={u.id_usuario} value={u.id_usuario} disabled={ocupado}>
                    {u.nombre} — {u.rol}{ocupado ? ' (ocupado, en curso)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className={labelCls}>Máquina / Equipo *</label>
            <select name="id_maquina" value={form.id_maquina} onChange={set}
              required className={inputCls}
            >
              <option value="">Seleccionar equipo</option>
              {maqActivas.map(m => {
                const ocupada = ocupados.maquinas.includes(m.id_maquina)
                return (
                  <option key={m.id_maquina} value={m.id_maquina} disabled={ocupada}>
                    {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}{ocupada ? ' (en uso)' : ''}
                  </option>
                )
              })}
            </select>
            <p className="text-[11px] text-faint mt-1">
              Los operarios o equipos marcados no se pueden seleccionar: ya tienen una actividad en curso.
            </p>
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
                {fases.map(f => {
                  const completada = f.estado === 'completada'
                  return (
                    <option key={f.id_fase_proyecto} value={f.id_fase_proyecto} disabled={completada}>
                      {f.fase_nombre}{f.item_producto ? ` — ${f.item_producto}` : ''}
                      {completada ? ' (completada)' : ` (${f.estado})`}
                    </option>
                  )
                })}
              </select>
              <p className="text-[11.5px] font-semibold text-muted mt-1">
                El avance de la fase se recalcula automáticamente a partir de sus turnos.
                Las fases ya completadas no admiten nuevas actividades.
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
    </div>
  )
}
