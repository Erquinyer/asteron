import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { aceptarPoliticaDatos } from '../api/perfil.service'
import { getUser, login } from '../utils/auth'
import { renderWithProviders } from '../test/renderWithProviders'
import AvisoPoliticaDatos from './AvisoPoliticaDatos'

// RNF-07 (Ley 1581 de 2012): aviso de aceptación de la política de datos.
vi.mock('../api/perfil.service', () => ({ aceptarPoliticaDatos: vi.fn() }))

const renderAviso = (onAceptada = vi.fn()) => ({
  onAceptada,
  ...renderWithProviders(<AvisoPoliticaDatos onAceptada={onAceptada} />, {
    route: '/dashboard',
    rutas: { '/login': <h1>Inicio de sesión</h1>, '/politica-datos': <h1>Política completa</h1> },
  }),
})

beforeEach(() => {
  vi.resetAllMocks()
  localStorage.clear()
  login({ id_usuario: 7, nombre: 'Angie', rol: 'Operario', token: 'abc', aceptaPoliticaDatos: false })
})

describe('AvisoPoliticaDatos', () => {
  it('debe mostrarse como diálogo con el enlace a la política completa', () => {
    renderAviso()

    expect(screen.getByRole('dialog', { name: 'Tratamiento de tus datos personales' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'política de tratamiento de datos' })).toHaveAttribute('href', '/politica-datos')
  })

  it('debe registrar la aceptación y guardarla en la sesión', async () => {
    // Arrange
    aceptarPoliticaDatos.mockResolvedValueOnce({ data: { message: 'Autorización registrada' } })
    const { user, onAceptada } = renderAviso()

    // Act
    await user.click(screen.getByRole('button', { name: 'Acepto la política' }))

    // Assert
    expect(aceptarPoliticaDatos).toHaveBeenCalledOnce()
    expect(onAceptada).toHaveBeenCalledOnce()
    expect(getUser().aceptaPoliticaDatos).toBe(true)
  })

  it('no debe dar por aceptada la política si el servidor falla', async () => {
    aceptarPoliticaDatos.mockRejectedValueOnce(new Error('Network Error'))
    const { user, onAceptada } = renderAviso()

    await user.click(screen.getByRole('button', { name: 'Acepto la política' }))

    expect(onAceptada).not.toHaveBeenCalled()
    expect(getUser().aceptaPoliticaDatos).toBe(false)
    expect(screen.getByRole('button', { name: 'Acepto la política' })).toBeEnabled()
  })

  it('debe cerrar la sesión y volver al login si la persona no acepta', async () => {
    const { user } = renderAviso()

    await user.click(screen.getByRole('button', { name: 'No acepto, cerrar sesión' }))

    expect(getUser()).toBeNull()
    expect(screen.getByRole('heading', { name: 'Inicio de sesión' })).toBeInTheDocument()
  })
})
