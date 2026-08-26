import pool from '../config/db.js'

// Rol protegido: no se puede editar, eliminar ni reasignar desde ningún endpoint de admin
export const ROL_INMUTABLE = 'Administrador Sistema'

const assertRolEditable = (rol) => {
  if (!rol) return { status: 404, message: 'Rol no encontrado' }
  if (rol.nombre === ROL_INMUTABLE) {
    return { status: 403, message: `No se puede modificar el rol ${ROL_INMUTABLE}` }
  }
  return null
}

// Catálogo de módulos y acciones soportadas por cada uno (espejo del frontend,
// usado para validar el body de guardarPermisosLote antes de tocar la BD)
const MODULO_ACCIONES = {
  dashboard:      [],
  proyectos:      ['crear', 'editar', 'eliminar'],
  pedidos:        ['crear', 'editar', 'eliminar'],
  clientes:       ['crear', 'editar', 'eliminar'],
  maquinaria:     ['crear', 'editar', 'eliminar'],
  mantenimientos: ['crear', 'eliminar'],
  programacion:   ['crear', 'editar', 'eliminar'],
  usuarios:       ['crear', 'editar', 'eliminar'],
}

// GET /api/admin/usuarios
// Returns users with their role info (for the role assignment tab)
export const getUsuariosAdmin = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id_usuario, u.codigo_empleado, u.nombre, u.correo, u.estado,
             u.id_rol, r.nombre AS rol
      FROM usuarios u
      LEFT JOIN roles r ON u.id_rol = r.id_rol
      ORDER BY u.codigo_empleado`)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuarios' })
  }
}

// GET /api/admin/acciones
// Returns roles with their module-access and action-level permissions
export const getAcciones = async (_req, res) => {
  try {
    const [roles]    = await pool.query('SELECT id_rol, nombre, descripcion FROM roles ORDER BY id_rol')
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

    res.json({
      roles: roles.map(r => ({
        ...r,
        modulos:  modByRol[r.id_rol]  ?? [],
        acciones: accByRol[r.id_rol]  ?? {},
      })),
    })
  } catch (err) {
    console.error('[admin.getAcciones]', err)
    res.status(500).json({ message: 'Error al obtener acciones' })
  }
}

// PUT /api/admin/permisos/lote
// Body: { cambios: [{ id_rol, modulo, acceso, crear, editar, eliminar }] }
// Reemplaza el guardado checkbox-por-checkbox: un solo request, una sola transacción.
export const guardarPermisosLote = async (req, res) => {
  const { cambios } = req.body
  if (!Array.isArray(cambios) || cambios.length === 0) {
    return res.status(400).json({ message: 'cambios debe ser un arreglo no vacío' })
  }

  // Validación de forma + catálogo (módulo/acción válidos) antes de tocar la BD
  const idsRol = new Set()
  for (const c of cambios) {
    const { id_rol, modulo } = c
    if (!id_rol || !modulo) {
      return res.status(400).json({ message: 'Cada cambio requiere id_rol y modulo' })
    }
    if (!Object.prototype.hasOwnProperty.call(MODULO_ACCIONES, modulo)) {
      return res.status(400).json({ message: `Módulo desconocido: ${modulo}` })
    }
    const permitidas = MODULO_ACCIONES[modulo]
    for (const accion of ['crear', 'editar', 'eliminar']) {
      if (c[accion] && !permitidas.includes(accion)) {
        return res.status(400).json({ message: `El módulo ${modulo} no soporta la acción ${accion}` })
      }
    }
    idsRol.add(Number(id_rol))
  }

  // Ningún rol del lote puede ser el rol inmutable
  const [rolesRows] = await pool.query(
    `SELECT id_rol, nombre FROM roles WHERE id_rol IN (?)`, [[...idsRol]])
  const rolesById = new Map(rolesRows.map(r => [r.id_rol, r]))
  for (const id_rol of idsRol) {
    const err = assertRolEditable(rolesById.get(id_rol))
    if (err) return res.status(err.status).json({ message: err.message })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    for (const c of cambios) {
      const id_rol  = Number(c.id_rol)
      const modulo  = c.modulo
      // Coherencia: cualquier acción en true implica acceso=true; sin acceso, no hay acciones
      const acceso  = !!(c.acceso || c.crear || c.editar || c.eliminar)
      const accionesFinales = acceso
        ? ['crear', 'editar', 'eliminar'].filter(a => c[a])
        : []

      if (acceso) {
        await conn.query(
          `INSERT IGNORE INTO roles_permisos (id_rol, id_permiso)
           SELECT ?, id_permiso FROM permisos WHERE nombre = ?`,
          [id_rol, modulo])
      } else {
        await conn.query(
          `DELETE rp FROM roles_permisos rp
           JOIN permisos p ON p.id_permiso = rp.id_permiso
           WHERE rp.id_rol = ? AND p.nombre = ?`,
          [id_rol, modulo])
      }

      await conn.query('DELETE FROM acciones_modulo WHERE id_rol = ? AND modulo = ?', [id_rol, modulo])
      if (accionesFinales.length > 0) {
        const values = accionesFinales.map(a => [id_rol, modulo, a])
        await conn.query('INSERT INTO acciones_modulo (id_rol, modulo, accion) VALUES ?', [values])
      }
    }

    await conn.commit()
    res.json({ message: 'Permisos actualizados', cambios: cambios.length })
  } catch (err) {
    await conn.rollback()
    console.error('[admin.guardarPermisosLote]', err)
    res.status(500).json({ message: 'Error al guardar permisos' })
  } finally {
    conn.release()
  }
}

// GET /api/admin/roles — list all roles with user count
export const getRoles = async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.id_rol, r.nombre, r.descripcion,
             COUNT(u.id_usuario) AS total_usuarios
      FROM roles r
      LEFT JOIN usuarios u ON u.id_rol = r.id_rol
      GROUP BY r.id_rol
      ORDER BY r.id_rol`)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener roles' })
  }
}

