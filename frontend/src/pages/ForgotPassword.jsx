import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPasswordRequest } from '../api/auth.service'

export default function ForgotPassword() {
  const [correo,  setCorreo]  = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    if (!correo.trim()) { setError('Ingresa tu correo electrónico'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { setError('Correo inválido'); return }

    setError('')
    setLoading(true)
    try {
      await forgotPasswordRequest(correo.trim())
      setSent(true)
    } catch {
      setError('No se pudo procesar la solicitud. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md px-8 py-10">

        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="Asteron" className="h-20 w-auto object-contain"/>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Revisa tu correo</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Si <strong>{correo}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
              El enlace es válido por <strong>30 minutos</strong>.
            </p>
            <Link to="/login"
              className="inline-block mt-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline underline-offset-2">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center text-slate-800 dark:text-white">¿Olvidaste tu contraseña?</h1>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-1 mb-8">
              Escribe tu correo y te enviaremos un enlace para restablecerla.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-6">
                <label htmlFor="correo" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Correo electrónico
                </label>
                <input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={e => { setCorreo(e.target.value); setError('') }}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-sm font-semibold py-3 rounded-lg transition disabled:opacity-60">
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
              <Link to="/login" className="text-slate-700 dark:text-slate-300 font-medium hover:underline">
                ← Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
