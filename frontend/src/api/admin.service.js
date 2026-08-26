import api from './axios.js'

// Permissions
export const getAcciones          = ()          => api.get('/admin/acciones')
export const guardarPermisosLote  = (cambios)   => api.put('/admin/permisos/lote', { cambios })

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
