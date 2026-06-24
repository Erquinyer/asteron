import { Router } from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import {
  getPermisos, updateRolPermisos,
  getAcciones, updateRolAcciones,
  getUsuariosAdmin, updateUsuarioRol,
} from '../controllers/admin.controller.js'

const router = Router()
router.use(requireAdmin)

router.get('/permisos',               getPermisos)
router.put('/roles/:id/permisos',     updateRolPermisos)
router.get('/acciones',               getAcciones)
router.put('/roles/:id/acciones',     updateRolAcciones)
router.get('/usuarios',               getUsuariosAdmin)
router.patch('/usuarios/:id/rol',     updateUsuarioRol)

export default router
