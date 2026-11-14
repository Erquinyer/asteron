// ============================================================
// Bitácora de auditoría de cambios críticos (RNF-22).
//
// Registra quién hizo qué y cuándo sobre usuarios, roles, permisos y maquinaria.
// Los cambios de fases y de tiempos ya tienen su propio historial
// (historial_fases y correcciones_tiempo).
//
// Es "mejor esfuerzo": si el registro falla, se informa en el log del servidor
// pero la operación del usuario NO se cae por eso.
// ============================================================
import pool from '../config/db.js'

// Campos que nunca deben quedar en la bitácora
const CAMPOS_PRIVADOS = new Set(['password', 'password_hash', 'contrasena', 'nuevaContrasena', 'actual', 'nueva', 'token'])

const limpiar = (datos) => {
  if (!datos || typeof datos !== 'object') return null
  const limpio = {}
  for (const [k, v] of Object.entries(datos)) {
    if (CAMPOS_PRIVADOS.has(k)) {
      if (v) limpio[`${k}_cambiada`] = true
      continue
    }
    if (v !== undefined) limpio[k] = v
  }
  return limpio
}

export const registrarAuditoria = async (req, { modulo, accion, idRegistro = null, detalle = null }) => {
  try {
    await pool.query(
      `INSERT INTO auditoria (id_usuario, rol, modulo, accion, id_registro, detalle, ip)
       VALUES (?,?,?,?,?,?,?)`,
      [req.user?.id ?? null, req.user?.rol ?? null, modulo, accion,
       idRegistro != null ? Number(idRegistro) : null,
       detalle ? JSON.stringify(limpiar(detalle)) : null,
       req.ip ?? null])
  } catch (err) {
    console.error('[auditoria]', err)
  }
}

// GET /api/admin/auditoria — últimas entradas, filtrables por módulo
export const listarAuditoria = async (req, res) => {
  const limite = Math.min(Number.parseInt(req.query.limite, 10) || 200, 500)
  const params = []
  let filtro = ''
  if (req.query.modulo) { filtro = 'WHERE a.modulo = ?'; params.push(req.query.modulo) }
  try {
    const [rows] = await pool.query(
      `SELECT a.id_auditoria, a.fecha, a.modulo, a.accion, a.id_registro, a.detalle, a.rol,
              u.nombre AS usuario, u.correo
       FROM auditoria a
       LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
       ${filtro}
       ORDER BY a.fecha DESC, a.id_auditoria DESC
       LIMIT ?`, [...params, limite])
    res.json(rows.map(r => ({ ...r, detalle: typeof r.detalle === 'string' ? JSON.parse(r.detalle) : r.detalle })))
  } catch (err) {
    console.error('[auditoria.listar]', err)
    res.status(500).json({ message: 'Error al obtener la bitácora' })
  }
}
