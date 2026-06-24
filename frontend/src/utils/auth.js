const KEY = 'asteron_auth'

export const login           = (user) => localStorage.setItem(KEY, JSON.stringify(user))
export const logout          = () => localStorage.removeItem(KEY)
export const getUser         = () => JSON.parse(localStorage.getItem(KEY) || 'null')
export const isAuthenticated = () => !!localStorage.getItem(KEY)

// Verifica si el usuario tiene permiso para ejecutar una acción en un módulo.
// Ej: canDo('programacion', 'crear'), canDo('proyectos', 'eliminar')
export const canDo = (modulo, accion) =>
  getUser()?.acciones?.[modulo]?.includes(accion) ?? false
