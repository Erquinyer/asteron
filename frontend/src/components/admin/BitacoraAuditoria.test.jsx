import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuditoria } from '../../api/admin.service'
import { resumirDetalle } from '../../utils/auditoria'
import BitacoraAuditoria from './BitacoraAuditoria'

// RNF-22: la bitácora muestra quién cambió qué. El cliente HTTP se reemplaza.
vi.mock('../../api/admin.service', () => ({ getAuditoria: vi.fn() }))

const fila = {
  id_auditoria: 1, fecha: '2026-11-13T19:30:00', modulo: 'maquinaria', accion: 'eliminar',
  id_registro: 7, detalle: null, rol: 'Administrador Sistema', usuario: 'Admin Asteron',
}

beforeEach(() => vi.resetAllMocks())

describe('resumirDetalle', () => {
  it.each([
    [null, '—'],
    [{ nombre: 'Dobladora', estado: 'activa' }, 'nombre: Dobladora · estado: activa'],
    [{ nombre: 'Martín', password_cambiada: true }, 'nombre: Martín · password cambiada'],
    [{ cambios: [{}, {}] }, '2 cambio(s) de permisos'],
  ])('resume %o como "%s"', (detalle, texto) => {
    expect(resumirDetalle(detalle)).toBe(texto)
  })
})

describe('BitacoraAuditoria', () => {
  it('debe listar quién hizo cada cambio y sobre qué registro', async () => {
    getAuditoria.mockResolvedValueOnce({ data: [fila] })

    render(<BitacoraAuditoria />)

    expect(await screen.findByText('Admin Asteron')).toBeInTheDocument()
    expect(screen.getByText('Eliminó maquinaria #7')).toBeInTheDocument()
  })

  it('debe volver a consultar al filtrar por módulo', async () => {
    getAuditoria.mockResolvedValue({ data: [] })
    const user = userEvent.setup()
    render(<BitacoraAuditoria />)
    await screen.findByText('Todavía no hay cambios registrados.')

    await user.selectOptions(screen.getByLabelText('Módulo'), 'roles')

    expect(getAuditoria).toHaveBeenLastCalledWith('roles')
  })

  it('debe avisar cuando no se puede cargar', async () => {
    getAuditoria.mockRejectedValueOnce(new Error('Network Error'))

    render(<BitacoraAuditoria />)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la bitácora.')
  })
})
