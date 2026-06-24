import api from './axios.js'

export const getClientes              = ()          => api.get('/clientes')
export const getClientesProcedimiento = ()          => api.get('/clientes/procedimiento')
export const getCliente               = (id)        => api.get(`/clientes/${id}`)
export const createCliente            = (data)      => api.post('/clientes', data)
export const updateCliente            = (id, data)  => api.put(`/clientes/${id}`, data)
export const deleteCliente            = (id)        => api.delete(`/clientes/${id}`)
