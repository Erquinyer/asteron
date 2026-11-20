import { Router } from 'express'
import { getNotificaciones, atenderNotificacion } from '../controllers/notificaciones.controller.js'
const router = Router()
router.get('/', getNotificaciones)
router.post('/:clave/atender', atenderNotificacion)
export default router
