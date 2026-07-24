// ============================================================
// Respuesta unificada de la API
// Equivalente al patrón { success, message, data } que exige
// la guía de entrega (mismo objetivo que las respuestas
// estandarizadas de FastAPI/Pydantic, adaptado a Express).
// ============================================================

/**
 * Respuesta exitosa estándar.
 * @param {import('express').Response} res
 * @param {*} data          - Payload a devolver (objeto, array, null)
 * @param {string} message  - Mensaje descriptivo para el frontend
 * @param {number} status   - Código HTTP (default 200)
 */
export const ok = (res, data = null, message = 'Operación exitosa', status = 200) =>
  res.status(status).json({ success: true, message, data })

/**
 * Respuesta de error estándar.
 * @param {import('express').Response} res
 * @param {string} message  - Mensaje de error legible
 * @param {number} status   - Código HTTP (default 500)
 * @param {*} errors        - Detalle adicional (ej. errores de validación), opcional
 */
export const fail = (res, message = 'Error interno del servidor', status = 500, errors = null) =>
  res.status(status).json({ success: false, message, data: null, ...(errors ? { errors } : {}) })
