import api from './axios.js'

export const getNotificaciones = () => api.get('/notificaciones')
export const atenderNotificacion = (clave) => api.post(`/notificaciones/${clave}/atender`)
