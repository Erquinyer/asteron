import { Router } from 'express'
import { getAll, getOne, create, update, remove, updateFase } from '../controllers/proyectos.controller.js'
import { requireModulo, requireAccion } from '../middlewares/requireModulo.js'
const lectura = requireModulo(['proyectos', 'programacion', 'dashboard', 'reportes'])
const router = Router()
router.get('/',                        lectura, getAll)
router.get('/:id',                     lectura, getOne)
router.post('/',                       requireAccion('proyectos', 'crear'),    create)
router.put('/:id',                     requireAccion('proyectos', 'editar'),   update)
router.delete('/:id',                  requireAccion('proyectos', 'eliminar'), remove)
// El permiso de updateFase se valida en el controlador: la persona asignada a
// una fase única (Diseño, Compra) puede gestionarla aunque su rol no tenga "editar".
router.patch('/:id/fases/:faseId',     requireModulo('proyectos'), updateFase)
export default router
