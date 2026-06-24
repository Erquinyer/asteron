import api from './axios.js'

export const getNotificaciones = () => api.get('/notificaciones')
