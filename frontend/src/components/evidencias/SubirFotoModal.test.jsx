import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subirEvidencia } from '../../api/evidencias.service'
import SubirFotoModal from './SubirFotoModal'

// Se reemplaza el cliente HTTP y las notificaciones: el componente no llama al backend real
vi.mock('../../api/evidencias.service', () => ({ subirEvidencia: vi.fn() }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

const foto = (nombre = 'soldadura.jpg', tipo = 'image/jpeg', bytes = 1024) =>
  new File([new Uint8Array(bytes)], nombre, { type: tipo })

const renderModal = (props = {}) => {
  const onClose = vi.fn()
  const onSubida = vi.fn()
  render(<SubirFotoModal idProyecto={7} onClose={onClose} onSubida={onSubida} {...props} />)
  return { user: userEvent.setup({ applyAccept: false }), onClose, onSubida }
}

beforeEach(() => {
  vi.resetAllMocks()
  // jsdom no implementa las URL temporales de archivos
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:vista-previa')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('SubirFotoModal', () => {
  it('debe ser un diálogo con nombre y con sus campos etiquetados', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: 'Adjuntar foto' })).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción (opcional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument()
    // Sin foto elegida no se puede subir
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeDisabled()
  })

  it('debe mostrar la vista previa de la foto elegida', async () => {
    const { user } = renderModal()

    await user.upload(document.querySelector('input[type=file]'), foto())

    expect(screen.getByRole('img', { name: 'Vista previa de la foto elegida' })).toHaveAttribute('src', 'blob:vista-previa')
    expect(screen.getByText(/soldadura\.jpg/)).toBeInTheDocument()
  })

  it.each([
    ['un archivo que no es imagen', foto('notas.pdf', 'application/pdf'), 'Solo se permiten imágenes JPG, PNG o WEBP'],
    ['una foto de más de 5 MB', foto('grande.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1), 'La foto supera el tamaño máximo permitido (5 MB)'],
  ])('debe avisar, sin subir nada, al elegir %s', async (_caso, archivo, mensaje) => {
    const { user } = renderModal()

    await user.upload(document.querySelector('input[type=file]'), archivo)

    expect(screen.getByRole('alert')).toHaveTextContent(mensaje)
    expect(screen.getByRole('button', { name: 'Subir foto' })).toBeDisabled()
  })

  it('debe subir la foto con la descripción y avisar al terminar', async () => {
    // Arrange
    subirEvidencia.mockResolvedValueOnce({ data: { id_evidencia: 5 } })
    const { user, onClose, onSubida } = renderModal()

    // Act
    await user.upload(document.querySelector('input[type=file]'), foto())
    await user.type(screen.getByLabelText('Descripción (opcional)'), '  Soldadura lista  ')
    await user.click(screen.getByRole('button', { name: 'Subir foto' }))

    // Assert
    expect(subirEvidencia).toHaveBeenCalledWith(expect.objectContaining({
      id_proyecto: 7, id_fase_proyecto: '', descripcion: 'Soldadura lista',
    }))
    expect(onSubida).toHaveBeenCalledWith({ id_evidencia: 5 })
    expect(onClose).toHaveBeenCalled()
  })

  it('desde una actividad no debe pedir fase y debe enviar la actividad', async () => {
    subirEvidencia.mockResolvedValueOnce({ data: {} })
    const fases = [{ id_fase_proyecto: 70, fase_nombre: 'Soldadura MIG' }]
    const { user } = renderModal({ idProgramacion: 50, fases })

    expect(screen.queryByText('Fase (opcional)')).not.toBeInTheDocument()
    await user.upload(document.querySelector('input[type=file]'), foto())
    await user.click(screen.getByRole('button', { name: 'Subir foto' }))

    expect(subirEvidencia).toHaveBeenCalledWith(expect.objectContaining({ id_programacion: 50, id_fase_proyecto: null }))
  })

  it('debe mostrar el mensaje del servidor cuando la subida falla', async () => {
    subirEvidencia.mockRejectedValueOnce({ response: { data: { message: 'No tienes permiso para adjuntar fotos a este proyecto' } } })
    const { user, onClose } = renderModal()

    await user.upload(document.querySelector('input[type=file]'), foto())
    await user.click(screen.getByRole('button', { name: 'Subir foto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No tienes permiso para adjuntar fotos a este proyecto')
    expect(onClose).not.toHaveBeenCalled()
  })
})
