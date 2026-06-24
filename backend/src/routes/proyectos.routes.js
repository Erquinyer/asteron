import { Router } from 'express'
import { getAll, getOne, create, update, remove, updateFase } from '../controllers/proyectos.controller.js'
const router = Router()
router.get('/',                        getAll)
router.get('/:id',                     getOne)
router.post('/',                       create)
router.put('/:id',                     update)
router.delete('/:id',                  remove)
router.patch('/:id/fases/:faseId',     updateFase)
export default router
