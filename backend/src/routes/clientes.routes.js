import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/clientes.controller.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'
const lectura = requireModulo(['clientes', 'pedidos'])
const router = Router()
router.get('/',              lectura, getAll)
router.get('/:id',           lectura, getOne)
router.post('/',             requireAccion('clientes', 'crear'),    create)
router.put('/:id',           requireAccion('clientes', 'editar'),   update)
router.delete('/:id',        requireAccion('clientes', 'eliminar'), remove)
export default router
