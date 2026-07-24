import { Router } from 'express'
import { getAll, getByMaquina, create, remove } from '../controllers/mantenimientos.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { mantenimientoCreateSchema } from '../schemas/mantenimientos.schema.js'

const router = Router()

/**
 * @openapi
 * /api/mantenimientos:
 *   get:
 *     tags: [Mantenimientos]
 *     summary: Lista los últimos 100 mantenimientos
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de mantenimientos } }
 *   post:
 *     tags: [Mantenimientos]
 *     summary: Registra un mantenimiento
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Mantenimiento creado }, 400: { description: Datos inválidos } }
 */
router.get('/',            getAll)
router.post('/',           validate(mantenimientoCreateSchema), create)

/**
 * @openapi
 * /api/mantenimientos/maquina/{id}:
 *   get:
 *     tags: [Mantenimientos]
 *     summary: Lista los mantenimientos de una máquina específica
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Mantenimientos de la máquina } }
 */
router.get('/maquina/:id', getByMaquina)

/**
 * @openapi
 * /api/mantenimientos/{id}:
 *   delete:
 *     tags: [Mantenimientos]
 *     summary: Elimina un registro de mantenimiento
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Eliminado } }
 */
router.delete('/:id',      remove)

export default router
