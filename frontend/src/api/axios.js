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
//
// 1) Desempaqueta el sobre unificado del backend { success, message, data }.
//    El backend ahora responde siempre con esa forma (ver ARQUITECTURA.md),
//    pero todo el frontend fue escrito esperando `res.data` como el payload
//    "pelado" (el array/objeto real). En vez de tocar cada página y cada
//    servicio, se desempaqueta aquí una sola vez: `res.data` sigue siendo
//    el payload real, y el mensaje del backend queda disponible en
//    `res.message` por si algún componente lo quiere mostrar.
//
// 2) Si el servidor devuelve 401 Y hay sesión activa (token expirado) → cierra la sesión.
//    Si no hay sesión es porque estamos en el login: dejamos que el catch del componente maneje el error.
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      response.message = response.data.message
      response.data = response.data.data
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const session = JSON.parse(localStorage.getItem('asteron_auth') || 'null')
      if (session?.token) {
        logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
