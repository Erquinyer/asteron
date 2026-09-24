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

export const descargarPlantillaProgramacion = () =>
  api.get('/programacion/plantilla', { responseType: 'blob' })

// Content-Type explícitamente undefined: la instancia de axios trae
// 'application/json' por defecto, y hay que dejar que el navegador calcule
// el boundary multipart al enviar un FormData.
const subirArchivo = (path, file) => {
  const form = new FormData()
  form.append('archivo', file)
  return api.post(path, form, { headers: { 'Content-Type': undefined } })
}

// Dry-run: valida el archivo y devuelve fila por fila lo que se crearía, sin
// crear nada todavía — para mostrar la vista previa antes de confirmar.
export const previsualizarProgramacion = (file) => subirArchivo('/programacion/importar/preview', file)
export const importarProgramacion      = (file) => subirArchivo('/programacion/importar', file)
