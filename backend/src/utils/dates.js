// Fecha de hoy en formato YYYY-MM-DD (comparable como string con columnas DATE).
// Usa componentes locales, no toISOString(): esa convierte a UTC y en zonas
// horarias negativas adelanta un día durante la tarde/noche.
export const hoyISO = () => {
  const d = new Date()
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// true si iso (YYYY-MM-DD) es una fecha anterior a hoy.
// "hoy" se puede pasar por parámetro para que las pruebas no dependan del reloj
// (principio FIRST: Repeatable); en la app se usa el valor por defecto.
export const esFechaPasada = (iso, hoy = hoyISO()) => !!iso && String(iso).slice(0, 10) < hoy

// Convierte una columna DATE leída de MySQL (mysql2 la entrega como Date en
// medianoche local) a 'YYYY-MM-DD'. No usar .toISOString() directo: convierte
// a UTC y puede desfasar el día según el huso horario del servidor.
export const fechaColumnaISO = (date) => {
  if (!date) return null
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, '0'), d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
