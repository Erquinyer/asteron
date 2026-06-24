import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, User, Flag, CheckCircle2, Clock3, Circle, Save } from 'lucide-react'
import { useFetch }    from '../hooks/useFetch'
import { getProyecto, updateFase } from '../api/proyectos.service'
import Spinner    from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import toast      from 'react-hot-toast'

const prioridadBadge = {
  alta:  { style: 'bg-red-100 text-red-600',      label: 'Alta'  },
  media: { style: 'bg-yellow-100 text-yellow-700', label: 'Media' },
  baja:  { style: 'bg-slate-100 text-slate-600',   label: 'Baja'  },
}

const faseCfg = {
  completada: { icon: <CheckCircle2 size={18} className="text-green-500"/>, bar: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50'  },
  en_curso:   { icon: <Clock3      size={18} className="text-blue-500"/>,   bar: 'bg-blue-500',  text: 'text-blue-700',  bg: 'bg-blue-50'   },
  pendiente:  { icon: <Circle      size={18} className="text-slate-300"/>,  bar: 'bg-slate-200', text: 'text-slate-400', bg: 'bg-slate-50'  },
}

const ESTADOS_FASE = ['pendiente','en_curso','completada']
const estadoLabel  = { pendiente: 'Pendiente', en_curso: 'En curso', completada: 'Completada' }

const fmtFecha = d => d
  ? new Date(d).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })
  : '—'

