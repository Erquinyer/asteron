import { fail } from '../utils/apiResponse.js'

// ============================================================
// validate — middleware genérico de validación de entrada.
//
// Es el equivalente funcional a declarar un modelo Pydantic como
// parámetro de una ruta en FastAPI: valida y transforma req.body
// (o req.params/req.query) ANTES de que la petición llegue al
// controlador, y devuelve un error 400 uniforme si no cumple el
// esquema — el controlador nunca recibe datos inválidos.
//
// Uso en las rutas:
//   router.post('/', validate(clienteCreateSchema), create)
// ============================================================

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'params' | 'query'} source
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])

  if (!result.success) {
    const errores = result.error.issues.map(i => ({
      campo:   i.path.join('.'),
      mensaje: i.message,
    }))
    return fail(res, 'Datos de entrada inválidos', 400, errores)
  }

  // Reemplaza los datos crudos por los ya validados/transformados
  req[source] = result.data
  next()
}
