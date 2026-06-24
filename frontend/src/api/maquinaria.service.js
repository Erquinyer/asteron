import api from './axios.js'

export const getMaquinaria        = ()          => api.get('/maquinaria')
export const getMaquinariaVista   = ()          => api.get('/maquinaria/vista')
export const getMaquina           = (id)        => api.get(`/maquinaria/${id}`)
export const createMaquina        = (data)      => api.post('/maquinaria', data)
export const updateMaquina        = (id, data)  => api.put(`/maquinaria/${id}`, data)
export const deleteMaquina        = (id)        => api.delete(`/maquinaria/${id}`)
