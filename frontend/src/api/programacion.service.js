import api from './axios.js'

export const getProgramacion    = (fecha)       => api.get('/programacion', { params: fecha ? { fecha } : {} })
export const createProgramacion = (data)        => api.post('/programacion', data)
export const updateEstadoTurno  = (id, data)    => api.patch(`/programacion/${id}/estado`, data)
export const deleteProgramacion = (id)          => api.delete(`/programacion/${id}`)
