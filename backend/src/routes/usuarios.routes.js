import { Router } from 'express'
import { getAll, getRoles, create, update, toggleEstado } from '../controllers/usuarios.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { usuarioCreateSchema, usuarioUpdateSchema } from '../schemas/usuarios.schema.js'

const router = Router()

/**
 * @openapi
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Lista todos los usuarios del sistema
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de usuarios } }
 *   post:
 *     tags: [Usuarios]
 *     summary: Crea un usuario nuevo
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Usuario creado }, 400: { description: Datos inválidos } }
 */
router.get('/',             getAll)
router.post('/',            validate(usuarioCreateSchema), create)

/**
 * @openapi
 * /api/usuarios/roles:
 *   get:
 *     tags: [Usuarios]
 *     summary: Lista los roles disponibles
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de roles } }
 */
router.get('/roles',        getRoles)

/**
 * @openapi
 * /api/usuarios/{id}:
 *   put:
 *     tags: [Usuarios]
 *     summary: Actualiza un usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Usuario actualizado }, 404: { description: No encontrado } }
 */
router.put('/:id',          validate(usuarioUpdateSchema), update)

/**
 * @openapi
 * /api/usuarios/{id}/estado:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Activa/desactiva un usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Estado actualizado } }
 */
router.patch('/:id/estado', toggleEstado)

export default router
