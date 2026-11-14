import pool from '../config/db.js'
import { responderError } from '../utils/errores.js'

// Autoriza según los permisos del rol (tablas roles_permisos y acciones_modulo),
// los mismos que el frontend usa para mostrar u ocultar módulos y botones. Sin este
// chequeo, el API solo exigía estar autenticado y cualquier rol podía usar endpoints
// que la interfaz le oculta. El Administrador Sistema siempre tiene acceso.
const ADMIN = 'Administrador Sistema'
const SIN_PERMISO = { message: 'No tienes permiso para realizar esta acción' }

// Lecturas: basta con tener acceso a uno de los módulos indicados. Varias pantallas
// consultan catálogos de otros módulos (ej. Programación lista usuarios y maquinaria),
// por eso se acepta una lista.
export const requireModulo = (modulos) => async (req, res, next) => {
  if (req.user?.rol === ADMIN) return next()

  try {
    const [[permiso]] = await pool.query(
      `SELECT 1 AS permitido
       FROM roles_permisos rp
       JOIN roles    r ON r.id_rol     = rp.id_rol
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE r.nombre = ? AND p.nombre IN (?)
       LIMIT 1`,
      [req.user?.rol, [].concat(modulos)])

    if (!permiso) return res.status(403).json(SIN_PERMISO)
    next()
  } catch (err) {
    responderError(res, err, { contexto: 'requireModulo', mensaje: 'Error interno del servidor' })
  }
}

export const tieneAccion = async (rol, modulo, accion) => {
  if (rol === ADMIN) return true
  const [[permiso]] = await pool.query(
    `SELECT 1 AS permitido
     FROM acciones_modulo a
     JOIN roles r ON r.id_rol = a.id_rol
     WHERE r.nombre = ? AND a.modulo = ? AND a.accion = ?
     LIMIT 1`,
    [rol, modulo, accion])
  return Boolean(permiso)
}

// Escrituras: exige la acción puntual (crear / editar / eliminar) sobre el módulo.
export const requireAccion = (modulo, accion) => async (req, res, next) => {
  try {
    if (!await tieneAccion(req.user?.rol, modulo, accion)) {
      return res.status(403).json(SIN_PERMISO)
    }
    next()
  } catch (err) {
    responderError(res, err, { contexto: 'requireAccion', mensaje: 'Error interno del servidor' })
  }
}
