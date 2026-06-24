import { Router } from 'express'
import { getAll, getRoles, create, update, toggleEstado } from '../controllers/usuarios.controller.js'
const router = Router()
router.get('/',          getAll)
router.get('/roles',     getRoles)
router.post('/',         create)
router.put('/:id',       update)
router.patch('/:id/estado', toggleEstado)
export default router
