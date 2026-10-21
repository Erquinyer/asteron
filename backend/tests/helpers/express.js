import { vi } from 'vitest'

// Respuesta de Express mínima para pruebas unitarias de controladores:
// guarda el código de estado y el cuerpo para revisarlos en el Assert.
export const crearRes = () => {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

// Fechas fijas lejos de "hoy" para que las reglas de fechas den siempre el mismo resultado
export const FECHA_PASADA = '2020-01-15'
export const FECHA_FUTURA = '2999-03-10'
