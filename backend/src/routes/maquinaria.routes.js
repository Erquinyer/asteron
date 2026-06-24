import { Router } from 'express'
import { getAll, getOne, create, update, remove, getVista } from '../controllers/maquinaria.controller.js'
const router = Router()
router.get('/vista', getVista)
router.get('/',      getAll)
router.get('/:id',   getOne)
router.post('/',     create)
router.put('/:id',   update)
router.delete('/:id', remove)
export default router
