import { Router } from 'express'
import { getStats, getCounts } from '../controllers/dashboard.controller.js'
const router = Router()

/**
 * @openapi
 * /api/dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Estadísticas generales para el panel principal
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Estadísticas del dashboard } }
 */
router.get('/stats',  getStats)

/**
 * @openapi
 * /api/dashboard/counts:
 *   get:
 *     tags: [Dashboard]
 *     summary: Conteos rápidos (proyectos y pedidos pendientes) para el badge del menú
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Conteos rápidos } }
 */
router.get('/counts', getCounts)

export default router
