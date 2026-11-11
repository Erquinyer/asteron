import { Router } from 'express'
import { getAll, getRoles, create, update, toggleEstado } from '../controllers/usuarios.controller.js'
import { requireModulo } from '../middlewares/requireModulo.js'
const router = Router()
// La lista se usa en varios formularios (responsables, operarios), así que basta con estar autenticado
router.get('/',          getAll)
router.get('/roles',     getRoles)
// Crear, editar o desactivar usuarios exige el permiso del módulo "usuarios"
router.post('/',            requireModulo('usuarios'), create)
router.put('/:id',          requireModulo('usuarios'), update)
router.patch('/:id/estado', requireModulo('usuarios'), toggleEstado)
export default router
