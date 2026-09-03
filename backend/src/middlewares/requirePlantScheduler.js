// Solo el líder de planta y la coordinación de producción crean, inician y
// finalizan turnos de planta (fases "Corte" → "Pintura y acabados"); el operario
// asignado conserva acceso de solo lectura a su turno del día.
const ROLES_PROGRAMACION = [
  'Coordinador de Planta',
  'Coordinador de Producción',
  'Gerente General',
  'Administrador Sistema',
]

export const requirePlantScheduler = (req, res, next) => {
  if (!ROLES_PROGRAMACION.includes(req.user?.rol)) {
    return res.status(403).json({
      message: 'Solo el líder de planta o la coordinación de producción pueden gestionar la programación',
    })
  }
  next()
}
