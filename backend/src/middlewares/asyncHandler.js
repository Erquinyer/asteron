// ============================================================
// asyncHandler — elimina el try/catch repetido en cada controlador.
// Envuelve un controlador async y reenvía cualquier error a
// errorHandler.middleware.js mediante next(err), en vez de que
// cada función tenga que capturarlo manualmente.
// ============================================================

/**
 * @param {(req, res, next) => Promise<any>} fn
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
