import { Router } from 'express'
import { getAll, getOne, create, update, remove, getProcedimiento } from '../controllers/clientes.controller.js'
const router = Router()
router.get('/procedimiento', getProcedimiento)
router.get('/',              getAll)
router.get('/:id',           getOne)
router.post('/',             create)
router.put('/:id',           update)
router.delete('/:id',        remove)
export default router
