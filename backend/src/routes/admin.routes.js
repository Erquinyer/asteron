import { Router } from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import {
  getPermisos, updateRolPermisos,
  getUsuariosAdmin, updateUsuarioRol,
} from '../controllers/admin.controller.js'

const router = Router()
router.use(requireAdmin)

router.get('/permisos',               getPermisos)
router.put('/roles/:id/permisos',     updateRolPermisos)
router.get('/usuarios',               getUsuariosAdmin)
router.patch('/usuarios/:id/rol',     updateUsuarioRol)

export default router
