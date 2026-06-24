import api from './axios.js'

export const getProyectos  = ()       => api.get('/proyectos')
export const getProyecto   = (id)     => api.get(`/proyectos/${id}`)
export const createProyecto = (data)  => api.post('/proyectos', data)
export const updateProyecto = (id, data) => api.put(`/proyectos/${id}`, data)
export const deleteProyecto  = (id)             => api.delete(`/proyectos/${id}`)
export const updateFase      = (id, faseId, data) => api.patch(`/proyectos/${id}/fases/${faseId}`, data)
