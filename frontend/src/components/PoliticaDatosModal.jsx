import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { aceptarPoliticaDatos } from '../api/perfil.service'
import { getUser, login, logout } from '../utils/auth'
import { ContenidoPolitica } from '../pages/PoliticaDatos'

// Autorización previa del tratamiento de datos (Ley 1581 de 2012, art. 9).
// Se muestra al iniciar sesión mientras el usuario no haya aceptado la versión vigente;
// sin autorización no se puede usar el sistema, así que "No acepto" cierra la sesión.
export default function PoliticaDatosModal({ onAceptada }) {
  const navigate = useNavigate()
  const [acepto, setAcepto]   = useState(false)
  const [saving, setSaving]   = useState(false)

  const handleAceptar = async () => {
    setSaving(true)
    try {
      await aceptarPoliticaDatos()
      login({ ...getUser(), politica_pendiente: false })
      onAceptada()
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo registrar la autorización')
    } finally {
      setSaving(false)
    }
  }

  const handleRechazar = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 animate-ov-in">
      <div className="min-h-full flex items-center justify-center">
        <div role="dialog" aria-modal="true" aria-labelledby="politica-titulo"
          className="bg-surface border border-border rounded-[18px] shadow-modal w-full max-w-2xl my-4 overflow-hidden animate-md-in"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-gradient-to-b from-primary/5 to-surface">
            <div className="w-10 h-10 rounded-[11px] bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} className="text-primary" />
            </div>
            <div>
              <h3 id="politica-titulo" className="text-[16px] font-semibold text-ink">
                Autorización de tratamiento de datos personales
              </h3>
              <p className="text-[12px] text-muted">Ley 1581 de 2012 · lee la política antes de continuar</p>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 max-h-[55vh] overflow-y-auto">
            <ContenidoPolitica enApp />
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-surface2 space-y-3">
            <label className="flex items-start gap-2.5 text-[13px] text-ink cursor-pointer">
              <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary" />
              Autorizo a Macromet S.A.S. a tratar mis datos personales según esta política.
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={handleRechazar}
                className="flex-1 h-10 border border-border rounded-control text-[13px]
                  text-muted hover:bg-hover hover:text-ink transition-colors"
              >
                No acepto (cerrar sesión)
              </button>
              <button type="button" onClick={handleAceptar} disabled={!acepto || saving}
                className="flex-1 h-10 bg-primary hover:bg-primary-hover disabled:opacity-50
                  text-white rounded-control text-[13px] font-semibold shadow-btn transition-colors"
              >
                {saving ? 'Guardando…' : 'Aceptar y continuar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
