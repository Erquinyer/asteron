import { Router } from 'express'
import { getAll, getRoles, create, update, toggleEstado } from '../controllers/usuarios.controller.js'
import { requireAccion } from '../middlewares/requireModulo.js'
const router = Router()
// La lista se usa en varios formularios (responsables, operarios), así que basta con estar autenticado
router.get('/',          getAll)
router.get('/roles',     getRoles)
// Desactivar un usuario es una edición: en la interfaz el botón depende de "editar"
router.post('/',            requireAccion('usuarios', 'crear'),  create)
router.put('/:id',          requireAccion('usuarios', 'editar'), update)
router.patch('/:id/estado', requireAccion('usuarios', 'editar'), toggleEstado)
export default router
