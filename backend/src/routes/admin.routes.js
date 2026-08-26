import { Router } from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import {
  getAcciones, guardarPermisosLote,
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

// Permissions — lectura de matriz + guardado en lote
router.get('/acciones',               getAcciones)
router.put('/permisos/lote',          guardarPermisosLote)

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
