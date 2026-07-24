import { Router } from 'express'
import { getNotificaciones } from '../controllers/notificaciones.controller.js'
const router = Router()

/**
 * @openapi
 * /api/notificaciones:
 *   get:
 *     tags: [Notificaciones]
 *     summary: Genera alertas en base al estado actual de proyectos, máquinas y pedidos
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de notificaciones } }
 */
router.get('/', getNotificaciones)

export default router
