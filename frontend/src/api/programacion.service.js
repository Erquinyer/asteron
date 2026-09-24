import api from './axios.js'

// Acepta una fecha ('YYYY-MM-DD') para la vista día, o un rango { desde, hasta }
// para las vistas de semana / mes.
export const getProgramacion    = (arg)         => api.get('/programacion', {
  params: !arg ? {} : typeof arg === 'string' ? { fecha: arg } : arg,
})
export const getOcupados        = (fecha)       => api.get('/programacion/ocupados', {
  params: fecha ? { fecha } : {},
})
export const getActividadesFase = (idFase)      => api.get(`/programacion/fase/${idFase}`)
export const createProgramacion = (data)        => api.post('/programacion', data)
export const updateProgramacion = (id, data)    => api.put(`/programacion/${id}`, data)
export const updateEstadoTurno  = (id, data)    => api.patch(`/programacion/${id}/estado`, data)
export const updateAvanceTurno  = (id, porcentaje_avance) => api.patch(`/programacion/${id}/avance`, { porcentaje_avance })
export const deleteProgramacion = (id)          => api.delete(`/programacion/${id}`)
