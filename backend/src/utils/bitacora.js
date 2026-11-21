// Bitácora de auditoría de cambios críticos en usuarios y maquinaria (RNF-22).
//
// Patrón de uso en un controlador:
//   const antes = await fotoUsuario(id)          // estado antes de modificar
//   ...UPDATE...
//   await registrarBitacora({ entidad: 'usuario', id_registro: id, accion: 'editar',
//                             antes, despues: await fotoUsuario(id), autor: req.user.id })
//
// Se guarda solo lo que cambió, como { campo: { antes, despues } }.
import pool from '../config/db.js'

// Foto legible de un usuario: el rol por nombre y nunca el hash de la contraseña
export const fotoUsuario = async (id) => {
  const [[u]] = await pool.query(
    `SELECT u.codigo_empleado, u.nombre, u.correo, r.nombre AS rol,
            IF(u.estado = 1, 'activo', 'inactivo') AS estado
     FROM usuarios u LEFT JOIN roles r ON r.id_rol = u.id_rol
     WHERE u.id_usuario = ?`, [id])
  return u || null
}

// Foto legible de un equipo: el responsable por nombre en vez de su id
export const fotoMaquina = async (id) => {
  const [[m]] = await pool.query(
    `SELECT m.codigo, m.nombre, m.categoria, m.marca, m.referencia, m.serial,
            m.descripcion, m.ubicacion, m.estado, r.nombre AS responsable
     FROM maquinaria m LEFT JOIN usuarios r ON r.id_usuario = m.id_responsable
     WHERE m.id_maquina = ?`, [id])
  return m || null
}

// Compara dos fotos y devuelve solo los campos que cambiaron
const diferencias = (antes, despues) => {
  const cambios = {}
  for (const campo of new Set([...Object.keys(antes || {}), ...Object.keys(despues || {})])) {
    const a = antes?.[campo] ?? null
    const d = despues?.[campo] ?? null
    if (String(a ?? '') !== String(d ?? '')) cambios[campo] = { antes: a, despues: d }
  }
  return cambios
}

/**
 * Registra un cambio en la bitácora.
 * @param {object} p
 * @param {'usuario'|'maquinaria'} p.entidad
 * @param {number} p.id_registro  id del usuario o equipo afectado
 * @param {'crear'|'editar'|'estado'|'contrasena'|'eliminar'} p.accion
 * @param {object|null} p.antes    foto previa (null al crear)
 * @param {object|null} p.despues  foto posterior (null al eliminar)
 * @param {number|null} p.autor    id del usuario que hizo el cambio
 * @param {string} [p.detalle]     contexto adicional, p. ej. "Mantenimiento correctivo #12"
 *
 * Una falla al escribir la bitácora se reporta en el log pero no revierte el cambio ya
 * hecho: la operación del usuario no debe fallar por la auditoría.
 */
export const registrarBitacora = async ({ entidad, id_registro, accion, antes = null, despues = null, autor = null, detalle = null }) => {
  try {
    // El cambio de contraseña no expone campos: solo queda constancia de quién y cuándo
    const cambios = accion === 'contrasena' ? {} : diferencias(antes, despues)
    // Una edición que no cambió nada no se registra
    if (accion === 'editar' && Object.keys(cambios).length === 0) return

    await pool.query(
      `INSERT INTO bitacora_auditoria (entidad, id_registro, nombre_registro, accion, cambios, detalle, id_autor, fecha)
       VALUES (?,?,?,?,?,?,?,?)`,
      [entidad, id_registro, (despues || antes)?.nombre ?? null, accion,
       JSON.stringify(cambios), detalle, autor, new Date()])
  } catch (err) {
    console.error('[bitacora]', err)
  }
}
