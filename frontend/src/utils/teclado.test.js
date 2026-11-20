import { describe, expect, it, vi } from 'vitest'
import { clicConTeclado } from './teclado'

// Accesibilidad (RNF-14): una fila o tarjeta clicable también se usa con el teclado
const tecla = (key, { interno = false } = {}) => {
  const currentTarget = {}
  return { key, currentTarget, target: interno ? {} : currentTarget, preventDefault: vi.fn() }
}

describe('clicConTeclado', () => {
  it('debe poder alcanzarse con Tab y anunciarse como botón', () => {
    const props = clicConTeclado(() => {})

    expect(props).toMatchObject({ role: 'button', tabIndex: 0 })
  })

  it('no debe poner role="button" en una fila de tabla, para no romper la lectura de sus celdas', () => {
    const props = clicConTeclado(() => {}, { fila: true })

    expect(props).not.toHaveProperty('role')
    expect(props.tabIndex).toBe(0)
  })

  it.each(['Enter', ' '])('debe activar la acción con la tecla "%s" y evitar el desplazamiento de la página', (key) => {
    // Arrange
    const accion = vi.fn()
    const evento = tecla(key)

    // Act
    clicConTeclado(accion).onKeyDown(evento)

    // Assert
    expect(accion).toHaveBeenCalledOnce()
    expect(evento.preventDefault).toHaveBeenCalled()
  })

  it('no debe hacer nada con otras teclas', () => {
    const accion = vi.fn()

    clicConTeclado(accion).onKeyDown(tecla('Tab'))

    expect(accion).not.toHaveBeenCalled()
  })

  it('no debe abrir la fila cuando el Enter es sobre un botón interno (editar, eliminar)', () => {
    const accion = vi.fn()

    clicConTeclado(accion).onKeyDown(tecla('Enter', { interno: true }))

    expect(accion).not.toHaveBeenCalled()
  })

  it('debe conservar el clic con el mouse', () => {
    const accion = vi.fn()

    clicConTeclado(accion).onClick()

    expect(accion).toHaveBeenCalledOnce()
  })
})
