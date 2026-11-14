import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { aceptarPoliticaDatos } from '../api/perfil.service'
import { getUser, login, logout } from '../utils/auth'

// Ley 1581 de 2012: la primera vez que una persona entra a Asteron debe aceptar la
// política de tratamiento de datos. Hasta que la acepte, este aviso cubre la
// aplicación; también puede salir sin aceptar.
export default function AvisoPoliticaDatos({ onAceptada }) {
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  const aceptar = async () => {
    setEnviando(true)
    try {
      await aceptarPoliticaDatos()
      login({ ...getUser(), aceptaPoliticaDatos: true })
      toast.success('Autorización registrada')
      onAceptada?.()
    } catch {
      toast.error('No se pudo registrar la autorización. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const salir = () => { logout(); navigate('/login') }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="politica-titulo"
        className="w-full max-w-lg bg-surface border border-border rounded-card shadow-card dark:shadow-card-dk p-6 space-y-4"
      >
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck size={20} />
          <h2 id="politica-titulo" className="text-[17px] font-semibold text-ink">Tratamiento de tus datos personales</h2>
        </div>
        <p className="text-[14px] leading-relaxed text-muted">
          Asteron registra tu nombre, correo, cargo y los tiempos de las actividades que realizas en planta para
          programar la producción y generar reportes internos. Puedes conocer, actualizar o pedir la supresión de
          tus datos en cualquier momento.
        </p>
        <p className="text-[14px] text-muted">
          Lee la{' '}
          <Link to="/politica-datos" className="font-medium text-primary hover:underline">política de tratamiento de datos</Link>
          {' '}completa.
        </p>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button type="button" onClick={salir}
            className="px-4 py-2 rounded-lg text-[14px] text-muted hover:text-ink border border-border"
          >
            No acepto, cerrar sesión
          </button>
          <button type="button" onClick={aceptar} disabled={enviando}
            className="px-4 py-2 rounded-lg text-[14px] font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {enviando ? 'Registrando…' : 'Acepto la política'}
          </button>
        </div>
      </div>
    </div>
  )
}
