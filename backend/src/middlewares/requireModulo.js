import pool from '../config/db.js'

// Autoriza según los permisos del rol (tabla roles_permisos), los mismos que el
// frontend usa para mostrar u ocultar cada módulo. Sin este chequeo, el API solo
// exigía estar autenticado y cualquier rol podía usar endpoints que la interfaz le oculta.
// El Administrador Sistema siempre tiene acceso.
export const requireModulo = (modulo) => async (req, res, next) => {
  if (req.user?.rol === 'Administrador Sistema') return next()

  try {
    const [[permiso]] = await pool.query(
      `SELECT 1 AS permitido
       FROM roles_permisos rp
       JOIN roles    r ON r.id_rol     = rp.id_rol
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE r.nombre = ? AND p.nombre = ?
       LIMIT 1`,
      [req.user?.rol, modulo])

    if (!permiso) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' })
    }
    next()
  } catch (err) {
    console.error('[requireModulo]', err)
    res.status(500).json({ message: 'Error interno del servidor' })
  }
}
