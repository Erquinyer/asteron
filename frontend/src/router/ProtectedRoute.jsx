import { Navigate, Outlet } from 'react-router-dom'
import { isAuthenticated } from '../utils/auth'

// Si hay sesión → renderiza la ruta solicitada (<Outlet />)
// Si no hay sesión → redirige automáticamente al login
const ProtectedRoute = () => {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
