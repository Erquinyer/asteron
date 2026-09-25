import { Router } from 'express'
import { getAll, getByMaquina, create, remove, update } from '../controllers/mantenimientos.controller.js'
const router = Router()
router.get('/',               getAll)
router.get('/maquina/:id',    getByMaquina)
router.post('/',              create)
router.put('/:id',            update)
router.delete('/:id',         remove)
export default router