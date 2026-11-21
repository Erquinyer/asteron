import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import VisorFoto from './VisorFoto'

const evidencia = {
  id_evidencia: 1, descripcion: 'Soldadura terminada', autor: 'Soldador 1',
  fecha: '2026-11-20T15:14:00', fase_nombre: 'Soldadura MIG', item_producto: 'Exhibidor', id_programacion: 50,
}

const renderVisor = (props = {}) => {
  const onClose = vi.fn()
  const onEliminar = vi.fn().mockResolvedValue(true)
  render(<VisorFoto evidencia={evidencia} url="blob:foto" puedeEliminar onEliminar={onEliminar} onClose={onClose} {...props} />)
  return { user: userEvent.setup(), onClose, onEliminar }
}

describe('VisorFoto', () => {
  it('debe mostrar la foto con su descripción, autor y fase', () => {
    renderVisor()

    expect(screen.getByRole('dialog', { name: 'Foto de evidencia' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Soldadura terminada' })).toHaveAttribute('src', 'blob:foto')
    expect(screen.getByText('Soldador 1')).toBeInTheDocument()
    expect(screen.getByText(/Soldadura MIG · Exhibidor · actividad de planta/)).toBeInTheDocument()
  })

  it('debe cerrarse con la tecla Escape', async () => {
    const { user, onClose } = renderVisor()

    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })

  it('debe pedir confirmación antes de eliminar y cerrarse al terminar', async () => {
    // Arrange
    const { user, onEliminar, onClose } = renderVisor()

    // Act
    await user.click(screen.getByRole('button', { name: 'Eliminar foto' }))
    expect(onEliminar).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Sí, eliminar' }))

    // Assert
    expect(onEliminar).toHaveBeenCalledWith(evidencia)
    expect(onClose).toHaveBeenCalled()
  })

  it('debe permitir arrepentirse de eliminar', async () => {
    const { user, onEliminar } = renderVisor()

    await user.click(screen.getByRole('button', { name: 'Eliminar foto' }))
    await user.click(screen.getByRole('button', { name: 'No' }))

    expect(onEliminar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Eliminar foto' })).toBeInTheDocument()
  })

  it('no debe ofrecer eliminar a quien no es el autor ni puede eliminar proyectos', () => {
    renderVisor({ puedeEliminar: false, evidencia: { ...evidencia, autor: null, descripcion: null } })

    expect(screen.queryByRole('button', { name: 'Eliminar foto' })).not.toBeInTheDocument()
    expect(screen.getByText('Usuario eliminado')).toBeInTheDocument()
  })
})
