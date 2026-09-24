import { useState } from 'react'
import {
  Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react'
import {
  descargarPlantillaProgramacion, previsualizarProgramacion, importarProgramacion,
} from '../../api/programacion.service'
import toast from 'react-hot-toast'

const inputCls = `w-full h-10 border border-border rounded-control px-3 text-[13px]
  bg-surface2 text-ink placeholder:text-faint
  focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary
  transition-colors`

// Modal para cargar de una vez varios turnos de planta (ej. la semana
// completa) desde un archivo .xlsx/.csv. Al elegir el archivo se pide una
// vista previa (dry-run, no crea nada) que muestra fila por fila si quedaría
// bien o por qué fallaría; solo entonces se habilita confirmar la importación
// real, que reusa las mismas reglas de negocio que "Programar actividad".
export default function ImportarModal({ onClose, onImported }) {
  const [file,         setFile]         = useState(null)
  const [downloading,  setDownloading]  = useState(false)
  const [previewing,   setPreviewing]   = useState(false)
  const [preview,      setPreview]      = useState(null)   // { columnas, filas, total, validas }
  const [previewError, setPreviewError] = useState(null)   // error de estructura (columnas faltantes, archivo inválido)
  const [importing,    setImporting]    = useState(false)
  const [resultado,    setResultado]    = useState(null)   // resultado de la importación ya confirmada

  const handleDescargarPlantilla = async () => {
    setDownloading(true)
    try {
      const { data } = await descargarPlantillaProgramacion()
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'plantilla_programacion.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo descargar la plantilla')
    } finally { setDownloading(false) }
  }

  const handleFileChange = async (nuevoFile) => {
    setFile(nuevoFile)
    setResultado(null)
    setPreview(null)
    setPreviewError(null)
    if (!nuevoFile) return

    setPreviewing(true)
    try {
      const { data } = await previsualizarProgramacion(nuevoFile)
      setPreview(data)
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'No se pudo leer el archivo')
    } finally { setPreviewing(false) }
  }

  const handleImportar = async () => {
    if (!file) return
    setImporting(true)
    try {
      const { data } = await importarProgramacion(file)
      setResultado(data)
      if (data.creados > 0) {
        toast.success(`${data.creados} de ${data.total} actividades programadas`)
        onImported()
      } else {
        toast.error('No se creó ninguna actividad — revisa los errores')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al importar el archivo')
    } finally { setImporting(false) }
  }

  const hayVistaPrevia = !!preview && !resultado
  const modoAmplio = !!preview || !!resultado
  const puedeImportar = hayVistaPrevia && preview.validas > 0 && !importing

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto
      bg-black/50 backdrop-blur-sm p-4 animate-ov-in"
    >
      <div className="min-h-full flex items-center justify-center">
      <div className={`bg-surface border border-border rounded-[18px] shadow-modal
        w-full my-4 overflow-hidden animate-md-in transition-[max-width]
        ${modoAmplio ? 'max-w-6xl' : 'max-w-md'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
          border-b border-border bg-gradient-to-b from-primary/5 to-surface"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center">
              <Upload size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-ink">Importar programación</h3>
              <p className="text-[12px] text-muted">Carga varios turnos a la vez desde Excel/CSV</p>
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
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className={`grid gap-3 ${modoAmplio ? 'sm:grid-cols-[280px_1fr] items-start' : ''}`}>
            <button type="button" onClick={handleDescargarPlantilla} disabled={downloading}
              className="w-full flex items-center gap-2.5 h-10 px-3
                border border-primary/30 bg-primary/5 hover:bg-primary/10
                text-primary rounded-control text-[13px] font-semibold
                disabled:opacity-50 transition-colors"
            >
              <Download size={15} />
              {downloading ? 'Descargando…' : 'Descargar plantilla (.xlsx)'}
            </button>

            <div>
              <input
                type="file" accept=".xlsx,.csv"
                onChange={e => handleFileChange(e.target.files?.[0] || null)}
                className={`${inputCls} py-2 file:mr-3 file:h-7 file:px-3 file:rounded-badge
                  file:border-0 file:bg-primary/10 file:text-primary file:text-[12px]
                  file:font-semibold`}
              />
              {file && (
                <p className="flex items-center gap-1.5 text-[11.5px] text-muted mt-1.5">
                  <FileSpreadsheet size={12} className="text-faint" /> {file.name}
                </p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-faint">
            Columnas: Fecha, Operario, Maquina, Proyecto, Item, Fase, TiempoEstimado,
            Observaciones. Solo Fecha, Operario y Maquina son obligatorias.
          </p>

          {previewing && (
            <div className="flex items-center gap-2 text-[13px] text-muted py-4 justify-center">
              <Loader2 size={15} className="animate-spin" /> Validando archivo…
            </div>
          )}

          {previewError && (
            <div className="flex items-start gap-2 bg-error/8 border border-error/20
              rounded-[10px] p-3"
            >
              <AlertTriangle size={15} className="text-error mt-0.5 shrink-0" />
              <p className="text-[13px] text-error">{previewError}</p>
            </div>
          )}

          {/* Vista previa: tabla estilo hoja de cálculo antes de confirmar */}
          {hayVistaPrevia && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                {preview.validas === preview.total ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="text-warning shrink-0" />
                )}
                <p className="text-[13px] font-semibold text-ink">
                  {preview.validas} de {preview.total} filas listas para importar
                </p>
              </div>
              <div className="border border-border rounded-[11px] overflow-x-auto max-h-[52vh] overflow-y-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-surface2 shadow-[0_1px_0_0] shadow-border">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-mono text-[10.5px] font-semibold
                        uppercase tracking-[.06em] text-faint">Fila</th>
                      {preview.columnas.map(c => (
                        <th key={c} className="px-3 py-2.5 text-left font-mono text-[10.5px]
                          font-semibold uppercase tracking-[.06em] text-faint whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                      <th className="px-3 py-2.5 text-left font-mono text-[10.5px] font-semibold
                        uppercase tracking-[.06em] text-faint min-w-[220px]">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {preview.filas.map((f, i) => (
                      <tr key={f.fila}
                        className={`hover:bg-hover transition-colors
                          ${f.estado === 'error' ? 'bg-error/5' : i % 2 ? 'bg-surface2/40' : ''}`}
                      >
                        <td className="px-3 py-2.5 font-mono text-faint align-top">{f.fila}</td>
                        {preview.columnas.map(c => (
                          <td key={c} className="px-3 py-2.5 text-ink align-top max-w-[220px]"
                            title={f.valores[c] || undefined}
                          >
                            <span className="block truncate">{f.valores[c] || '—'}</span>
                          </td>
                        ))}
                        <td className="px-3 py-2.5 align-top">
                          {f.estado === 'ok' ? (
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px]
                              font-semibold px-2 py-1 rounded-badge bg-success/10 text-success"
                            >
                              <CheckCircle2 size={12} /> Lista
                            </span>
                          ) : (
                            <span className="flex items-start gap-1.5 text-error">
                              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                              <span className="text-[12px] leading-snug">{f.motivo}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultado final, después de confirmar */}
          {resultado && (
            <div className="bg-surface2 rounded-[11px] p-4 space-y-2 max-h-[50vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                {resultado.errores.length === 0 ? (
                  <CheckCircle2 size={15} className="text-success shrink-0" />
                ) : (
                  <AlertTriangle size={15} className="text-warning shrink-0" />
                )}
                <p className="text-[13px] font-semibold text-ink">
                  {resultado.creados} de {resultado.total} actividades creadas
                </p>
              </div>
              {resultado.errores.length > 0 && (
                <ul className="space-y-1 pl-1">
                  {resultado.errores.map((e, i) => (
                    <li key={i} className="text-[11.5px] text-error">
                      Fila {e.fila}: {e.motivo}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-border bg-surface2">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 border border-border rounded-control text-[13px]
              text-muted hover:bg-hover hover:text-ink transition-colors"
          >
            Cerrar
          </button>
          {!resultado && (
            <button type="button" onClick={handleImportar} disabled={!puedeImportar}
              className="flex-1 h-10 bg-primary hover:bg-primary-hover disabled:opacity-50
                text-white rounded-control text-[13px] font-semibold shadow-btn transition-colors"
            >
              {importing
                ? 'Importando…'
                : preview
                  ? `Confirmar importación (${preview.validas})`
                  : 'Importar'}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
