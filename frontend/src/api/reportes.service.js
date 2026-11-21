import api from './axios.js'

export const getReporteHoras          = (params) => api.get('/reportes/horas', { params })
export const getReporteAvance         = (params) => api.get('/reportes/avance', { params })
export const getReporteMantenimientos = (params) => api.get('/reportes/mantenimientos', { params })

export const exportarReporte = (tipo, formato, params) =>
  api.get(`/reportes/${tipo}/exportar`, {
    params: { ...params, formato },
    responseType: 'blob',
    timeout: 60000,
  })
