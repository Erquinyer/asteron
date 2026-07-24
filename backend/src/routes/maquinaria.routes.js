import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/maquinaria.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { maquinariaCreateSchema, maquinariaUpdateSchema } from '../schemas/maquinaria.schema.js'

const router = Router()

/**
 * @openapi
 * /api/maquinaria:
 *   get:
 *     tags: [Maquinaria]
 *     summary: Lista toda la maquinaria
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de maquinaria } }
 *   post:
 *     tags: [Maquinaria]
 *     summary: Registra un nuevo equipo
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Equipo creado }, 400: { description: Datos inválidos } }
 */
router.get('/',    getAll)
router.post('/',   validate(maquinariaCreateSchema), create)

/**
 * @openapi
 * /api/maquinaria/{id}:
 *   get:
 *     tags: [Maquinaria]
 *     summary: Obtiene un equipo con su historial de mantenimientos
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Equipo encontrado }, 404: { description: No encontrado } }
 *   put:
 *     tags: [Maquinaria]
 *     summary: Actualiza un equipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Equipo actualizado } }
 *   delete:
 *     tags: [Maquinaria]
 *     summary: Elimina un equipo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Equipo eliminado } }
 */
router.get('/:id',    getOne)
router.put('/:id',    validate(maquinariaUpdateSchema), update)
router.delete('/:id', remove)

export default router
