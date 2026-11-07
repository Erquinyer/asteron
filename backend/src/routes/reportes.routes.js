import { Router } from 'express'
import { getHoras, getAvance, getMantenimientos, exportar } from '../controllers/reportes.controller.js'
import { requireModulo } from '../middlewares/requireModulo.js'
const router = Router()
router.use(requireModulo('reportes'))
router.get('/horas',           getHoras)
router.get('/avance',          getAvance)
router.get('/mantenimientos',  getMantenimientos)
router.get('/:tipo/exportar',  exportar)
export default router