// POST /api/admin/roles — create role
export const createRol = async (req, res) => {
  const { nombre, descripcion = '' } = req.body
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })
  try {
    const [result] = await pool.query(
      'INSERT INTO roles (nombre, descripcion) VALUES (?,?)',
      [nombre.trim(), descripcion.trim()])
    const [[rol]] = await pool.query(
      'SELECT id_rol, nombre, descripcion FROM roles WHERE id_rol = ?', [result.insertId])
    res.status(201).json({ ...rol, total_usuarios: 0 })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un rol con ese nombre' })
    res.status(500).json({ message: 'Error al crear rol' })
  }
}

// PUT /api/admin/roles/:id — update role name/description
export const updateRol = async (req, res) => {
  const { id } = req.params
  const { nombre, descripcion } = req.body
  if (!nombre?.trim()) return res.status(400).json({ message: 'El nombre es requerido' })

  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  const editErr = assertRolEditable(rol)
  if (editErr) return res.status(editErr.status).json({ message: editErr.message })
  try {
    await pool.query('UPDATE roles SET nombre=?, descripcion=? WHERE id_rol=?',
      [nombre.trim(), descripcion?.trim() ?? '', id])
    const [[updated]] = await pool.query(
      `SELECT r.id_rol, r.nombre, r.descripcion, COUNT(u.id_usuario) AS total_usuarios
       FROM roles r LEFT JOIN usuarios u ON u.id_rol = r.id_rol
       WHERE r.id_rol = ? GROUP BY r.id_rol`, [id])
    res.json(updated)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un rol con ese nombre' })
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
}

// DELETE /api/admin/roles/:id — delete role (only if no users assigned)
export const deleteRol = async (req, res) => {
  const { id } = req.params
  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  const editErr = assertRolEditable(rol)
  if (editErr) return res.status(editErr.status).json({ message: editErr.message })
  const [[{ cnt }]] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM usuarios WHERE id_rol = ?', [id])
  if (cnt > 0) {
    return res.status(409).json({ message: `No se puede eliminar: ${cnt} usuario(s) tienen este rol` })
  }
  try {
    await pool.query('DELETE FROM roles WHERE id_rol = ?', [id])
    res.json({ message: 'Rol eliminado' })
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar rol' })
  }
}

// PATCH /api/admin/usuarios/:id/rol
// Body: { id_rol: 3 }
export const updateUsuarioRol = async (req, res) => {
  const { id }     = req.params
  const { id_rol } = req.body
  if (!id_rol) return res.status(400).json({ message: 'id_rol es requerido' })

  // Don't allow changing the admin user's role
  const [[u]] = await pool.query('SELECT codigo_empleado FROM usuarios WHERE id_usuario = ?', [id])
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' })
  if (u.codigo_empleado === 'EMP-000') {
    return res.status(403).json({ message: 'No se puede cambiar el rol del Administrador Sistema' })
  }

  try {
    await pool.query('UPDATE usuarios SET id_rol = ? WHERE id_usuario = ?', [id_rol, id])
    const [[updated]] = await pool.query(`
      SELECT u.id_usuario, u.nombre, u.correo, u.id_rol, r.nombre AS rol
      FROM usuarios u LEFT JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = ?`, [id])
    res.json(updated)
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar rol' })
  }
}
