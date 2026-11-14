import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getAuditoria } from '../../api/admin.service'
import Spinner from '../ui/Spinner'
import { resumirDetalle } from '../../utils/auditoria'

// Bitácora de auditoría (RNF-22): quién cambió usuarios, roles, permisos y maquinaria.
const MODULOS = [
  { valor: '',           texto: 'Todos los módulos' },
  { valor: 'usuarios',   texto: 'Usuarios' },
  { valor: 'roles',      texto: 'Roles' },
  { valor: 'permisos',   texto: 'Permisos' },
  { valor: 'maquinaria', texto: 'Maquinaria' },
]

const ACCIONES = {
  crear: 'Creó', editar: 'Editó', eliminar: 'Eliminó', activar: 'Activó',
  desactivar: 'Desactivó', cambiar_rol: 'Cambió el rol de',
}

const fecha = (iso) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export default function BitacoraAuditoria() {
  const [modulo,    setModulo]    = useState('')
  const [version,   setVersion]   = useState(0)   // sube al pulsar "Actualizar"
  const [resultado, setResultado] = useState(null) // { clave, filas, error }

  const clave = `${modulo}|${version}`
  useEffect(() => {
    let vigente = true
    getAuditoria(modulo)
      .then(({ data }) => { if (vigente) setResultado({ clave, filas: data, error: '' }) })
      .catch(() => { if (vigente) setResultado({ clave, filas: [], error: 'No se pudo cargar la bitácora.' }) })
    return () => { vigente = false }
  }, [modulo, clave])

  // Mientras llega la respuesta del filtro actual se muestra el indicador de carga
  const filas = resultado?.clave === clave ? resultado.filas : null
  const error = resultado?.clave === clave ? resultado.error : ''
  const cargar = () => setVersion(v => v + 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Bitácora de auditoría</h2>
          <p className="text-[12.5px] text-muted">Últimos 200 cambios en usuarios, roles, permisos y maquinaria.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="bitacora-modulo" className="sr-only">Módulo</label>
          <select id="bitacora-modulo" value={modulo} onChange={e => setModulo(e.target.value)}
            className="h-9 border border-border rounded-control px-2 text-[13px] bg-surface2 text-ink"
          >
            {MODULOS.map(m => <option key={m.valor} value={m.valor}>{m.texto}</option>)}
          </select>
          <button type="button" onClick={cargar} aria-label="Actualizar bitácora"
            className="h-9 w-9 flex items-center justify-center border border-border rounded-control text-muted hover:text-ink"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-[13px] text-error">{error}</p>}

      {filas === null ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : filas.length === 0 ? (
        <p className="text-[13px] text-muted py-6 text-center">Todavía no hay cambios registrados.</p>
      ) : (
        <div className="border border-border rounded-card overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-surface2 border-b border-border text-left font-mono text-[10.5px] uppercase tracking-[.06em] text-faint">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Quién</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3 hidden md:table-cell">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.id_auditoria} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{fecha(f.fecha)}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink font-medium">{f.usuario || 'Usuario eliminado'}</p>
                    <p className="text-faint">{f.rol}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {ACCIONES[f.accion] || f.accion} {f.modulo}{f.id_registro ? ` #${f.id_registro}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted hidden md:table-cell max-w-md break-words">{resumirDetalle(f.detalle)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
