import { useState, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import { getProyecto } from '../../api/proyectos.service'
import { createProgramacion, updateProgramacion, getOcupados } from '../../api/programacion.service'
import toast from 'react-hot-toast'

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`
const labelCls = 'block text-[11.5px] font-medium text-muted mb-1.5'
const isoDia   = v => String(v ?? '').slice(0, 10)
// Componentes locales, no toISOString(): esa convierte a UTC y en zonas
// horarias negativas adelanta un día durante la tarde/noche.
const hoyISO   = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Modal de creación / edición de una actividad de planta (turno). Compartido
// entre la página de Programación y el botón "Programar turno" del Dashboard.
// Si se pasa `turno`, edita ese registro en vez de crear uno nuevo — solo
// permitido mientras esté en estado "programado" (lo valida también el backend).
export default function TurnoModal({ fecha, turno, usuarios, maquinas, proyectos, onClose, onSaved }) {
  const [form, setForm] = useState(turno ? {
    fecha:             isoDia(turno.fecha),
    id_operario:       turno.id_operario ?? '',
    id_maquina:        turno.id_maquina ?? '',
    id_proyecto:       turno.id_proyecto ?? '',
    id_fase_proyecto:  turno.id_fase_proyecto ?? '',
    tiempo_estimado:   turno.tiempo_estimado ?? 480,
    observaciones:     turno.observaciones ?? '',
  } : {
    fecha,
    id_operario: '', id_maquina: '', id_proyecto: '', id_fase_proyecto: '',
    tiempo_estimado: 480, observaciones: '',
  })
  const [fases,        setFases]        = useState([])
  const [loadingFases, setLoadingFases] = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [ocupados,     setOcupados]     = useState({ operarios: [], maquinas: [] })

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  // Igual que al crear: no se exige "no puede ser pasada" si la fecha original
  // del turno que se edita ya estaba en el pasado (no bloquea el datepicker).
  const fechaOriginal = turno ? isoDia(turno.fecha) : null
  const minFecha = (!fechaOriginal || fechaOriginal >= hoyISO()) ? hoyISO() : undefined

  // Operarios/máquinas no disponibles ese día: con una actividad en curso ahora
  // mismo, o ya con un turno programado/en proceso para la fecha elegida.
  useEffect(() => {
    if (!form.fecha) { setOcupados({ operarios: [], maquinas: [] }); return }
    getOcupados(form.fecha)
      .then(({ data }) => setOcupados(data))
      .catch(() => {})
  }, [form.fecha])

  useEffect(() => {
    if (!form.id_proyecto) { setFases([]); setForm(f => ({ ...f, id_fase_proyecto: '' })); return }
    setLoadingFases(true)
    getProyecto(form.id_proyecto)
      .then(({ data }) => {
        const nuevasFases = data.fases || []
        setFases(nuevasFases)
        setForm(f => {
          const sigueValida = nuevasFases.some(fa => String(fa.id_fase_proyecto) === String(f.id_fase_proyecto))
          return { ...f, id_fase_proyecto: sigueValida ? f.id_fase_proyecto : '' }
        })
      })
      .catch(() => setFases([]))
      .finally(() => setLoadingFases(false))
  }, [form.id_proyecto])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.id_operario) { toast.error('Selecciona un operario'); return }
    if (form.id_proyecto && !form.id_fase_proyecto) {
      toast.error('Selecciona la fase específica del proyecto'); return
    }
    if (maquinaRequerida && !form.id_maquina) {
      toast.error('Esta fase requiere seleccionar un equipo'); return
    }
    setSaving(true)
    try {
      turno ? await updateProgramacion(turno.id_programacion, form) : await createProgramacion(form)
      toast.success(turno ? 'Actividad actualizada' : 'Actividad programada')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(false) }
  }

  // El propio turno que se está editando no debe excluirse a sí mismo de las
  // opciones (aparece en `ocupados` porque ya tiene reservado ese operario/máquina).
  const esOcupadoOperario = (id) => ocupados.operarios.includes(id) && id !== (turno?.id_operario ?? null)
  const esOcupadaMaquina  = (id) => ocupados.maquinas.includes(id)  && id !== (turno?.id_maquina  ?? null)

  const operarios = usuarios.filter(u => u.estado === 1 && u.rol === 'Operario' && !esOcupadoOperario(u.id_usuario))

  // Solo las fases que realmente se programan por turno (Diseño, Compra y
  // Pintura y acabados son de control manual: no aparecen aquí). Cuando el
  // proyecto tiene 2+ productos, fases_proyecto trae una fila por ítem (mismo
  // fase_nombre repetido) — se separan las de nivel de proyecto (sin ítem) de
  // las que sí pertenecen a un producto, y estas últimas se agrupan por ítem
  // para el <optgroup>.
  const fasesProgramables = fases.filter(f => f.requiere_turno)
  const fasesGenerales = fasesProgramables.filter(f => !f.item_producto)
  const fasesPorItem   = Object.entries(
    fasesProgramables.filter(f => f.item_producto).reduce((acc, f) => {
      (acc[f.item_producto] ||= []).push(f)
      return acc
    }, {})
  )
  const faseSeleccionada = fasesProgramables.find(f => String(f.id_fase_proyecto) === String(form.id_fase_proyecto))

  // La fase elegida determina si hace falta equipo y de qué categoría —
  // sin fase (turno "suelto", sin proyecto) se sigue exigiendo como siempre.
  const maquinaRequerida = !faseSeleccionada || faseSeleccionada.categoria_equipo !== null
  const maqActivas = maquinas.filter(m => ['activa', 'sin_asignar'].includes(m.estado) && !esOcupadaMaquina(m.id_maquina)
    && (!faseSeleccionada?.categoria_equipo || m.categoria === faseSeleccionada.categoria_equipo))

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
              <h3 className="text-[16px] font-semibold text-ink">
                {turno ? 'Editar actividad' : 'Nueva actividad'}
              </h3>
              <p className="text-[12px] text-muted">
                {turno ? 'Modificar un turno de trabajo' : 'Programar un turno de trabajo'}
              </p>
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
              min={minFecha} className={inputCls} />
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
              <label className={labelCls}>Fase del proyecto *</label>
              <select name="id_fase_proyecto" value={form.id_fase_proyecto}
                onChange={set} disabled={loadingFases} required className={inputCls}
              >
                <option value="">{loadingFases ? 'Cargando fases…' : 'Seleccionar fase'}</option>
                {/* Solo las fases que se programan por turno (Diseño, Compra y Pintura y
                    acabados son de control manual y no aparecen aquí — ver requiere_turno).
                    Cuando el proyecto tiene 2+ productos, cada uno repite el mismo set de
                    fases — se agrupan por ítem (optgroup) para que quede inequívoco a cuál
                    producto pertenece cada una, en vez de una lista plana con nombres repetidos. */}
                {fasesGenerales.map(f => {
                  const completada = f.estado === 'completada'
                  return (
                    <option key={f.id_fase_proyecto} value={f.id_fase_proyecto} disabled={completada}>
                      {f.fase_nombre}{completada ? ' (completada)' : ` (${f.estado})`}
                    </option>
                  )
                })}
                {fasesPorItem.map(([item, itemFases]) => (
                  <optgroup key={item} label={`Ítem: ${item}`}>
                    {itemFases.map(f => {
                      const completada = f.estado === 'completada'
                      return (
                        <option key={f.id_fase_proyecto} value={f.id_fase_proyecto} disabled={completada}>
                          {f.fase_nombre}{completada ? ' (completada)' : ` (${f.estado})`}
                        </option>
                      )
                    })}
                  </optgroup>
                ))}
              </select>
              {faseSeleccionada?.item_producto && (
                <p className="text-[11.5px] font-semibold text-primary mt-1.5">
                  Esta actividad quedará asociada al ítem "{faseSeleccionada.item_producto}".
                </p>
              )}
              <p className="text-[11.5px] font-semibold text-muted mt-1">
                El avance de la fase se recalcula automáticamente a partir de sus turnos.
                Las fases ya completadas no admiten nuevas actividades.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>Operario *</label>
            <select name="id_operario" value={form.id_operario} onChange={set}
              required className={inputCls}
            >
              <option value="">Seleccionar operario</option>
              {operarios.map(u => (
                <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Máquina / Equipo{maquinaRequerida ? ' *' : ''}</label>
            <select name="id_maquina" value={form.id_maquina} onChange={set}
              required={maquinaRequerida} className={inputCls}
            >
              <option value="">{maquinaRequerida ? 'Seleccionar equipo' : 'Sin equipo específico'}</option>
              {maqActivas.map(m => (
                <option key={m.id_maquina} value={m.id_maquina}>
                  {m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-faint mt-1">
              {faseSeleccionada
                ? maquinaRequerida
                  ? 'Solo se muestra el equipo del tipo que usa esta fase, disponible ese día.'
                  : 'Esta fase no requiere un equipo específico.'
                : 'Solo se muestran los operarios y equipos disponibles ese día.'}
            </p>
          </div>

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
            {saving ? 'Guardando…' : turno ? 'Guardar cambios' : 'Programar actividad'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
