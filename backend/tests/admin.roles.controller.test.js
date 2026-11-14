import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { createRol, deleteRol, updateRol, updateUsuarioRol } from '../src/controllers/admin.controller.js'
import { crearRes } from './helpers/express.js'

// Doble de la BD: STUB con respuestas preparadas. Donde la regla es "no guardar",
// se verifica que no hubo escritura (comportamiento).
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

// true si alguna consulta escribió en la BD
const huboEscritura = () => pool.query.mock.calls.some(([sql]) => /^\s*(INSERT|UPDATE|DELETE)/i.test(sql))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('Roles protegidos', () => {
  it.each([
    ['editar', (res) => updateRol({ params: { id: 9 }, body: { nombre: 'Otro' } }, res)],
    ['eliminar', (res) => deleteRol({ params: { id: 9 } }, res)],
  ])('no debe permitir %s el rol Administrador Sistema', async (_accion, accion) => {
    // Arrange
    pool.query.mockResolvedValueOnce([[{ nombre: 'Administrador Sistema' }]])
    const res = crearRes()

    // Act
    await accion(res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ message: 'No se puede modificar el rol Administrador Sistema' })
    expect(huboEscritura()).toBe(false)
  })

  it('no debe permitir cambiar el rol del usuario administrador del sistema (EMP-000)', async () => {
    pool.query.mockResolvedValueOnce([[{ codigo_empleado: 'EMP-000' }]])
    const res = crearRes()

    await updateUsuarioRol({ params: { id: 1 }, body: { id_rol: 8 } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(huboEscritura()).toBe(false)
  })
})

describe('createRol, updateRol y deleteRol', () => {
  it('debe crear el rol sin espacios sobrantes y con 0 usuarios', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 10 }])
      .mockResolvedValueOnce([[{ id_rol: 10, nombre: 'Soldador', descripcion: 'Planta' }]])
    const res = crearRes()

    await createRol({ body: { nombre: '  Soldador  ', descripcion: ' Planta ' } }, res)

    // Sin valor hora: se guarda null ("sin definir") y no 0
    expect(pool.query.mock.calls[0][1]).toEqual(['Soldador', 'Planta', null])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id_rol: 10, nombre: 'Soldador', descripcion: 'Planta', total_usuarios: 0 })
  })

  it.each([
    ['crear', (res) => createRol({ body: { nombre: '   ' } }, res)],
    ['editar', (res) => updateRol({ params: { id: 3 }, body: {} }, res)],
  ])('debe responder 400 al %s un rol sin nombre', async (_accion, accion) => {
    const res = crearRes()

    await accion(res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe responder 409 cuando ya existe un rol con ese nombre', async () => {
    pool.query.mockRejectedValueOnce(Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' }))
    const res = crearRes()

    await createRol({ body: { nombre: 'Operario' } }, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('debe actualizar un rol editable', async () => {
    pool.query
      .mockResolvedValueOnce([[{ nombre: 'Operario' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_rol: 8, nombre: 'Operario de planta', total_usuarios: 4 }]])
    const res = crearRes()

    await updateRol({ params: { id: 8 }, body: { nombre: 'Operario de planta' } }, res)

    expect(res.json).toHaveBeenCalledWith({ id_rol: 8, nombre: 'Operario de planta', total_usuarios: 4 })
  })

  it.each([
    [1, 'No se puede eliminar: 1 usuario(s) tienen este rol'],
    [4, 'No se puede eliminar: 4 usuario(s) tienen este rol'],
  ])('no debe eliminar un rol con %i usuario(s) asignado(s)', async (cantidad, mensaje) => {
    pool.query
      .mockResolvedValueOnce([[{ nombre: 'Operario' }]])
      .mockResolvedValueOnce([[{ cnt: cantidad }]])
    const res = crearRes()

    await deleteRol({ params: { id: 8 } }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
    expect(huboEscritura()).toBe(false)
  })

  it('debe eliminar un rol sin usuarios (valor límite: 0)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ nombre: 'Temporal' }]])
      .mockResolvedValueOnce([[{ cnt: 0 }]])
      .mockResolvedValueOnce([{}])
    const res = crearRes()

    await deleteRol({ params: { id: 11 } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Rol eliminado' })
  })

  it('debe responder 404 cuando el rol no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    await deleteRol({ params: { id: 999 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
