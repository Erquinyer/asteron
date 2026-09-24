// Fecha de hoy en formato YYYY-MM-DD (comparable como string con columnas DATE)
export const hoyISO = () => new Date().toISOString().slice(0, 10)

// true si iso (YYYY-MM-DD) es una fecha anterior a hoy
export const esFechaPasada = (iso) => !!iso && String(iso).slice(0, 10) < hoyISO()
