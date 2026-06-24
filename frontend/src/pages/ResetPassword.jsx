import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { resetPasswordRequest } from '../api/auth.service'

export default function ResetPassword() {
  const [searchParams]              = useSearchParams()
  const navigate                    = useNavigate()
  const token                       = searchParams.get('token') || ''

  const [form, setForm]             = useState({ nueva: '', confirmar: '' })
  const [loading, setLoading]       = useState(false)
  const [done,    setDone]          = useState(false)
  const [error,   setError]         = useState('')
  const [showNueva,     setShowNueva]     = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md px-8 py-10 text-center space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm">Enlace inválido o incompleto.</p>
          <Link to="/forgot-password" className="text-slate-700 dark:text-slate-300 font-medium text-sm hover:underline">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    )
  }

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.nueva)            { setError('Ingresa la nueva contraseña'); return }
    if (form.nueva.length < 6)  { setError('Mínimo 6 caracteres'); return }
    if (form.nueva !== form.confirmar) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    try {
      await resetPasswordRequest(token, form.nueva)
      setDone(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ show }) => show
    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md px-8 py-10">

        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="Asteron" className="h-20 w-auto object-contain"/>
        </div>

        {done ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">¡Contraseña actualizada!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión…
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-white">Nueva contraseña</h1>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-1 mb-8">
              Elige una contraseña segura de al menos 6 caracteres.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nueva contraseña</label>
                <div className="relative">
                  <input
                    name="nueva"
                    type={showNueva ? 'text' : 'password'}
                    value={form.nueva}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                  <button type="button" onClick={() => setShowNueva(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <EyeIcon show={showNueva}/>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirmar contraseña</label>
                <div className="relative">
                  <input
                    name="confirmar"
                    type={showConfirmar ? 'text' : 'password'}
                    value={form.confirmar}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                  <button type="button" onClick={() => setShowConfirmar(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    <EyeIcon show={showConfirmar}/>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold py-3 rounded-lg transition disabled:opacity-60">
                {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
