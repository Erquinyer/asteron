import { Router } from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import {
  getPermisos, updateRolPermisos,
  getAcciones, updateRolAcciones,
  getUsuariosAdmin, updateUsuarioRol,
  getRoles, createRol, updateRol, deleteRol,
} from '../controllers/admin.controller.js'
import {
  create as createUsuario,
  update as updateUsuario,
  toggleEstado as toggleUsuario,
} from '../controllers/usuarios.controller.js'

const router = Router()
router.use(requireAdmin)

// Permissions
router.get('/permisos',               getPermisos)
router.put('/roles/:id/permisos',     updateRolPermisos)
router.get('/acciones',               getAcciones)
router.put('/roles/:id/acciones',     updateRolAcciones)

// Roles CRUD
router.get('/roles',                  getRoles)
router.post('/roles',                 createRol)
router.put('/roles/:id',              updateRol)
router.delete('/roles/:id',           deleteRol)

// Users management
router.get('/usuarios',               getUsuariosAdmin)
router.post('/usuarios',              createUsuario)
router.put('/usuarios/:id',           updateUsuario)
router.patch('/usuarios/:id/rol',     updateUsuarioRol)
router.patch('/usuarios/:id/toggle',  toggleUsuario)

export default router
