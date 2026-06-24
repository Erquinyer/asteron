import api from './axios.js'

export const getPermisos          = ()                     => api.get('/admin/permisos')
export const updateRolPermisos    = (id, modulos)          => api.put(`/admin/roles/${id}/permisos`, { modulos })
export const getAcciones          = ()                     => api.get('/admin/acciones')
export const updateRolAcciones    = (id, modulo, acciones) => api.put(`/admin/roles/${id}/acciones`, { modulo, acciones })
export const getUsuariosAdmin     = ()                     => api.get('/admin/usuarios')
export const updateUsuarioRol     = (id, id_rol)           => api.patch(`/admin/usuarios/${id}/rol`, { id_rol })
