import api from './axios.js'

export const getMantenimientos    = ()         => api.get('/mantenimientos')
export const getMantenimientosMaq = (id)       => api.get(`/mantenimientos/maquina/${id}`)
export const createMantenimiento  = (data)     => api.post('/mantenimientos', data)
export const deleteMantenimiento  = (id)       => api.delete(`/mantenimientos/${id}`)
