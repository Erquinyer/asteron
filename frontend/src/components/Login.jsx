import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../utils/auth'
import { loginRequest } from '../api/auth.service'

const Login = () => {
  const navigate = useNavigate()
  const [form, setForm]             = useState({ correo: '', contrasena: '' })
  const [errors, setErrors]         = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading]       = useState(false)

  const validate = () => {
    const newErrors = {}
    if (!form.correo.trim()) {
      newErrors.correo = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) {
      newErrors.correo = 'Ingresa un correo válido'
    }
    if (!form.contrasena) {
      newErrors.contrasena = 'La contraseña es obligatoria'
    }
    return newErrors
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name])  setErrors({ ...errors, [name]: '' })
    if (serverError)   setServerError('')
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
      login(data.user)        // guarda { nombre, correo, rol, token } en localStorage
      navigate('/dashboard')
    } catch (err) {
      // err.response existe cuando el servidor respondió (ej: 401 credenciales incorrectas)
      // err.response no existe cuando no hay conexión con el servidor
      const message = err.response?.data?.message || 'No se pudo conectar con el servidor'
      setServerError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md px-8 py-10">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="Logo Asteron" className="h-20 w-auto object-contain" />
        </div>

        {/* Encabezado */}
        <h1 className="text-2xl font-bold text-center text-slate-800">Bienvenido</h1>
        <p className="text-sm text-center text-slate-500 mt-1 mb-8">
          Inicia sesión en el sistema de gestión Asteron
        </p>

        {/* Error del servidor */}
        {serverError && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {serverError}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Correo */}
          <div className="mb-5">
            <label htmlFor="correo" className="block text-sm font-medium text-slate-700 mb-1">
              Correo electrónico
            </label>
            <input
              id="correo"
              type="email"
              name="correo"
              value={form.correo}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-500
                ${errors.correo ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-300 bg-white'}`}
            />
            {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo}</p>}
          </div>

          {/* Contraseña */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="contrasena" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <Link to="/forgot-password"
                className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="contrasena"
              type="password"
              name="contrasena"
              value={form.contrasena}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-slate-500
                ${errors.contrasena ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-slate-300 bg-white'}`}
            />
            {errors.contrasena && <p className="text-red-500 text-xs mt-1">{errors.contrasena}</p>}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-sm font-semibold py-3 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>

        </form>
      </div>
    </div>
  )
}

export default Login
