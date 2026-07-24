import { Router } from 'express'
import { getPerfil, updatePerfil, changePassword } from '../controllers/perfil.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { perfilUpdateSchema, changePasswordSchema } from '../schemas/perfil.schema.js'

const router = Router()

/**
 * @openapi
 * /api/perfil:
 *   get:
 *     tags: [Perfil]
 *     summary: Obtiene el perfil del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Perfil del usuario } }
 *   put:
 *     tags: [Perfil]
 *     summary: Actualiza el nombre del perfil
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Perfil actualizado } }
 */
router.get('/',           getPerfil)
router.put('/',           validate(perfilUpdateSchema), updatePerfil)

/**
 * @openapi
 * /api/perfil/password:
 *   patch:
 *     tags: [Perfil]
 *     summary: Cambia la contraseña del usuario autenticado
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Contraseña actualizada }, 401: { description: Contraseña actual incorrecta } }
 */
router.patch('/password', validate(changePasswordSchema), changePassword)

export default router
