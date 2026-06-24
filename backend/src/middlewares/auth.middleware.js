import jwt from 'jsonwebtoken'

// Protege rutas privadas verificando el token JWT del header Authorization
export const verifyToken = (req, res, next) => {
  const auth = req.headers.authorization

  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado: token requerido' })
  }

  const token = auth.split(' ')[1]

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next() // token válido → continúa al controlador
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' })
  }
}
