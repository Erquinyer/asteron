import { Router } from 'express'
import { getAll, getOne, create, update, remove, updateFase } from '../controllers/proyectos.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { proyectoCreateSchema, proyectoUpdateSchema, faseUpdateSchema } from '../schemas/proyectos.schema.js'

const router = Router()

/**
 * @openapi
 * /api/proyectos:
 *   get:
 *     tags: [Proyectos]
 *     summary: Lista todos los proyectos con su avance
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de proyectos } }
 *   post:
 *     tags: [Proyectos]
 *     summary: Crea un proyecto y le aplica las fases estándar automáticamente
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Proyecto creado }, 400: { description: Datos inválidos } }
 */
router.get('/',    getAll)
router.post('/',   validate(proyectoCreateSchema), create)

/**
 * @openapi
 * /api/proyectos/{id}:
 *   get:
 *     tags: [Proyectos]
 *     summary: Obtiene un proyecto con sus fases
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Proyecto encontrado }, 404: { description: No encontrado } }
 *   put:
 *     tags: [Proyectos]
 *     summary: Actualiza un proyecto
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Proyecto actualizado } }
 *   delete:
 *     tags: [Proyectos]
 *     summary: Elimina un proyecto
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Eliminado } }
 */
router.get('/:id',                     getOne)
router.put('/:id',                     validate(proyectoUpdateSchema), update)
router.delete('/:id',                  remove)

/**
 * @openapi
 * /api/proyectos/{id}/fases/{faseId}:
 *   patch:
 *     tags: [Proyectos]
 *     summary: Actualiza el estado y avance de una fase del proyecto
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: faseId, required: true, schema: { type: integer } }
 *     responses: { 200: { description: Fase actualizada } }
 */
router.patch('/:id/fases/:faseId',     validate(faseUpdateSchema), updateFase)

export default router
