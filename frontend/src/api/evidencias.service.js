import api from './axios.js'

// Galería de un proyecto; filtros opcionales { fase, programacion }
export const getEvidencias = (proyecto, filtros = {}) =>
  api.get('/evidencias', { params: { proyecto, ...filtros } })

// La imagen exige el token, así que no se puede usar la URL directo en <img src>:
// se descarga como blob y el componente la muestra con URL.createObjectURL.
export const getArchivoEvidencia = (id) =>
  api.get(`/evidencias/${id}/archivo`, { responseType: 'blob' })

// datos: { foto (File), id_proyecto, id_fase_proyecto?, id_programacion?, descripcion? }
// Content-Type undefined: el navegador calcula el boundary del multipart (igual que en
// la importación de Programación). Timeout mayor: una foto de 5 MB desde el celular
// en la red de la planta puede tardar más que los 10 s por defecto.
export const subirEvidencia = (datos) => {
  const form = new FormData()
  for (const [campo, valor] of Object.entries(datos)) {
    if (valor !== null && valor !== undefined && valor !== '') form.append(campo, valor)
  }
  return api.post('/evidencias', form, { headers: { 'Content-Type': undefined }, timeout: 60000 })
}

export const deleteEvidencia = (id) => api.delete(`/evidencias/${id}`)
