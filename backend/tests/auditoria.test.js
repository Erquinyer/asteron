import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { listarAuditoria, registrarAuditoria } from '../src/utils/auditoria.js'
import { update as actualizarUsuario } from '../src/controllers/usuarios.controller.js'
import { remove as eliminarMaquina } from '../src/controllers/maquinaria.controller.js'
import { crearRes } from './helpers/express.js'

// Unidad — bitácora de auditoría de cambios críticos (RNF-22).
// BD: STUB del pool; se revisa el INSERT que llega a la tabla auditoria.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const admin = { id: 1, rol: 'Administrador Sistema' }
const insertsDeAuditoria = () => pool.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO auditoria'))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('registrarAuditoria', () => {
  it('debe guardar quién, qué módulo, qué acción y sobre qué registro', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 1 }])

    await registrarAuditoria({ user: admin, ip: '10.0.0.5' }, { modulo: 'maquinaria', accion: 'eliminar', idRegistro: '12' })

    const [, params] = insertsDeAuditoria()[0]
    expect(params).toEqual([1, 'Administrador Sistema', 'maquinaria', 'eliminar', 12, null, '10.0.0.5'])
  })

  it('nunca debe guardar contraseñas: solo deja constancia de que se cambió', async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 1 }])

    await registrarAuditoria({ user: admin }, {
      modulo: 'usuarios', accion: 'editar', idRegistro: 4,
      detalle: { nombre: 'Martín', password: 'Secreta123', correo: undefined },
    })

    const detalle = JSON.parse(insertsDeAuditoria()[0][1][5])
    expect(detalle).toEqual({ nombre: 'Martín', password_cambiada: true })
    expect(JSON.stringify(detalle)).not.toContain('Secreta123')
  })

  it('no debe hacer fallar la operación si la bitácora no se puede escribir', async () => {
    pool.query.mockRejectedValueOnce(new Error("ER_NO_SUCH_TABLE: Table 'asteron.auditoria' doesn't exist"))

    await expect(registrarAuditoria({ user: admin }, { modulo: 'roles', accion: 'crear' })).resolves.toBeUndefined()
    expect(console.error).toHaveBeenCalled()
  })
})

describe('Controladores que registran en la bitácora', () => {
  it('editar un usuario debe quedar en la bitácora sin la contraseña nueva', async () => {
    // Arrange: UPDATE, SELECT del usuario actualizado, INSERT de auditoría
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_usuario: 4, nombre: 'Martín', estado: 1 }]])
      .mockResolvedValueOnce([{ insertId: 1 }])
    const res = crearRes()

    // Act
    await actualizarUsuario({ params: { id: '4' }, body: { nombre: 'Martín', correo: 'm@macromet.com.co', password: 'Nueva1234', id_rol: 8 }, user: admin }, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith({ id_usuario: 4, nombre: 'Martín', estado: 1 })
    const [, params] = insertsDeAuditoria()[0]
    expect(params.slice(2, 5)).toEqual(['usuarios', 'editar', 4])
    expect(params[5]).not.toContain('Nueva1234')
    expect(JSON.parse(params[5]).password_cambiada).toBe(true)
  })

  it('eliminar una máquina debe quedar en la bitácora', async () => {
    pool.query
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([{ insertId: 1 }])
    const res = crearRes()

    await eliminarMaquina({ params: { id: '7' }, user: admin }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Equipo eliminado' })
    expect(insertsDeAuditoria()[0][1].slice(2, 5)).toEqual(['maquinaria', 'eliminar', 7])
  })

  it('no debe registrar nada cuando la máquina no existe', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = crearRes()

    await eliminarMaquina({ params: { id: '999' }, user: admin }, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(insertsDeAuditoria()).toHaveLength(0)
  })
})

describe('listarAuditoria', () => {
  it('debe filtrar por módulo, limitar a 500 entradas y devolver el detalle como objeto', async () => {
    pool.query.mockResolvedValueOnce([[{ id_auditoria: 3, modulo: 'roles', accion: 'editar', detalle: '{"valor_hora":24000}' }]])
    const res = crearRes()

    await listarAuditoria({ query: { modulo: 'roles', limite: '9999' } }, res)

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toContain('WHERE a.modulo = ?')
    expect(params).toEqual(['roles', 500])
    expect(res.json).toHaveBeenCalledWith([{ id_auditoria: 3, modulo: 'roles', accion: 'editar', detalle: { valor_hora: 24000 } }])
  })

  it('debe responder 500 genérico cuando falla la BD', async () => {
    pool.query.mockRejectedValueOnce(new Error('ER_BAD_FIELD_ERROR'))
    const res = crearRes()

    await listarAuditoria({ query: {} }, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Error al obtener la bitácora' })
  })
})
