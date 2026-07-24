import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/clientes.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { clienteCreateSchema, clienteUpdateSchema } from '../schemas/clientes.schema.js'

const router = Router()

/**
 * @openapi
 * /api/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Lista todos los clientes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de clientes }
 *   post:
 *     tags: [Clientes]
 *     summary: Crea un cliente nuevo
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre:         { type: string }
 *               nit:            { type: string }
 *               codigo_cliente: { type: string }
 *               direccion:      { type: string }
 *     responses:
 *       201: { description: Cliente creado }
 *       400: { description: Datos de entrada inválidos }
 */
router.get('/',    getAll)
router.post('/',   validate(clienteCreateSchema), create)

/**
 * @openapi
 * /api/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Obtiene un cliente por id, con sus pedidos
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente encontrado }
 *       404: { description: Cliente no encontrado }
 *   put:
 *     tags: [Clientes]
 *     summary: Actualiza un cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente actualizado }
 *   delete:
 *     tags: [Clientes]
 *     summary: Elimina un cliente
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente eliminado }
 */
router.get('/:id',    getOne)
router.put('/:id',    validate(clienteUpdateSchema), update)
router.delete('/:id', remove)

export default router
