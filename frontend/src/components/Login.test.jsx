import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginRequest } from '../api/auth.service'
import { getUser } from '../utils/auth'
import { renderWithProviders } from '../test/renderWithProviders'
import Login from './Login'

// Se reemplaza el cliente HTTP: el componente no llama al backend real
vi.mock('../api/auth.service', () => ({ loginRequest: vi.fn() }))

const usuario = { id_usuario: 1, nombre: 'Administrador Sistema', rol: 'Administrador Sistema', token: 'abc' }

// Renderiza el Login en /login con un dashboard de mentira para verificar la redirección
const renderLogin = () =>
  renderWithProviders(<Login />, {
    route: '/login',
    rutas: { '/dashboard': <h1>Panel principal</h1> },
  })

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Login', () => {
  it('debe mostrar el formulario con sus campos etiquetados y el botón de ingreso', () => {
    // Arrange / Act
    renderLogin()

    // Assert
    expect(screen.getByRole('heading', { name: 'Bienvenido' })).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
  })

  it('debe iniciar sesión, guardar el usuario y redirigir al dashboard con credenciales válidas', async () => {
    // Arrange
    loginRequest.mockResolvedValueOnce({ data: { user: usuario } })
    const { user } = renderLogin()

    // Act
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@macromet.com.co')
    await user.type(screen.getByLabelText('Contraseña'), 'admin2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // Assert
    expect(await screen.findByRole('heading', { name: 'Panel principal' })).toBeInTheDocument()
    expect(loginRequest).toHaveBeenCalledWith('admin@macromet.com.co', 'admin2026')
    expect(getUser()).toEqual(usuario)
  })

  it('debe mostrar los campos obligatorios y no llamar al API cuando el formulario está vacío', async () => {
    // Arrange
    const { user } = renderLogin()

    // Act
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // Assert
    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true')
    expect(loginRequest).not.toHaveBeenCalled()
  })

  it.each([
    ['sin arroba', 'admin.macromet.com.co'],
    ['sin dominio', 'admin@macromet'],
    ['con espacios', 'admin @macromet.com.co'],
  ])('debe rechazar un correo %s', async (_caso, correo) => {
    const { user } = renderLogin()

    await user.type(screen.getByLabelText('Correo electrónico'), correo)
    await user.type(screen.getByLabelText('Contraseña'), 'admin2026')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(screen.getByText('Ingresa un correo válido')).toBeInTheDocument()
    expect(loginRequest).not.toHaveBeenCalled()
  })

  it('debe quitar el error de un campo cuando la persona vuelve a escribir en él', async () => {
    // Arrange: primero se provoca el error
    const { user } = renderLogin()
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(screen.getByText('El correo es obligatorio')).toBeInTheDocument()

    // Act
    await user.type(screen.getByLabelText('Correo electrónico'), 'a')

    // Assert: queryBy porque se verifica una ausencia (getBy lanzaría un error)
    expect(screen.queryByText('El correo es obligatorio')).not.toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
  })

  it('debe mostrar una alerta y quedarse en el login cuando las credenciales son incorrectas', async () => {
    // Arrange
    loginRequest.mockRejectedValueOnce({ response: { status: 401, data: { message: 'Credenciales incorrectas' } } })
    const { user } = renderLogin()

    // Act
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@macromet.com.co')
    await user.type(screen.getByLabelText('Contraseña'), 'ClaveErronea')
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('Valide el usuario y la contraseña ingresados.')
    expect(screen.queryByRole('heading', { name: 'Panel principal' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeEnabled()
    expect(getUser()).toBeNull()
  })

  it('debe deshabilitar el botón y avisar que está cargando mientras espera al servidor', async () => {
    // Arrange: una respuesta que no llega hasta que el test la libera
    let responder
    loginRequest.mockReturnValueOnce(new Promise((resolve) => { responder = resolve }))
    const { user } = renderLogin()
    await user.type(screen.getByLabelText('Correo electrónico'), 'admin@macromet.com.co')
    await user.type(screen.getByLabelText('Contraseña'), 'admin2026')

    // Act
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    // Assert: mientras carga
    expect(screen.getByRole('button', { name: 'Iniciando sesión...' })).toBeDisabled()

    // Assert: cuando el servidor responde
    responder({ data: { user: usuario } })
    expect(await screen.findByRole('heading', { name: 'Panel principal' })).toBeInTheDocument()
  })

  it('debe mostrar y ocultar la contraseña con el botón del ojo', async () => {
    // Arrange
    const { user } = renderLogin()
    const campo = screen.getByLabelText('Contraseña')

    // Act + Assert
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })
})
