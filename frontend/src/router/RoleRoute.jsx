import { Navigate } from 'react-router-dom'
import { getUser } from '../utils/auth'
import { canAccess } from '../config/permissions'

// Protege una ruta según el rol del usuario autenticado.
// Si el rol no tiene permiso sobre `module`, redirige al dashboard.
const RoleRoute = ({ module, children }) => {
  const user = getUser()
  if (!user || !canAccess(user.rol, module)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default RoleRoute
