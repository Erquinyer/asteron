import api from './axios.js'

export const getUsuarios      = ()          => api.get('/usuarios')
export const getRoles         = ()          => api.get('/usuarios/roles')
export const createUsuario    = (data)      => api.post('/usuarios', data)
export const updateUsuario    = (id, data)  => api.put(`/usuarios/${id}`, data)
export const toggleUsuario    = (id)        => api.patch(`/usuarios/${id}/estado`)
