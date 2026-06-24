import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { login } from '../utils/auth'
import { loginRequest } from '../api/auth.service'

const Login = () => {
  const navigate = useNavigate()
  const [form, setForm]               = useState({ correo: '', contrasena: '' })
  const [errors, setErrors]           = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]         = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!form.correo.trim()) {
      newErrors.correo = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      newErrors.correo = 'Ingresa un correo válido'
    }
    if (!form.contrasena) newErrors.contrasena = 'La contraseña es obligatoria'
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
    if (serverError)  setServerError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }

    setErrors({})
    setServerError('')
    setLoading(true)

    try {
      const { data } = await loginRequest(form.correo, form.contrasena)
      login(data.user)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.message || 'No se pudo conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">

      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/8 rounded-full blur-3xl" />
      </div>

      {/* Botón volver */}
      <div className="w-full max-w-md mb-5 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al inicio
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-2xl px-8 py-10 shadow-2xl backdrop-blur-sm">

        {/* Logo */}
        <div className="flex justify-center mb-7">
          <img src="/logo.svg" alt="Asteron" className="h-10 w-auto brightness-0 invert" />
        </div>

        {/* Encabezado */}
        <h1 className="text-2xl font-bold text-center text-white">Bienvenido</h1>
        <p className="text-sm text-center text-slate-400 mt-1 mb-8">
          Inicia sesión en el sistema de gestión Macromet
        </p>

        {/* Error del servidor */}
        {serverError && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {serverError}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Correo */}
          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-slate-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm text-white placeholder-slate-500
                bg-white/5 transition focus:outline-none focus:ring-2
                ${errors.correo
                  ? 'border-red-500/50 focus:ring-red-500/40'
                  : 'border-white/10 focus:ring-blue-500/40 focus:border-blue-500/50'
                }`}
            />
            {errors.correo && <p className="text-red-400 text-xs mt-1.5">{errors.correo}</p>}
          </div>

          {/* Contraseña */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="contrasena" className="block text-sm font-medium text-slate-300">
                Contraseña
              </label>
              <Link to="/forgot-password"
                className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="contrasena"
                type={showPassword ? 'text' : 'password'}
                name="contrasena"
                value={form.contrasena}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 pr-11 rounded-xl border text-sm text-white placeholder-slate-500
                  bg-white/5 transition focus:outline-none focus:ring-2
                  ${errors.contrasena
                    ? 'border-red-500/50 focus:ring-red-500/40'
                    : 'border-white/10 focus:ring-blue-500/40 focus:border-blue-500/50'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.contrasena && <p className="text-red-400 text-xs mt-1.5">{errors.contrasena}</p>}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : 'Iniciar sesión'}
          </button>

        </form>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-xs text-slate-600 text-center">
        © {new Date().getFullYear()} Asteron · Macromet S.A.S.
      </p>

    </div>
  )
}

export default Login
