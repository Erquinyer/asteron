import { Router } from 'express'
import { getAll, getByMaquina, create, remove } from '../controllers/mantenimientos.controller.js'
const router = Router()
router.get('/',               getAll)
router.get('/maquina/:id',    getByMaquina)
router.post('/',              create)
router.delete('/:id',         remove)
export default router
