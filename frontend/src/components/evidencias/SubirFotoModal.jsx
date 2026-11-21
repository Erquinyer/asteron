import { useEffect, useRef, useState } from 'react'
import { X, Camera, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { subirEvidencia } from '../../api/evidencias.service'
import SearchableSelect from '../ui/SearchableSelect'

// Mismas reglas que el backend (utils/evidencias.js): aquí solo para avisar antes de subir
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const TAMANO_MAXIMO_MB = 5

/**
 * Adjuntar una foto al proyecto.
 * @param {number}  idProyecto
 * @param {number}  [idProgramacion] actividad fija (desde Programación): no se elige fase
 * @param {Array}   [fases]          fases elegibles (desde el detalle del proyecto)
 */
export default function SubirFotoModal({ idProyecto, idProgramacion, fases = [], onClose, onSubida }) {
  const [archivo,     setArchivo]     = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [idFase,      setIdFase]      = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error,       setError]       = useState('')
  const [subiendo,    setSubiendo]    = useState(false)
  const inputRef = useRef(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const elegirArchivo = (file) => {
    setError('')
    if (!file) return
    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WEBP')
      return
    }
    if (file.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setError(`La foto supera el tamaño máximo permitido (${TAMANO_MAXIMO_MB} MB)`)
      return
    }
    setArchivo(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!archivo) { setError('Elige una foto'); return }
    setSubiendo(true)
    try {
      const { data } = await subirEvidencia({
        foto: archivo,
        id_proyecto: idProyecto,
        id_programacion: idProgramacion,
        id_fase_proyecto: idProgramacion ? null : idFase,
        descripcion: descripcion.trim(),
      })
      toast.success('Foto adjuntada')
      onSubida?.(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  const opcionesFase = fases.map(f => ({
    value: f.id_fase_proyecto,
    label: f.fase_nombre,
    sublabel: f.item_producto || undefined,
  }))

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-subir-foto"
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
        <form onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-[18px] shadow-modal
            w-full max-w-md my-4 overflow-hidden animate-md-in"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-border">
            <h3 id="titulo-subir-foto" className="text-[15px] font-semibold text-ink flex items-center gap-2">
              <Camera size={16} className="text-primary" /> Adjuntar foto
            </h3>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="w-8 h-8 flex items-center justify-center rounded-[8px]
                bg-surface2 text-faint hover:text-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Sin "capture": en el celular deja elegir entre la cámara y la galería */}
            <input ref={inputRef} type="file" accept={TIPOS_PERMITIDOS.join(',')} className="hidden"
              onChange={e => elegirArchivo(e.target.files?.[0])} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className="w-full aspect-video flex flex-col items-center justify-center gap-2
                border-2 border-dashed border-border-strong rounded-[12px] bg-surface2
                text-muted hover:border-primary hover:text-primary transition-colors overflow-hidden"
            >
              {preview ? (
                <img src={preview} alt="Vista previa de la foto elegida" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={22} />
                  <span className="text-[13px] font-medium">Tomar o elegir una foto</span>
                  <span className="font-mono text-[10.5px] text-faint">JPG, PNG o WEBP · máx. {TAMANO_MAXIMO_MB} MB</span>
                </>
              )}
            </button>
            {archivo && (
              <p className="font-mono text-[10.5px] text-faint truncate">
                {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                <button type="button" onClick={() => inputRef.current?.click()} className="text-primary hover:underline">
                  cambiar
                </button>
              </p>
            )}

            {!idProgramacion && opcionesFase.length > 0 && (
              <div>
                <label className="block font-mono text-[9.5px] font-semibold uppercase tracking-[.08em] text-faint mb-1.5">
                  Fase (opcional)
                </label>
                <SearchableSelect options={opcionesFase} value={idFase} onChange={setIdFase}
                  placeholder="Todo el proyecto" searchPlaceholder="Buscar fase o producto…"
                  recentCount={opcionesFase.length} clearable />
              </div>
            )}

            <div>
              <label htmlFor="descripcion-foto"
                className="block font-mono text-[9.5px] font-semibold uppercase tracking-[.08em] text-faint mb-1.5"
              >
                Descripción (opcional)
              </label>
              <input id="descripcion-foto" type="text" maxLength={255} value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
                placeholder="Ej. Soldadura terminada del exhibidor"
                className="w-full h-10 px-3 bg-surface border border-border rounded-control text-[13px]
                  text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-primary/25
                  focus:border-primary transition-colors" />
            </div>

            {error && <p role="alert" className="text-[12.5px] text-error">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-border bg-surface2 flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 border border-border rounded-control text-[13px] text-muted hover:bg-hover transition-colors"
            >
              Cancelar
            </button>
            <button type="submit" disabled={subiendo || !archivo}
              className="flex-1 h-10 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                disabled:opacity-50 text-white rounded-control text-[13px] font-semibold shadow-btn transition-colors"
            >
              <Upload size={14} /> {subiendo ? 'Subiendo…' : 'Subir foto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
