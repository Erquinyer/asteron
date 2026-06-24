import api from './axios.js'

export const getPermisos          = ()           => api.get('/admin/permisos')
export const updateRolPermisos    = (id, modulos) => api.put(`/admin/roles/${id}/permisos`, { modulos })
export const getUsuariosAdmin     = ()           => api.get('/admin/usuarios')
export const updateUsuarioRol     = (id, id_rol) => api.patch(`/admin/usuarios/${id}/rol`, { id_rol })
