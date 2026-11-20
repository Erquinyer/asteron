import { useEffect, useState } from 'react'
import { X, Trash2, User, Calendar, Layers } from 'lucide-react'

const fmtFechaHora = d => new Date(d).toLocaleString('es-CO', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

// Foto ampliada con sus datos (autor, fecha, fase). Se cierra con Esc o con la X.
export default function VisorFoto({ evidencia, url, puedeEliminar, onEliminar, onClose }) {
  const [confirmando, setConfirmando] = useState(false)
  const [eliminando,  setEliminando]  = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleEliminar = async () => {
    setEliminando(true)
    const ok = await onEliminar(evidencia)
    setEliminando(false)
    if (ok) onClose()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Foto de evidencia"
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 backdrop-blur-sm p-4 animate-ov-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center">
        <div onClick={e => e.stopPropagation()}
          className="bg-surface border border-border rounded-[18px] shadow-modal
            w-full max-w-3xl my-4 overflow-hidden animate-md-in"
        >
          <div className="relative bg-black flex items-center justify-center">
            <img src={url} alt={evidencia.descripcion || 'Foto de evidencia'}
              className="max-h-[70vh] w-auto object-contain" />
            <button onClick={onClose} aria-label="Cerrar"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center
                rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {evidencia.descripcion && (
              <p className="text-[14px] text-ink">{evidencia.descripcion}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <User size={13} className="text-faint" /> {evidencia.autor || 'Usuario eliminado'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-faint" /> {fmtFechaHora(evidencia.fecha)}
              </span>
              {evidencia.fase_nombre && (
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-faint" />
                  {evidencia.fase_nombre}
                  {evidencia.item_producto && ` · ${evidencia.item_producto}`}
                  {evidencia.id_programacion && ' · actividad de planta'}
                </span>
              )}
            </div>

            {puedeEliminar && (
              <div className="pt-2 border-t border-border flex justify-end gap-2">
                {confirmando ? (
                  <>
                    <span className="self-center text-[12.5px] text-muted mr-auto">¿Eliminar esta foto?</span>
                    <button onClick={() => setConfirmando(false)} disabled={eliminando}
                      className="h-9 px-3 border border-border rounded-control text-[12.5px]
                        text-muted hover:bg-hover transition-colors"
                    >
                      No
                    </button>
                    <button onClick={handleEliminar} disabled={eliminando}
                      className="h-9 px-3 bg-error hover:bg-error/90 disabled:opacity-50 text-white
                        rounded-control text-[12.5px] font-semibold transition-colors"
                    >
                      {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmando(true)}
                    className="h-9 px-3 flex items-center gap-1.5 border border-border rounded-control
                      text-[12.5px] text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 size={14} /> Eliminar foto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
