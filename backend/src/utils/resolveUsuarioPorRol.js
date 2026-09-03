// Resuelve el usuario activo que ocupa un rol determinado (p. ej. para asignar
// automáticamente responsables de fases únicas como Diseño o Compra de materiales).
// Si hay varios usuarios activos con el mismo rol, se toma el de menor id_usuario.
export const resolveUsuarioPorRol = async (pool, nombreRol) => {
  const [[row]] = await pool.query(
    `SELECT u.id_usuario FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     WHERE r.nombre = ? AND u.estado = 1
     ORDER BY u.id_usuario LIMIT 1`,
    [nombreRol])
  return row?.id_usuario ?? null
}
