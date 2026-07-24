import { Router } from 'express'
import { getAll, create, updateEstado, remove } from '../controllers/programacion.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { programacionCreateSchema, programacionEstadoSchema } from '../schemas/programacion.schema.js'

const router = Router()

/**
 * @openapi
 * /api/programacion:
 *   get:
 *     tags: [Programación]
 *     summary: Lista la programación de planta de un día (?fecha=YYYY-MM-DD)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: fecha, schema: { type: string, format: date } }]
 *     responses: { 200: { description: Programación del día } }
 *   post:
 *     tags: [Programación]
 *     summary: Crea un bloque de programación de planta
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Bloque creado }, 400: { description: Datos inválidos } }
 */
router.get('/',              getAll)
router.post('/',             validate(programacionCreateSchema), create)

/**
 * @openapi
 * /api/programacion/{id}/estado:
 *   patch:
 *     tags: [Programación]
 *     summary: Actualiza el estado de un bloque de programación
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Estado actualizado } }
 */
router.patch('/:id/estado',  validate(programacionEstadoSchema), updateEstado)

/**
 * @openapi
 * /api/programacion/{id}:
 *   delete:
 *     tags: [Programación]
 *     summary: Elimina un bloque de programación
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Eliminado } }
 */
router.delete('/:id',        remove)

export default router
