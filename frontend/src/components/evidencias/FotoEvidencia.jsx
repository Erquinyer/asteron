import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { getArchivoEvidencia } from '../../api/evidencias.service'

// Descarga la imagen con el token (vía axios) y la muestra con una URL temporal
// del navegador. La URL se libera al desmontar para no acumular memoria.
// El resultado se guarda junto con su id: si cambia la foto, mientras llega la
// nueva no se muestra la anterior (sin tener que reiniciar el estado en el efecto).
function useUrlFoto(idEvidencia) {
  const [estado, setEstado] = useState({ id: null, url: null, error: false })

  useEffect(() => {
    let objectUrl = null
    let cancelado = false
    getArchivoEvidencia(idEvidencia)
      .then(res => {
        if (cancelado) return
        objectUrl = URL.createObjectURL(res.data)
        setEstado({ id: idEvidencia, url: objectUrl, error: false })
      })
      .catch(() => !cancelado && setEstado({ id: idEvidencia, url: null, error: true }))
    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [idEvidencia])

  return estado.id === idEvidencia ? estado : { url: null, error: false }
}

export default function FotoEvidencia({ evidencia, className = '', onAbrir }) {
  const { url, error } = useUrlFoto(evidencia.id_evidencia)
  const alt = evidencia.descripcion || `Foto de ${evidencia.fase_nombre || 'el proyecto'}`

  return (
    <button
      type="button"
      onClick={() => url && onAbrir?.(evidencia, url)}
      disabled={!url}
      aria-label={`Ver foto: ${alt}`}
      className={`relative overflow-hidden rounded-control border border-border bg-surface2
        focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
    >
      {url ? (
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : error ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-faint">
          <ImageOff size={18} />
          <span className="font-mono text-[9.5px]">No disponible</span>
        </span>
      ) : (
        <span className="absolute inset-0 animate-pulse bg-surface2" />
      )}
    </button>
  )
}
