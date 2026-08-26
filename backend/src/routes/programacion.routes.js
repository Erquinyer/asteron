import { Router } from 'express'
import { getAll, create, updateEstado, updateAvance, remove } from '../controllers/programacion.controller.js'
const router = Router()
router.get('/',               getAll)
router.post('/',              create)
router.patch('/:id/estado',   updateEstado)
router.patch('/:id/avance',   updateAvance)
router.delete('/:id',         remove)
export default router
