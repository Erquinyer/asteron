import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/pedidos.controller.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'
const lectura = requireModulo(['pedidos', 'proyectos'])
const router = Router()
router.get('/',       lectura, getAll)
router.get('/:id',    lectura, getOne)
router.post('/',      requireAccion('pedidos', 'crear'),    create)
router.put('/:id',    requireAccion('pedidos', 'editar'),   update)
router.delete('/:id', requireAccion('pedidos', 'eliminar'), remove)
export default router
