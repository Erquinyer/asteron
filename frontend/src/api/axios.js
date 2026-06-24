import axios from 'axios'
import { logout } from '../utils/auth'

// Instancia central de axios.
// Todas las peticiones del sistema pasan por aquí.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Interceptor de REQUEST ──────────────────────────────────────────
// Se ejecuta ANTES de cada petición.
// Añade el token JWT al header Authorization si existe sesión activa.
api.interceptors.request.use((config) => {
  const session = JSON.parse(localStorage.getItem('asteron_auth') || 'null')
  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`
  }
  return config
})

// ── Interceptor de RESPONSE ─────────────────────────────────────────
// Se ejecuta DESPUÉS de cada respuesta.
// Si el servidor devuelve 401 (token expirado/inválido) → cierra la sesión.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
