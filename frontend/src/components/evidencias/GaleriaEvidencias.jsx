import { useState } from 'react'
import { Camera, Images } from 'lucide-react'
import toast from 'react-hot-toast'
import { useFetch } from '../../hooks/useFetch'
import { getEvidencias, deleteEvidencia } from '../../api/evidencias.service'
import { canDo, getUser } from '../../utils/auth'
import FotoEvidencia from './FotoEvidencia'
import VisorFoto from './VisorFoto'
import SubirFotoModal from './SubirFotoModal'

const fmtDia = d => new Date(d).toLocaleDateString('es-CO', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})
const claveDia = d => {
  const f = new Date(d)
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`
}

/**
 * Evidencia fotográfica (RF-25/RF-26): galería ordenada por fecha con autor, y botón para adjuntar.
 * @param {number}  idProyecto
 * @param {number}  [idProgramacion] solo las fotos de esta actividad (detalle de turno)
 * @param {Array}   [fases]          fases elegibles al subir desde el proyecto
 * @param {boolean} puedeSubir       el backend vuelve a validar el permiso
 * @param {boolean} [compacto]       versión reducida para el modal de actividad
 */
export default function GaleriaEvidencias({ idProyecto, idProgramacion, fases, puedeSubir, compacto = false }) {
  const { data, loading, error, refresh } = useFetch(
    () => getEvidencias(idProyecto, idProgramacion ? { programacion: idProgramacion } : {}),
    [idProyecto, idProgramacion])
  const [subiendo, setSubiendo] = useState(false)
  const [abierta,  setAbierta]  = useState(null) // { evidencia, url }
  const user = getUser()

  const fotos = data || []
  const puedeEliminar = (f) => f.id_autor === user?.id_usuario || canDo('proyectos', 'eliminar')

  const eliminar = async (f) => {
    try {
      await deleteEvidencia(f.id_evidencia)
      toast.success('Foto eliminada')
      refresh()
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo eliminar la foto')
      return false
    }
  }

  // Agrupadas por día (ya vienen de la más reciente a la más antigua)
  const dias = []
  for (const f of fotos) {
    const clave = claveDia(f.fecha)
    let dia = dias.find(d => d.clave === clave)
    if (!dia) { dia = { clave, fecha: f.fecha, fotos: [] }; dias.push(dia) }
    dia.fotos.push(f)
  }

  const botonSubir = puedeSubir && (
    <button type="button" onClick={() => setSubiendo(true)}
      className="flex items-center gap-1.5 h-[30px] px-3 bg-primary hover:bg-primary-hover text-white
        rounded-control text-[11.5px] font-semibold shadow-btn transition-colors shrink-0"
    >
      <Camera size={13} /> Adjuntar foto
    </button>
  )

  const contenido = loading ? (
    <p className="font-mono text-[11px] text-faint">Cargando fotos…</p>
  ) : error ? (
    <p className="font-mono text-[11px] text-error">No se pudieron cargar las fotos</p>
  ) : fotos.length === 0 ? (
    <div className={`flex flex-col items-center gap-2 text-faint ${compacto ? 'py-3' : 'py-10'}`}>
      <Images size={compacto ? 20 : 32} strokeWidth={1.3} />
      <p className="text-[12.5px]">
        {idProgramacion ? 'Esta actividad aún no tiene fotos.' : 'Este proyecto aún no tiene fotos.'}
      </p>
    </div>
  ) : compacto ? (
    <div className="grid grid-cols-4 gap-2">
      {fotos.map(f => (
        <FotoEvidencia key={f.id_evidencia} evidencia={f} className="aspect-square"
          onAbrir={(evidencia, url) => setAbierta({ evidencia, url })} />
      ))}
    </div>
  ) : (
    <div className="space-y-5">
      {dias.map(dia => (
        <div key={dia.clave}>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-faint mb-2 first-letter:uppercase">
            {fmtDia(dia.fecha)} · {dia.fotos.length} foto{dia.fotos.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {dia.fotos.map(f => (
              <figure key={f.id_evidencia} className="min-w-0">
                <FotoEvidencia evidencia={f} className="w-full aspect-[4/3]"
                  onAbrir={(evidencia, url) => setAbierta({ evidencia, url })} />
                <figcaption className="mt-1.5 min-w-0">
                  <p className="text-[12px] text-ink truncate" title={f.descripcion || ''}>
                    {f.descripcion || f.fase_nombre || 'Proyecto'}
                  </p>
                  <p className="font-mono text-[10px] text-faint truncate">
                    {f.autor || 'Usuario eliminado'} ·{' '}
                    {new Date(f.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      {compacto ? (
        <div className="bg-surface2 rounded-[11px] p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[.08em] text-faint">
              Fotos de la actividad {fotos.length > 0 && `(${fotos.length})`}
            </p>
            {botonSubir}
          </div>
          {contenido}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface2 flex items-center justify-between gap-3">
            <h2 className="text-[14px] font-semibold text-ink flex items-center gap-2">
              <Images size={15} className="text-faint" />
              Evidencia fotográfica {fotos.length > 0 && <span className="font-mono text-[11px] text-faint">({fotos.length})</span>}
            </h2>
            {botonSubir}
          </div>
          <div className="p-5">{contenido}</div>
        </div>
      )}

      {subiendo && (
        <SubirFotoModal idProyecto={idProyecto} idProgramacion={idProgramacion} fases={fases}
          onClose={() => setSubiendo(false)} onSubida={refresh} />
      )}
      {abierta && (
        <VisorFoto evidencia={abierta.evidencia} url={abierta.url}
          puedeEliminar={puedeEliminar(abierta.evidencia)} onEliminar={eliminar}
          onClose={() => setAbierta(null)} />
      )}
    </>
  )
}
