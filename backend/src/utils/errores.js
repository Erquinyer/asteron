// Manejo centralizado de errores (RNF-06). Todos los controladores y el manejador
// global de app.js responden los errores con responderError: un solo lugar decide
// el código HTTP, el mensaje para el cliente y lo que queda en el log.
//
// Regla: el cliente nunca recibe detalles internos (SQL, stack trace, rutas del
// servidor). Para poder rastrear un 500, el log y la respuesta comparten un código
// de referencia, que viaja en el encabezado X-Error-Ref.
import { randomUUID } from 'node:crypto'

// Error de negocio esperado: su mensaje sí es para el cliente.
//   throw new ErrorApp(409, 'La fase ya está completada')
export class ErrorApp extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ErrorApp'
    this.status = status
  }
}

// Errores de MySQL que provienen de los datos enviados, no de una falla del
// servidor: se responden con 4xx y un mensaje entendible en vez de un 500.
const ERRORES_MYSQL = {
  ER_DUP_ENTRY:              [409, 'Ya existe un registro con esos datos'],
  ER_ROW_IS_REFERENCED:      [409, 'No se puede eliminar: el registro está en uso'],
  ER_ROW_IS_REFERENCED_2:    [409, 'No se puede eliminar: el registro está en uso'],
  ER_NO_REFERENCED_ROW:      [400, 'Uno de los datos relacionados no existe'],
  ER_NO_REFERENCED_ROW_2:    [400, 'Uno de los datos relacionados no existe'],
  ER_DATA_TOO_LONG:          [400, 'Uno de los campos supera la longitud permitida'],
  ER_TRUNCATED_WRONG_VALUE:  [400, 'Uno de los campos tiene un formato inválido'],
  // Valor fuera de un ENUM o de tipo incorrecto (ej. estado 'terminado'): en modo
  // estricto MySQL rechaza el INSERT con estos códigos y antes terminaban en 500.
  WARN_DATA_TRUNCATED:                [400, 'Uno de los campos tiene un formato inválido'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'Uno de los campos tiene un formato inválido'],
  ER_BAD_NULL_ERROR:         [400, 'Falta un dato obligatorio'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'Uno de los campos tiene un valor fuera del rango permitido'],
}

/**
 * Responde un error de forma uniforme.
 * @param {import('express').Response} res
 * @param {unknown} err
 * @param {string} contexto  dónde ocurrió, para el log (ej. 'clientes.getAll')
 * @param {string} [mensaje] mensaje genérico del 500 (ej. 'Error al obtener clientes')
 */
export const responderError = (res, err, contexto, mensaje = 'Error interno del servidor') => {
  if (res.headersSent) {
    console.error(`[${contexto}] Error después de enviar la respuesta`, err)
    return
  }
  if (err instanceof ErrorApp) {
    return res.status(err.status).json({ message: err.message })
  }
  const conocido = ERRORES_MYSQL[err?.code]
  if (conocido) {
    return res.status(conocido[0]).json({ message: conocido[1] })
  }

  const referencia = randomUUID().slice(0, 8)
  console.error(`[${contexto}] ref=${referencia}`, err)
  res.set('X-Error-Ref', referencia)
  res.status(500).json({ message: mensaje })
}
