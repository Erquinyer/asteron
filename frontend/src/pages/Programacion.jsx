import { useState } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { useFetch }          from '../hooks/useFetch'
import { getProgramacion, createProgramacion, updateEstadoTurno, deleteProgramacion } from '../api/programacion.service'
import { getUsuarios }       from '../api/usuarios.service'
import { getMaquinaria }     from '../api/maquinaria.service'
import { getProyectos }      from '../api/proyectos.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const estadoConfig = {
  en_proceso: { label: 'En proceso', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   dot: 'bg-blue-500'   },
  programado: { label: 'Programado', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-400'  },
  completado: { label: 'Completado', style: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', dot: 'bg-green-500'  },
  cancelado:  { label: 'Cancelado',  style: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300',     dot: 'bg-red-400'    },
}

const toISO = d => d.toISOString().split('T')[0]

const inputCls = "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
const labelCls = "block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"

function TurnoModal({ fecha, usuarios, maquinas, proyectos, onClose, onSaved }) {
  const [form, setForm] = useState({
    fecha, id_operario: '', id_maquina: '', id_proyecto: '',
    tiempo_estimado: 480, observaciones: '',
  })
  const [saving, setSaving] = useState(false)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.id_operario || !form.id_maquina) {
      toast.error('Operario y máquina son requeridos'); return
    }
    setSaving(true)
    try {
      await createProgramacion(form)
      toast.success('Turno programado')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al programar')
    } finally { setSaving(false) }
  }

  const operarios = usuarios.filter(u => u.estado === 1)
  const maqActivas = maquinas.filter(m => ['activa','sin_asignar'].includes(m.estado))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Programar turno</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"><X size={18}/></button>
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

          <div>
            <label className={labelCls}>Tiempo estimado (minutos) — por defecto 8h</label>
            <input type="number" name="tiempo_estimado" value={form.tiempo_estimado}
              onChange={set} min={30} step={30} className={inputCls}/>
          </div>

          <div>
            <label className={labelCls}>Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={set} rows={2}
              placeholder="Tarea específica, instrucciones, etc."
              className={`${inputCls} resize-none`}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium">
              {saving ? 'Guardando…' : 'Programar turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Programacion() {
  const [fecha,    setFecha]    = useState(toISO(new Date()))
  const [showModal, setShowModal] = useState(false)

  const { data, loading, error, refresh } = useFetch(() => getProgramacion(fecha), [fecha])
  const { data: usuarios }  = useFetch(getUsuarios)
  const { data: maquinas }  = useFetch(getMaquinaria)
  const { data: proyectos } = useFetch(getProyectos)

  const prevDay = () => { const d = new Date(fecha); d.setDate(d.getDate()-1); setFecha(toISO(d)) }
  const nextDay = () => { const d = new Date(fecha); d.setDate(d.getDate()+1); setFecha(toISO(d)) }
  const isToday = fecha === toISO(new Date())

  const handleEstado = async (item, nuevoEstado) => {
    try {
      await updateEstadoTurno(item.id_programacion, { estado: nuevoEstado })
      toast.success('Estado actualizado')
      refresh()
    } catch { toast.error('Error al actualizar estado') }
  }

  const handleDelete = async (item) => {
    if (!confirm(`¿Eliminar el turno de ${item.operario}?`)) return
    try {
      await deleteProgramacion(item.id_programacion)
      toast.success('Turno eliminado')
      refresh()
    } catch { toast.error('Error al eliminar') }
  }

  const stats = {
    en_proceso: (data || []).filter(r => r.estado === 'en_proceso').length,
    programado: (data || []).filter(r => r.estado === 'programado').length,
    completado: (data || []).filter(r => r.estado === 'completado').length,
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">Programación de planta</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {(data || []).length} turnos · {stats.en_proceso} en proceso · {stats.programado} programados · {stats.completado} completados
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus size={16}/> Programar turno
        </button>
      </div>

      {/* Navegador de fecha */}
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

      {/* Lista */}
      {loading ? <Spinner text="Cargando programación..."/>
       : error   ? <EmptyState title="Error" description={error}/>
       : (data || []).length === 0 ? (
         <EmptyState
           title="Sin turnos programados"
           description={`No hay turnos para el ${new Date(fecha+'T12:00:00').toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'})}.`}
         />
       ) : (
        <div className="space-y-3">
          {data.map(item => {
            const cfg  = estadoConfig[item.estado] || estadoConfig.programado
            const hEst = (item.tiempo_estimado / 60).toFixed(1)
            const hReal = item.tiempo_real ? (item.tiempo_real / 60).toFixed(1) : null
            return (
              <div key={item.id_programacion}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                <div className="mt-1.5 shrink-0">
                  <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`}/>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-800 dark:text-white">{item.maquina}</p>
                    {item.maquina_codigo && (
                      <span className="text-xs font-mono text-slate-400 dark:text-slate-500">[{item.maquina_codigo}]</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.proyecto || 'Sin proyecto asignado'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Operario: <span className="text-slate-600 dark:text-slate-300 font-medium">{item.operario}</span>
                  </p>
                  {item.observaciones && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{item.observaciones}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <select
                    value={item.estado}
                    onChange={e => handleEstado(item, e.target.value)}
                    className={`text-xs font-medium rounded-md px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${cfg.style}`}>
                    {Object.entries(estadoConfig).map(([k,v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                      <Clock size={13}/>
                      <span className="text-xs">{hReal ? `${hReal}h real` : `${hEst}h est.`}</span>
                    </div>
                    <button onClick={() => handleDelete(item)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
       )
      }

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
    </div>
  )
}
