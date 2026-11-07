import { Router } from 'express'
import { getAll, getByMaquina, create, realizar, remove } from '../controllers/mantenimientos.controller.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'
const lectura = requireModulo(['mantenimientos', 'maquinaria'])
const router = Router()
router.get('/',               lectura, getAll)
router.get('/maquina/:id',    lectura, getByMaquina)
router.post('/',              requireAccion('mantenimientos', 'crear'),    create)
router.patch('/:id/realizar', requireAccion('mantenimientos', 'crear'),    realizar)
router.delete('/:id',         requireAccion('mantenimientos', 'eliminar'), remove)
export default router
