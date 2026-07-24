import { Router } from 'express'
import { requireAdmin } from '../middlewares/requireAdmin.js'
import { validate } from '../middlewares/validate.middleware.js'
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
import {
  rolCreateSchema, rolUpdateSchema, rolPermisosSchema,
  rolAccionesSchema, usuarioRolSchema,
} from '../schemas/admin.schema.js'
import { usuarioCreateSchema, usuarioUpdateSchema } from '../schemas/usuarios.schema.js'

const router = Router()
router.use(requireAdmin)

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Panel de administración (solo rol Administrador Sistema)
 * /api/admin/permisos:
 *   get:
 *     tags: [Admin]
 *     summary: Lista roles con sus módulos habilitados + catálogo de módulos
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Permisos por rol } }
 */
router.get('/permisos',               getPermisos)

/**
 * @openapi
 * /api/admin/roles/{id}/permisos:
 *   put:
 *     tags: [Admin]
 *     summary: Reemplaza los módulos habilitados de un rol
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Permisos actualizados }, 403: { description: Rol protegido } }
 */
router.put('/roles/:id/permisos',     validate(rolPermisosSchema), updateRolPermisos)

/**
 * @openapi
 * /api/admin/acciones:
 *   get:
 *     tags: [Admin]
 *     summary: Lista roles con módulos y acciones permitidas por módulo
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Acciones por rol } }
 */
router.get('/acciones',               getAcciones)

/**
 * @openapi
 * /api/admin/roles/{id}/acciones:
 *   put:
 *     tags: [Admin]
 *     summary: Reemplaza las acciones permitidas de un rol en un módulo
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Acciones actualizadas } }
 */
router.put('/roles/:id/acciones',     validate(rolAccionesSchema), updateRolAcciones)

/**
 * @openapi
 * /api/admin/roles:
 *   get:
 *     tags: [Admin]
 *     summary: Lista roles con conteo de usuarios
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de roles } }
 *   post:
 *     tags: [Admin]
 *     summary: Crea un nuevo rol
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Rol creado }, 409: { description: Nombre duplicado } }
 */
router.get('/roles',                  getRoles)
router.post('/roles',                 validate(rolCreateSchema), createRol)

/**
 * @openapi
 * /api/admin/roles/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Actualiza nombre/descripción de un rol
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Rol actualizado } }
 *   delete:
 *     tags: [Admin]
 *     summary: Elimina un rol (solo si no tiene usuarios asignados)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Rol eliminado }, 409: { description: Rol con usuarios asignados } }
 */
router.put('/roles/:id',              validate(rolUpdateSchema), updateRol)
router.delete('/roles/:id',           deleteRol)

/**
 * @openapi
 * /api/admin/usuarios:
 *   get:
 *     tags: [Admin]
 *     summary: Lista usuarios con su rol (para la pestaña de asignación de roles)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Lista de usuarios } }
 *   post:
 *     tags: [Admin]
 *     summary: Crea un usuario desde el panel de administración
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Usuario creado } }
 */
router.get('/usuarios',               getUsuariosAdmin)
router.post('/usuarios',              validate(usuarioCreateSchema), createUsuario)

/**
 * @openapi
 * /api/admin/usuarios/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Actualiza un usuario desde el panel de administración
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Usuario actualizado } }
 */
router.put('/usuarios/:id',           validate(usuarioUpdateSchema), updateUsuario)

/**
 * @openapi
 * /api/admin/usuarios/{id}/rol:
 *   patch:
 *     tags: [Admin]
 *     summary: Cambia el rol asignado a un usuario
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Rol actualizado }, 403: { description: Usuario protegido } }
 */
router.patch('/usuarios/:id/rol',     validate(usuarioRolSchema), updateUsuarioRol)

/**
 * @openapi
 * /api/admin/usuarios/{id}/toggle:
 *   patch:
 *     tags: [Admin]
 *     summary: Activa/desactiva un usuario desde el panel de administración
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Estado actualizado } }
 */
router.patch('/usuarios/:id/toggle',  toggleUsuario)

export default router
