const KEY = 'asteron_auth'

export const login           = (user) => localStorage.setItem(KEY, JSON.stringify(user))
export const logout          = () => localStorage.removeItem(KEY)
export const getUser         = () => JSON.parse(localStorage.getItem(KEY) || 'null')
export const isAuthenticated = () => !!localStorage.getItem(KEY)

// Verifica si el usuario tiene permiso para ejecutar una acción en un módulo.
// Ej: canDo('programacion', 'crear'), canDo('proyectos', 'eliminar')
export const canDo = (modulo, accion) =>
  getUser()?.acciones?.[modulo]?.includes(accion) ?? false

// Solo el líder de planta y la coordinación de producción crean, inician y
// finalizan turnos de planta — debe reflejar exactamente la misma lista que
// requirePlantScheduler.js en el backend. El operario ve su turno del día
// pero no interactúa con él.
const ROLES_PROGRAMACION = [
  'Coordinador de Planta',
  'Coordinador de Producción',
  'Gerente General',
  'Administrador Sistema',
]
export const canManagePlanta = () => ROLES_PROGRAMACION.includes(getUser()?.rol)
