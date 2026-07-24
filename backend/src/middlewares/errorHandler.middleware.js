import { fail } from '../utils/apiResponse.js'

// ============================================================
// Manejo centralizado de excepciones.
// Cualquier error no controlado que llegue a next(err) —ya sea
// lanzado dentro de un controlador envuelto en asyncHandler, o
// por Express internamente— termina aquí, con una respuesta
// unificada y un log consistente en servidor.
// ============================================================

// 404 — ninguna ruta coincidió
export const notFoundHandler = (req, res) => {
  fail(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404)
}

// Manejador global de errores (debe ir SIEMPRE al final de app.js,
// después de montar todas las rutas)
export const errorHandler = (err, req, res, _next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err)

  // Errores de validación de Zod (por si algo se escapa del middleware validate)
  if (err?.name === 'ZodError') {
    return fail(res, 'Datos de entrada inválidos', 400, err.issues)
  }

  // Errores conocidos de MySQL con código propio
  if (err?.code === 'ER_DUP_ENTRY') {
    return fail(res, 'El registro ya existe', 409)
  }

  const status = err.status || err.statusCode || 500
  fail(res, err.message || 'Error interno del servidor', status)
}
