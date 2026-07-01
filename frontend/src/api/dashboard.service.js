import api from './axios.js'

export const getDashboard = () => api.get('/dashboard/stats')
export const getCounts    = () => api.get('/dashboard/counts')
