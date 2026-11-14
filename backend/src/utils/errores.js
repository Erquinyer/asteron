// ============================================================
// Manejo centralizado de errores del API (RNF-06).
//
// Un solo lugar decide qué código y qué mensaje recibe el cliente:
//  - ErrorHttp: errores esperados (validación, no encontrado, conflicto) con su
//    código y un mensaje pensado para la persona usuaria.
//  - Errores conocidos de MySQL: se traducen a 400/409 con un mensaje claro.
//  - Cualquier otro error: se registra completo en el servidor y el cliente
//    recibe un 500 con un mensaje genérico, nunca el SQL ni el stack trace.
//
// Lo usan los controladores (responderError) y el manejador global de app.js
// (manejadorErrores), así ambos caminos responden igual.
// ============================================================

export class ErrorHttp extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ErrorHttp'
    this.status = status
  }
}

// Restricciones de la BD que el usuario puede provocar con datos válidos en forma
const ERRORES_BD = {
  ER_DUP_ENTRY:            [409, 'Ya existe un registro con esos datos'],
  ER_ROW_IS_REFERENCED_2:  [409, 'No se puede eliminar porque otros registros dependen de este'],
  ER_NO_REFERENCED_ROW_2:  [400, 'Uno de los registros relacionados no existe'],
  ER_DATA_TOO_LONG:        [400, 'Uno de los campos supera la longitud permitida'],
}

export const MENSAJE_GENERICO = 'Error interno del servidor'

// Responde el error en JSON. `contexto` identifica el origen en el log del
// servidor (ej. 'clientes.getAll'); `mensaje` es el texto del 500 para el cliente.
export const responderError = (res, err, { contexto = 'api', mensaje = MENSAJE_GENERICO } = {}) => {
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ message: err.message })
  }
  const conocido = ERRORES_BD[err?.code]
  if (conocido) {
    const [status, message] = conocido
    return res.status(status).json({ message })
  }
  console.error(`[${contexto}]`, err)
  return res.status(500).json({ message: mensaje })
}

// Middleware de errores de Express: atrapa lo que ningún controlador respondió,
// incluidos los errores de express.json() y de multer.
// eslint-disable-next-line no-unused-vars
export const manejadorErrores = (err, _req, res, _next) => {
  // express.json() marca así un cuerpo que no es JSON válido
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande' })
  }
  // multer: archivo de importación por encima del límite
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'El archivo supera el tamaño máximo permitido (2 MB)' })
  }
  return responderError(res, err, { contexto: 'app' })
}
