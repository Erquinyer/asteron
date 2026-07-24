import pool from '../config/db.js'
import { ok, fail } from '../utils/apiResponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'

// GET /api/admin/permisos
export const getPermisos = asyncHandler(async (_req, res) => {
  const [roles]   = await pool.query('SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol')
  const [modulos] = await pool.query('SELECT id_permiso, nombre, descripcion FROM permisos ORDER BY id_permiso')
  const [assign]  = await pool.query(`
    SELECT rp.id_rol, p.nombre AS modulo
    FROM roles_permisos rp
    JOIN permisos p ON p.id_permiso = rp.id_permiso`)

  const byRol = {}
  for (const { id_rol, modulo } of assign) {
    if (!byRol[id_rol]) byRol[id_rol] = []
    byRol[id_rol].push(modulo)
  }

  ok(res, {
    roles:   roles.map(r => ({ ...r, modulos: byRol[r.id_rol] ?? [] })),
    modulos: modulos.map(m => m.nombre),
  }, 'Permisos obtenidos correctamente')
})

// PUT /api/admin/roles/:id/permisos — req.body validado por rolPermisosSchema
export const updateRolPermisos = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { modulos = [] } = req.body

  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  if (!rol) return fail(res, 'Rol no encontrado', 404)
  if (rol.nombre === 'Administrador Sistema') {
    return fail(res, 'Los permisos de Administrador Sistema no se pueden modificar', 403)
  }

  await pool.query('DELETE FROM roles_permisos WHERE id_rol = ?', [id])

  if (modulos.length > 0) {
    await pool.query(
      `INSERT INTO roles_permisos (id_rol, id_permiso)
       SELECT ?, id_permiso FROM permisos WHERE nombre IN (?)`,
      [id, modulos])
  }

  const [updated] = await pool.query(`
    SELECT p.nombre AS modulo FROM permisos p
    JOIN roles_permisos rp ON p.id_permiso = rp.id_permiso
    WHERE rp.id_rol = ?`, [id])

  ok(res, { id_rol: Number(id), nombre: rol.nombre, modulos: updated.map(r => r.modulo) }, 'Permisos actualizados correctamente')
})

// GET /api/admin/usuarios
export const getUsuariosAdmin = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado,
           u.id_rol, r.nombre AS rol
    FROM usuarios u
    LEFT JOIN roles r ON u.id_rol = r.id_rol
    ORDER BY u.codigo_empleado`)
  ok(res, rows, 'Usuarios obtenidos correctamente')
})

// GET /api/admin/acciones
export const getAcciones = asyncHandler(async (_req, res) => {
  const [roles]     = await pool.query('SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol')
  const [modAccess] = await pool.query(`
    SELECT rp.id_rol, p.nombre AS modulo
    FROM roles_permisos rp
    JOIN permisos p ON p.id_permiso = rp.id_permiso`)
  const [accionRows] = await pool.query(
    'SELECT id_rol, modulo, accion FROM acciones_modulo ORDER BY id_rol, modulo, accion')

  const modByRol = {}
  for (const { id_rol, modulo } of modAccess) {
    if (!modByRol[id_rol]) modByRol[id_rol] = []
    modByRol[id_rol].push(modulo)
  }
  const accByRol = {}
  for (const { id_rol, modulo, accion } of accionRows) {
    if (!accByRol[id_rol]) accByRol[id_rol] = {}
    if (!accByRol[id_rol][modulo]) accByRol[id_rol][modulo] = []
    accByRol[id_rol][modulo].push(accion)
  }

  ok(res, {
    roles: roles.map(r => ({
      ...r,
      modulos:  modByRol[r.id_rol]  ?? [],
      acciones: accByRol[r.id_rol]  ?? {},
    })),
  }, 'Acciones obtenidas correctamente')
})

// PUT /api/admin/roles/:id/acciones — req.body validado por rolAccionesSchema
export const updateRolAcciones = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { modulo, acciones = [] } = req.body

  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  if (!rol) return fail(res, 'Rol no encontrado', 404)
  if (rol.nombre === 'Administrador Sistema') {
    return fail(res, 'No se pueden modificar acciones del Administrador Sistema', 403)
  }

  await pool.query('DELETE FROM acciones_modulo WHERE id_rol = ? AND modulo = ?', [id, modulo])
  if (acciones.length > 0) {
    const values = acciones.map(a => [Number(id), modulo, a])
    await pool.query('INSERT INTO acciones_modulo (id_rol, modulo, accion) VALUES ?', [values])
  }
  ok(res, { modulo, acciones }, 'Acciones actualizadas correctamente')
})

// GET /api/admin/roles
export const getRoles = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT r.id_rol, r.nombre, r.descripcion,
           COUNT(u.id_usuario) AS total_usuarios
    FROM roles r
    LEFT JOIN usuarios u ON u.id_rol = r.id_rol
    GROUP BY r.id_rol
    ORDER BY r.id_rol`)
  ok(res, rows, 'Roles obtenidos correctamente')
})

