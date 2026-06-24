import api from './axios.js'

export const getDashboard = () => api.get('/dashboard/stats')
