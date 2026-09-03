// Formatea una fecha ISO como tiempo relativo en español (ej: "hace 5 min").
export const relativeTime = (iso) => {
  if (!iso) return null
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMin < 1)  return 'hace instantes'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} h`
  const diffD = Math.round(diffH / 24)
  return `hace ${diffD} día${diffD !== 1 ? 's' : ''}`
}
