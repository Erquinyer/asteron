import { getUser } from '../utils/auth'

// Static fallback — used when no dynamic modulos are stored in session
export const ROLE_PERMISSIONS = {
  'Administrador Sistema': [
    'dashboard', 'proyectos', 'pedidos', 'clientes',
    'maquinaria', 'mantenimientos', 'programacion', 'usuarios',
  ],
  'Gerente General': [
    'dashboard', 'proyectos', 'pedidos', 'clientes',
    'maquinaria', 'mantenimientos', 'programacion', 'usuarios',
  ],
  'Consultor Estrategia': [
    'dashboard', 'proyectos', 'pedidos', 'clientes',
  ],
  'Coordinador de Producción': [
    'dashboard', 'proyectos', 'pedidos', 'programacion',
  ],
  'Coordinador de Planta': [
    'dashboard', 'proyectos', 'maquinaria', 'mantenimientos', 'programacion',
  ],
  'Ejecutivo Comercial': [
    'dashboard', 'pedidos', 'clientes',
  ],
  'Jefe de Almacén': [
    'dashboard', 'maquinaria', 'mantenimientos',
  ],
  'Administrativo': [
    'dashboard', 'pedidos', 'clientes', 'usuarios',
  ],
  'Operario': [
    'dashboard', 'programacion',
  ],
}

// Returns true if the current user's session allows access to the given module.
// 'admin' is a virtual module only for Administrador Sistema (not stored in DB).
// Otherwise prefers dynamic modulos from login (DB) over the static map.
export const canAccess = (rol, module) => {
  if (module === 'admin') return rol === 'Administrador Sistema'
  const user = getUser()
  if (user?.modulos && Array.isArray(user.modulos)) {
    return user.modulos.includes(module)
  }
  return (ROLE_PERMISSIONS[rol] ?? []).includes(module)
}

// True only for the system administrator role
export const isAdmin = (rol) => rol === 'Administrador Sistema'
