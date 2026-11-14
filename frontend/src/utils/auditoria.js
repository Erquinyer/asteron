// Resumen legible del detalle de una entrada de la bitácora de auditoría:
// "nombre: Dobladora · estado: activa"
export const resumirDetalle = (detalle) => {
  if (!detalle) return '—'
  if (Array.isArray(detalle.cambios)) return `${detalle.cambios.length} cambio(s) de permisos`
  return Object.entries(detalle)
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => (k.endsWith('_cambiada') ? `${k.replace('_cambiada', '')} cambiada` : `${k}: ${v}`))
    .join(' · ') || '—'
}
