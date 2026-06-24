import api from './axios.js'

// Permissions
export const getPermisos          = ()                     => api.get('/admin/permisos')
export const updateRolPermisos    = (id, modulos)          => api.put(`/admin/roles/${id}/permisos`, { modulos })
export const getAcciones          = ()                     => api.get('/admin/acciones')
export const updateRolAcciones    = (id, modulo, acciones) => api.put(`/admin/roles/${id}/acciones`, { modulo, acciones })

// Roles CRUD
export const getRoles             = ()           => api.get('/admin/roles')
export const createRol            = (data)       => api.post('/admin/roles', data)
export const updateRol            = (id, data)   => api.put(`/admin/roles/${id}`, data)
export const deleteRol            = (id)         => api.delete(`/admin/roles/${id}`)

// Users management
export const getUsuariosAdmin     = ()           => api.get('/admin/usuarios')
export const createUsuarioAdmin   = (data)       => api.post('/admin/usuarios', data)
export const updateUsuarioAdmin   = (id, data)   => api.put(`/admin/usuarios/${id}`, data)
export const updateUsuarioRol     = (id, id_rol) => api.patch(`/admin/usuarios/${id}/rol`, { id_rol })
export const toggleUsuarioAdmin   = (id)         => api.patch(`/admin/usuarios/${id}/toggle`)
