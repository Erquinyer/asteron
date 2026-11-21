import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { fotoMaquina, fotoUsuario, registrarBitacora } from '../src/utils/bitacora.js'

// Bitácora de auditoría (RNF-22). Doble de la BD: STUB para las fotos y SPY sobre
// el INSERT para revisar qué quedó registrado.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const insertDeBitacora = () => pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO bitacora_auditoria'))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('fotoUsuario y fotoMaquina', () => {
  it('debe devolver la foto legible del usuario, sin el hash de la contraseña', async () => {
    pool.query.mockResolvedValueOnce([[{ nombre: 'Ana', rol: 'Operario', estado: 'activo' }]])

    const foto = await fotoUsuario(3)

    expect(foto).toEqual({ nombre: 'Ana', rol: 'Operario', estado: 'activo' })
    expect(pool.query.mock.calls[0][0]).not.toContain('password_hash')
    expect(pool.query.mock.calls[0][1]).toEqual([3])
  })

  it.each([
    ['fotoUsuario', fotoUsuario],
    ['fotoMaquina', fotoMaquina],
  ])('%s debe devolver null cuando el registro no existe', async (_nombre, foto) => {
    pool.query.mockResolvedValueOnce([[]])

    expect(await foto(999)).toBeNull()
  })

  it('debe mostrar el responsable del equipo por nombre y no por id', async () => {
    pool.query.mockResolvedValueOnce([[{ nombre: 'Dobladora', responsable: 'Martín' }]])

    const foto = await fotoMaquina(4)

    expect(foto.responsable).toBe('Martín')
    expect(pool.query.mock.calls[0][0]).toContain('r.nombre AS responsable')
  })
})

describe('registrarBitacora', () => {
  it('debe guardar solo los campos que cambiaron, con su valor antes y después', async () => {
    // Arrange
    pool.query.mockResolvedValueOnce([{}])
    const antes = { nombre: 'Ana', rol: 'Operario', estado: 'activo' }
    const despues = { nombre: 'Ana', rol: 'Coordinador de Planta', estado: 'activo' }

    // Act
    await registrarBitacora({ entidad: 'usuario', id_registro: 3, accion: 'editar', antes, despues, autor: 1 })

    // Assert
    const [, params] = insertDeBitacora()
    expect(params.slice(0, 4)).toEqual(['usuario', 3, 'Ana', 'editar'])
    expect(JSON.parse(params[4])).toEqual({ rol: { antes: 'Operario', despues: 'Coordinador de Planta' } })
    expect(params[6]).toBe(1)
    expect(params[7]).toBeInstanceOf(Date)
  })

  it('no debe registrar una edición que no cambió nada', async () => {
    const foto = { nombre: 'Ana', estado: 'activo' }

    await registrarBitacora({ entidad: 'usuario', id_registro: 3, accion: 'editar', antes: foto, despues: { ...foto } })

    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe tratar null, undefined y "" como el mismo valor vacío', async () => {
    await registrarBitacora({
      entidad: 'maquinaria', id_registro: 2, accion: 'editar',
      antes: { marca: null, serial: undefined }, despues: { marca: '', serial: null },
    })

    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe registrar un cambio de contraseña sin guardar ningún campo', async () => {
    pool.query.mockResolvedValueOnce([{}])

    await registrarBitacora({
      entidad: 'usuario', id_registro: 3, accion: 'contrasena',
      antes: { nombre: 'Ana', correo: 'ana@macromet.com.co' }, detalle: 'Cambiada desde su perfil',
    })

    const [, params] = insertDeBitacora()
    expect(params[4]).toBe('{}')
    expect(params[5]).toBe('Cambiada desde su perfil')
  })

  it('al crear debe tomar el nombre de la foto posterior y al eliminar de la anterior', async () => {
    pool.query.mockResolvedValue([{}])

    await registrarBitacora({ entidad: 'maquinaria', id_registro: 9, accion: 'crear', despues: { nombre: 'Pulidora' } })
    await registrarBitacora({ entidad: 'maquinaria', id_registro: 9, accion: 'eliminar', antes: { nombre: 'Pulidora' } })

    expect(pool.query.mock.calls[0][1][2]).toBe('Pulidora')
    expect(pool.query.mock.calls[1][1][2]).toBe('Pulidora')
    expect(JSON.parse(pool.query.mock.calls[1][1][4])).toEqual({ nombre: { antes: 'Pulidora', despues: null } })
  })

  it('no debe hacer fallar la operación del usuario si no se puede escribir la bitácora', async () => {
    pool.query.mockRejectedValueOnce(new Error('ER_LOCK_WAIT_TIMEOUT'))

    await expect(registrarBitacora({ entidad: 'usuario', id_registro: 3, accion: 'crear', despues: { nombre: 'Ana' } }))
      .resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalledWith('[bitacora]', expect.any(Error))
  })
})
