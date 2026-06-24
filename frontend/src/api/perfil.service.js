import api from './axios.js'

export const getPerfil        = ()       => api.get('/perfil')
export const updatePerfil     = (data)   => api.put('/perfil', data)
export const changePassword   = (data)   => api.patch('/perfil/password', data)
