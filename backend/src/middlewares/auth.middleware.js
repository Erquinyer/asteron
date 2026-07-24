import jwt from 'jsonwebtoken'
import { fail } from '../utils/apiResponse.js'

// Protege rutas privadas verificando el token JWT del header Authorization
export const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth?.startsWith('Bearer ')) {
    return fail(res, 'Acceso denegado: token requerido', 401)
  }

  const token = auth.split(' ')[1]

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next() // token válido → continúa al controlador
  } catch {
    return fail(res, 'Token inválido o expirado', 401)
  }
}
