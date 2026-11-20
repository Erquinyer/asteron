import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteEvidencia, getArchivoEvidencia, getEvidencias } from '../../api/evidencias.service'
import { login } from '../../utils/auth'
import GaleriaEvidencias from './GaleriaEvidencias'

vi.mock('../../api/evidencias.service', () => ({
  getEvidencias: vi.fn(), getArchivoEvidencia: vi.fn(), deleteEvidencia: vi.fn(), subirEvidencia: vi.fn(),
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const foto = (id, fecha, o = {}) => ({
  id_evidencia: id, fecha, autor: 'Soldador 1', id_autor: 10, descripcion: `Foto ${id}`, fase_nombre: 'Corte', ...o,
})

beforeEach(() => {
  vi.resetAllMocks()
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:foto')
  globalThis.URL.revokeObjectURL = vi.fn()
  getArchivoEvidencia.mockResolvedValue({ data: new Blob(['x']) })
  login({ id_usuario: 10, nombre: 'Soldador 1', rol: 'Operario', acciones: {} })
})

describe('GaleriaEvidencias', () => {
  it('debe avisar cuando el proyecto aún no tiene fotos', async () => {
    getEvidencias.mockResolvedValueOnce({ data: [] })

    render(<GaleriaEvidencias idProyecto={7} puedeSubir={false} />)

    expect(await screen.findByText('Este proyecto aún no tiene fotos.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adjuntar foto' })).not.toBeInTheDocument()
  })

  it('debe agrupar las fotos por día, con autor, en el orden que entrega el servidor', async () => {
    // Arrange: dos fotos del 20 y una del 18 de noviembre
    getEvidencias.mockResolvedValueOnce({ data: [
      foto(3, '2026-11-20T16:00:00'), foto(2, '2026-11-20T09:00:00'), foto(1, '2026-11-18T10:00:00'),
    ] })

    // Act
    render(<GaleriaEvidencias idProyecto={7} puedeSubir />)

    // Assert
    expect(await screen.findByText(/20 de noviembre de 2026 · 2 fotos/i)).toBeInTheDocument()
    expect(screen.getByText(/18 de noviembre de 2026 · 1 foto$/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Soldador 1 ·/)).toHaveLength(3)
    expect(screen.getByRole('heading', { name: /Evidencia fotográfica/ })).toHaveTextContent('(3)')
    expect(getEvidencias).toHaveBeenCalledWith(7, {})
  })

  it('en una actividad debe pedir solo las fotos de esa actividad', async () => {
    getEvidencias.mockResolvedValueOnce({ data: [] })

    render(<GaleriaEvidencias idProyecto={7} idProgramacion={50} puedeSubir compacto />)

    expect(await screen.findByText('Esta actividad aún no tiene fotos.')).toBeInTheDocument()
    expect(getEvidencias).toHaveBeenCalledWith(7, { programacion: 50 })
  })

  it('debe abrir la foto y dejar que su autor la elimine', async () => {
    // Arrange
    getEvidencias.mockResolvedValue({ data: [foto(1, '2026-11-20T09:00:00')] })
    deleteEvidencia.mockResolvedValueOnce({})
    const user = userEvent.setup()
    render(<GaleriaEvidencias idProyecto={7} puedeSubir />)

    // Act
    await user.click(await screen.findByRole('button', { name: 'Ver foto: Foto 1' }))
    const visor = await screen.findByRole('dialog', { name: 'Foto de evidencia' })
    await user.click(within(visor).getByRole('button', { name: 'Eliminar foto' }))
    await user.click(within(visor).getByRole('button', { name: 'Sí, eliminar' }))

    // Assert
    expect(deleteEvidencia).toHaveBeenCalledWith(1)
  })

  it('debe avisar cuando no se pudieron cargar las fotos', async () => {
    getEvidencias.mockRejectedValueOnce(new Error('Network Error'))

    render(<GaleriaEvidencias idProyecto={7} puedeSubir />)

    expect(await screen.findByText('No se pudieron cargar las fotos')).toBeInTheDocument()
  })
})
