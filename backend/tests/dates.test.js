import { afterEach, describe, expect, it, vi } from 'vitest'
import { esFechaPasada, fechaColumnaISO, hoyISO } from '../src/utils/dates.js'

describe('esFechaPasada', () => {
  const hoy = '2026-10-21'

  it('debe considerar pasada una fecha del día anterior a hoy', () => {
    // Arrange
    const ayer = '2026-10-20'

    // Act
    const resultado = esFechaPasada(ayer, hoy)

    // Assert
    expect(resultado).toBe(true)
  })

  it('no debe considerar pasada la fecha de hoy (valor límite)', () => {
    // Arrange: el borde exacto de la regla
    const fecha = hoy

    // Act
    const resultado = esFechaPasada(fecha, hoy)

    // Assert
    expect(resultado).toBe(false)
  })

  it.each([
    ['la fecha de mañana', '2026-10-22', false],
    ['el último día del mes anterior', '2026-09-30', true],
    ['la fecha de hoy con hora (se compara solo el día)', '2026-10-21T23:59:59', false],
    ['un texto vacío', '', false],
    ['null', null, false],
    ['undefined', undefined, false],
  ])('con %s (%s) devuelve %s', (_caso, fecha, esperado) => {
    expect(esFechaPasada(fecha, hoy)).toBe(esperado)
  })
})

describe('fechaColumnaISO', () => {
  it('debe convertir una fecha de MySQL a AAAA-MM-DD con ceros a la izquierda', () => {
    // Arrange: 5 de enero (mes y día de un solo dígito)
    const fechaMysql = new Date(2026, 0, 5)

    // Act
    const iso = fechaColumnaISO(fechaMysql)

    // Assert
    expect(iso).toBe('2026-01-05')
  })

  it('debe devolver null cuando la columna viene vacía', () => {
    expect(fechaColumnaISO(null)).toBeNull()
  })
})

describe('hoyISO', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('debe usar la fecha local y no la de UTC (de noche en Colombia ya es otro día en UTC)', () => {
    // Arrange: 31 de diciembre a las 11 p. m., hora local
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 0, 0))

    // Act
    const hoy = hoyISO()

    // Assert
    expect(hoy).toBe('2026-12-31')
  })
})
