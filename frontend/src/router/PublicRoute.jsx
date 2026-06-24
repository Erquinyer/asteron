import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

// Si ya hay sesión activa → redirige al dashboard (no tiene sentido mostrar el login)
// Si no hay sesión → renderiza la ruta pública normalmente
const PublicRoute = () => {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default PublicRoute