export default function ProyectoDetalle() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { data: proyecto, loading, error, refresh } = useFetch(() => getProyecto(id), [id])

  // ediciones locales: { [id_fase_proyecto]: { estado, porcentaje_avance } }
  const [edits,   setEdits]   = useState({})
  const [saving,  setSaving]  = useState(null)

  if (loading) return <Spinner text="Cargando proyecto..."/>
  if (error)   return <EmptyState title="Error" description={error}/>
  if (!proyecto) return null

  const fases  = proyecto.fases || []
  const avance = proyecto.avance || 0
  const pBadge = prioridadBadge[proyecto.prioridad] || prioridadBadge.media

  const estadoGlobal = fases.length === 0 ? 'pendiente'
    : fases.every(f => f.estado === 'completada') ? 'completada'
    : fases.some(f => f.estado === 'en_curso')    ? 'en_curso'
    : 'pendiente'

  const estadoGlobalStyle = {
    completada: 'bg-green-100 text-green-700',
    en_curso:   'bg-blue-100 text-blue-700',
    pendiente:  'bg-amber-100 text-amber-700',
  }

  const getEdit = (fase) => edits[fase.id_fase_proyecto] ?? {
    estado:             fase.estado,
    porcentaje_avance:  fase.porcentaje_avance,
  }

  const setEdit = (faseId, field, value) =>
    setEdits(prev => ({
      ...prev,
      [faseId]: { ...( prev[faseId] ?? {} ), [field]: value },
    }))

  const handleSaveFase = async (fase) => {
    const edit = getEdit(fase)
    setSaving(fase.id_fase_proyecto)
    try {
      await updateFase(proyecto.id_proyecto, fase.id_fase_proyecto, edit)
      toast.success(`Fase "${fase.fase_nombre}" actualizada`)
      setEdits(prev => { const n = { ...prev }; delete n[fase.id_fase_proyecto]; return n })
      refresh()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally { setSaving(null) }
  }

  const isDirty = (fase) => {
    const e = edits[fase.id_fase_proyecto]
    return e && (e.estado !== fase.estado || Number(e.porcentaje_avance) !== fase.porcentaje_avance)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Encabezado */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/proyectos')}
          className="mt-1 p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-500 shrink-0">
          <ArrowLeft size={16}/>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-slate-800 leading-tight">{proyecto.nombre}</h1>
          {proyecto.objetivo && <p className="text-sm text-slate-500 mt-1">{proyecto.objetivo}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${pBadge.style}`}>{pBadge.label}</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${estadoGlobalStyle[estadoGlobal]}`}>
            {estadoLabel[estadoGlobal]}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <User    size={15}/>, label: 'Responsable',   value: proyecto.responsable          || '—' },
          { icon: <Flag    size={15}/>, label: 'Cliente',        value: proyecto.cliente              || 'Sin pedido' },
          { icon: <Calendar size={15}/>, label: 'Inicio',       value: fmtFecha(proyecto.fecha_inicio) },
          { icon: <Calendar size={15}/>, label: 'Entrega est.', value: fmtFecha(proyecto.fecha_fin_estimada) },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">{item.icon}<span className="text-xs">{item.label}</span></div>
            <p className="text-sm font-medium text-slate-800 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Barra avance general */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Avance general del proyecto</h2>
          <span className="text-2xl font-bold text-slate-800">{avance}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all duration-700 ${
            avance === 100 ? 'bg-green-500' : avance > 50 ? 'bg-blue-500' : 'bg-amber-400'
          }`} style={{ width: `${avance}%` }}/>
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1.5">
          <span>{fases.filter(f => f.estado === 'completada').length} de {fases.length} fases completadas</span>
          <span>{fases.filter(f => f.estado === 'en_curso').length} en curso</span>
        </div>
      </div>

      {/* Fases editables */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Fases del proyecto</h2>
          <p className="text-xs text-slate-400">Edita el estado y el % directamente en cada fila</p>
        </div>

        {fases.length === 0
          ? <div className="p-8 text-center text-slate-400 text-sm">No hay fases registradas.</div>
          : (
            <div className="divide-y divide-slate-100">
              {fases.map((fase, idx) => {
                const edit    = getEdit(fase)
                const cfg     = faseCfg[edit.estado] || faseCfg.pendiente
                const dirty   = isDirty(fase)
                const isSaving = saving === fase.id_fase_proyecto

                return (
                  <div key={fase.id_fase_proyecto} className={`px-6 py-4 ${cfg.bg}`}>
                    <div className="flex items-center gap-3">
                      {/* Número + icono */}
                      <span className="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{idx+1}</span>
                      {cfg.icon}

                      {/* Nombre */}
                      <p className={`flex-1 text-sm font-medium min-w-0 truncate ${
                        edit.estado === 'pendiente' ? 'text-slate-500' : 'text-slate-800'
                      }`}>{fase.fase_nombre}</p>

                      {/* Selector estado */}
                      <select value={edit.estado}
                        onChange={e => setEdit(fase.id_fase_proyecto, 'estado', e.target.value)}
                        className={`text-xs font-medium rounded-md px-2 py-1 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                          edit.estado === 'completada' ? 'bg-green-100 text-green-700' :
                          edit.estado === 'en_curso'   ? 'bg-blue-100 text-blue-700'   :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {ESTADOS_FASE.map(s => <option key={s} value={s}>{estadoLabel[s]}</option>)}
                      </select>

                      {/* Barra + % editable */}
                      <div className="hidden sm:flex items-center gap-2 w-36 shrink-0">
                        <div className="flex-1 bg-white rounded-full h-1.5">
                          <div className={`${cfg.bar} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${edit.porcentaje_avance}%` }}/>
                        </div>
                        <input type="number" min={0} max={100}
                          value={edit.porcentaje_avance}
                          onChange={e => setEdit(fase.id_fase_proyecto, 'porcentaje_avance', Number(e.target.value))}
                          className={`w-12 text-xs text-right rounded px-1 py-0.5 border focus:outline-none focus:ring-1 focus:ring-blue-500 ${cfg.text} bg-white border-slate-200`}/>
                        <span className="text-xs text-slate-400">%</span>
                      </div>

                      {/* Guardar */}
                      {dirty && (
                        <button onClick={() => handleSaveFase(fase)} disabled={isSaving}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md text-xs font-medium shrink-0">
                          <Save size={12}/>
                          {isSaving ? '…' : 'Guardar'}
                        </button>
                      )}
                    </div>

                    {/* Fechas */}
                    {(fase.fecha_inicio || fase.fecha_fin) && (
                      <p className="text-xs text-slate-400 mt-1.5 ml-[52px]">
                        {fmtFecha(fase.fecha_inicio)} → {fmtFecha(fase.fecha_fin)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}
