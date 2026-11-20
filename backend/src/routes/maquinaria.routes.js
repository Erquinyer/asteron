import { Router } from 'express'
import { getAll, getOne, create, update, remove } from '../controllers/maquinaria.controller.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'
const lectura = requireModulo(['maquinaria', 'mantenimientos', 'programacion', 'dashboard', 'reportes'])
const router = Router()
router.get('/',      lectura, getAll)
router.get('/:id',   lectura, getOne)
router.post('/',     requireAccion('maquinaria', 'crear'),    create)
router.put('/:id',   requireAccion('maquinaria', 'editar'),   update)
router.delete('/:id', requireAccion('maquinaria', 'eliminar'), remove)
export default router