// POST /api/admin/roles — req.body validado por rolCreateSchema
export const createRol = asyncHandler(async (req, res) => {
  const { nombre, descripcion = '' } = req.body
  const [result] = await pool.query(
    'INSERT INTO roles (nombre, descripcion) VALUES (?,?)',
    [nombre.trim(), descripcion.trim()])
  const [[rol]] = await pool.query(
    'SELECT id_rol, nombre, descripcion FROM roles WHERE id_rol = ?', [result.insertId])
  ok(res, { ...rol, total_usuarios: 0 }, 'Rol creado correctamente', 201)
})

// PUT /api/admin/roles/:id — req.body validado por rolUpdateSchema
export const updateRol = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion } = req.body

  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  if (!rol) return fail(res, 'Rol no encontrado', 404)
  if (rol.nombre === 'Administrador Sistema') {
    return fail(res, 'No se puede modificar el Administrador Sistema', 403)
  }

  await pool.query('UPDATE roles SET nombre=?, descripcion=? WHERE id_rol=?',
    [nombre.trim(), descripcion?.trim() ?? '', id])
  const [[updated]] = await pool.query(
    `SELECT r.id_rol, r.nombre, r.descripcion, COUNT(u.id_usuario) AS total_usuarios
     FROM roles r LEFT JOIN usuarios u ON u.id_rol = r.id_rol
     WHERE r.id_rol = ? GROUP BY r.id_rol`, [id])
  ok(res, updated, 'Rol actualizado correctamente')
})

// DELETE /api/admin/roles/:id
export const deleteRol = asyncHandler(async (req, res) => {
  const { id } = req.params
  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  if (!rol) return fail(res, 'Rol no encontrado', 404)
  if (rol.nombre === 'Administrador Sistema') {
    return fail(res, 'No se puede eliminar el Administrador Sistema', 403)
  }
  const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM usuarios WHERE id_rol = ?', [id])
  if (cnt > 0) {
    return fail(res, `No se puede eliminar: ${cnt} usuario(s) tienen este rol`, 409)
  }
  await pool.query('DELETE FROM roles WHERE id_rol = ?', [id])
  ok(res, null, 'Rol eliminado correctamente')
})

// PATCH /api/admin/usuarios/:id/rol — req.body validado por usuarioRolSchema
export const updateUsuarioRol = asyncHandler(async (req, res) => {
  const { id }     = req.params
  const { id_rol } = req.body

  const [[u]] = await pool.query('SELECT codigo_empleado FROM usuarios WHERE id_usuario = ?', [id])
  if (!u) return fail(res, 'Usuario no encontrado', 404)
  if (u.codigo_empleado === 'EMP-000') {
    return fail(res, 'No se puede cambiar el rol del Administrador Sistema', 403)
  }

  await pool.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [id_rol, id])
  const [[updated]] = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.correo, u.id_rol, r.nombre AS rol
    FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = ?`, [id])
  ok(res, updated, 'Rol de usuario actualizado correctamente')
})
