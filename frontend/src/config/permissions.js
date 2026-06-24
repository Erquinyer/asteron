// Define qué módulos puede ver cada rol.
// La clave debe coincidir exactamente con el nombre del rol en la BD.
// 'perfil' es accesible para todos los roles autenticados sin declararlo aquí.

export const ROLE_PERMISSIONS = {
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

// Devuelve true si el rol dado tiene permiso sobre el módulo indicado
export const canAccess = (rol, module) => {
  const allowed = ROLE_PERMISSIONS[rol] ?? []
  return allowed.includes(module)
}
