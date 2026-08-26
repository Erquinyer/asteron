// Iniciales de un nombre para avatares (hasta 2 letras). Usado por los
// avatares nuevos del rediseño de Dashboard/Administración.
export const initials = (nombre) =>
  (nombre || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
