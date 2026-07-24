import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/pedidos.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { pedidoCreateSchema, pedidoUpdateSchema } from '../schemas/pedidos.schema.js'

const router = Router()

/**
 * @openapi
 * /api/pedidos:
 *   get:
 *     tags: [Pedidos]
 *     summary: Lista todos los pedidos
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de pedidos } }
 *   post:
 *     tags: [Pedidos]
 *     summary: Crea un pedido con sus items (transacción)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Pedido creado }, 400: { description: Datos inválidos } }
 */
router.get('/',       getAll)
router.post('/',      validate(pedidoCreateSchema), create)

/**
 * @openapi
 * /api/pedidos/{id}:
 *   get:
 *     tags: [Pedidos]
 *     summary: Obtiene un pedido con sus items
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Pedido encontrado }, 404: { description: No encontrado } }
 *   put:
 *     tags: [Pedidos]
 *     summary: Actualiza un pedido
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Pedido actualizado } }
 *   delete:
 *     tags: [Pedidos]
 *     summary: Elimina un pedido
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Eliminado } }
 */
router.get('/:id',    getOne)
router.put('/:id',    validate(pedidoUpdateSchema), update)
router.delete('/:id', remove)

export default router
