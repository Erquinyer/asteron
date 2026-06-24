import pool from '../config/db.js'

// GET /api/admin/permisos
// Returns all roles with their current module list, plus the full modules catalogue
export const getPermisos = async (_req, res) => {
  try {
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

    res.json({
      roles:   roles.map(r => ({ ...r, modulos: byRol[r.id_rol] ?? [] })),
      modulos: modulos.map(m => m.nombre),
    })
  } catch (err) {
    console.error('[admin.getPermisos]', err)
    res.status(500).json({ message: 'Error al obtener permisos' })
  }
}

// PUT /api/admin/roles/:id/permisos
// Body: { modulos: ['dashboard', 'proyectos', ...] }
export const updateRolPermisos = async (req, res) => {
  const { id } = req.params
  const { modulos = [] } = req.body

  // Protect the Administrador Sistema role from being modified
  const [[rol]] = await pool.query('SELECT nombre FROM roles WHERE id_rol = ?', [id])
  if (!rol) return res.status(404).json({ message: 'Rol no encontrado' })
  if (rol.nombre === 'Administrador Sistema') {
    return res.status(403).json({ message: 'Los permisos de Administrador Sistema no se pueden modificar' })
  }

  try {
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

    res.json({ id_rol: Number(id), nombre: rol.nombre, modulos: updated.map(r => r.modulo) })
  } catch (err) {
    console.error('[admin.updateRolPermisos]', err)
    res.status(500).json({ message: 'Error al actualizar permisos' })
  }
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
