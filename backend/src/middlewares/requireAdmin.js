import { fail } from '../utils/apiResponse.js'

export const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'Administrador Sistema') {
    return fail(res, 'Acceso reservado para Administrador Sistema', 403)
  }
  next()
}
