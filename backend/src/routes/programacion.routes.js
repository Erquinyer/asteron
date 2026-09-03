import { Router } from 'express'
import { getAll, getOcupados, getByFase, create, updateEstado, updateAvance, remove } from '../controllers/programacion.controller.js'
import { requirePlantScheduler } from '../middlewares/requirePlantScheduler.js'
const router = Router()
router.get('/ocupados',       getOcupados)
router.get('/fase/:idFase',   getByFase)
router.get('/',               getAll)
router.post('/',              requirePlantScheduler, create)
router.patch('/:id/estado',   requirePlantScheduler, updateEstado)
router.patch('/:id/avance',   requirePlantScheduler, updateAvance)
router.delete('/:id',         requirePlantScheduler, remove)
export default router
