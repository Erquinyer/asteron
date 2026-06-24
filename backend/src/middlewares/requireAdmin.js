export const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== 'Administrador Sistema') {
    return res.status(403).json({ message: 'Acceso reservado para Administrador Sistema' })
  }
  next()
}
