import { beforeEach, describe, expect, it, vi } from 'vitest'
import pool from '../src/config/db.js'
import { create, remove, update, updateFase } from '../src/controllers/proyectos.controller.js'
import { crearRes, FECHA_FUTURA, FECHA_PASADA } from './helpers/express.js'

// Doble de prueba de la BD: cada test define qué responde cada consulta, en orden
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))

const usuario = { id: 5, rol: 'Gerente General' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('proyectos.create — validaciones', () => {
  it.each([
    ['no tiene nombre', { fecha_inicio: FECHA_FUTURA }, 'El nombre es requerido'],
    ['la fecha de inicio ya pasó', { nombre: 'Góndola', fecha_inicio: FECHA_PASADA }, 'La fecha de inicio no puede ser anterior a hoy'],
    ['la entrega es antes del inicio', { nombre: 'Góndola', fecha_inicio: '2999-03-10', fecha_fin_estimada: '2999-03-09' },
      'La fecha de entrega estimada no puede ser anterior a la fecha de inicio'],
  ])('debe responder 400 sin tocar la BD cuando el proyecto %s', async (_caso, body, mensaje) => {
    // Arrange
    const res = crearRes()

    // Act
    await create({ body, user: usuario }, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: mensaje })
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('debe aceptar que la entrega sea el mismo día del inicio (valor límite)', async () => {
    // Arrange: sin pedido, para que el flujo sea corto
    pool.query
      .mockResolvedValueOnce([{ insertId: 50 }])            // INSERT proyecto
      .mockResolvedValueOnce([[{ id_fase_estandar: 1, orden: 1 }]]) // fases estándar
      .mockResolvedValueOnce([[]])                          // usuario con rol Gerente General
      .mockResolvedValueOnce([[]])                          // usuario con rol Coordinador de Producción
      .mockResolvedValueOnce([{}])                          // INSERT fases
      .mockResolvedValueOnce([[{ id_proyecto: 50 }]])       // proyecto creado
    const body = { nombre: 'Góndola', fecha_inicio: FECHA_FUTURA, fecha_fin_estimada: FECHA_FUTURA }
    const res = crearRes()

    // Act
    await create({ body, user: usuario }, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('debe responder 409 cuando el pedido ya tiene un proyecto', async () => {
    pool.query.mockResolvedValueOnce([[{ id_proyecto: 3, nombre: 'Exhibidor Postobón' }]])
    const res = crearRes()

    await create({ body: { nombre: 'Otro', id_pedido: 12 }, user: usuario }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: 'El pedido #12 ya está asociado al proyecto "Exhibidor Postobón"' })
  })
})

describe('proyectos.create — fases del proyecto', () => {
  it('debe crear Diseño y Compra una sola vez y el resto de fases por cada ítem del pedido', async () => {
    // Arrange: pedido con 2 ítems y 4 fases estándar
    pool.query
      .mockResolvedValueOnce([[]])                                  // el pedido no tiene proyecto
      .mockResolvedValueOnce([{ insertId: 50 }])                    // INSERT proyecto
      .mockResolvedValueOnce([{}])                                  // pedido → en_proceso
      .mockResolvedValueOnce([[
        { id_fase_estandar: 1, orden: 1 },                          // Diseño
        { id_fase_estandar: 2, orden: 2 },                          // Compra
        { id_fase_estandar: 3, orden: 3 },                          // Corte
        { id_fase_estandar: 4, orden: 4 },                          // Soldadura
      ]])
      .mockResolvedValueOnce([[{ id_detalle: 8 }, { id_detalle: 9 }]]) // ítems del pedido
      .mockResolvedValueOnce([[{ id_usuario: 2 }]])                 // Gerente General
      .mockResolvedValueOnce([[{ id_usuario: 3 }]])                 // Coordinador de Producción
      .mockResolvedValueOnce([{}])                                  // INSERT fases
      .mockResolvedValueOnce([[{ id_proyecto: 50, nombre: 'Góndola' }]])
    const res = crearRes()

    // Act
    await create({ body: { nombre: 'Góndola', id_pedido: 12 }, user: usuario }, res)

    // Assert
    const [, [filasFases]] = pool.query.mock.calls[7]
    expect(filasFases).toEqual([
      [50, 1, null, 2, 'pendiente', 0],   // Diseño → Gerente General
      [50, 2, null, 3, 'pendiente', 0],   // Compra → Coordinador de Producción
      [50, 3, 8, null, 'pendiente', 0],   // Corte, ítem 8
      [50, 3, 9, null, 'pendiente', 0],   // Corte, ítem 9
      [50, 4, 8, null, 'pendiente', 0],   // Soldadura, ítem 8
      [50, 4, 9, null, 'pendiente', 0],   // Soldadura, ítem 9
    ])
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ id_proyecto: 50, nombre: 'Góndola' })
  })

  it('debe crear una sola fila por fase cuando el proyecto no tiene pedido', async () => {
    pool.query
      .mockResolvedValueOnce([{ insertId: 51 }])
      .mockResolvedValueOnce([[{ id_fase_estandar: 3, orden: 3 }, { id_fase_estandar: 4, orden: 4 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ id_proyecto: 51 }]])
    const res = crearRes()

    await create({ body: { nombre: 'Interno' }, user: usuario }, res)

    const [, [filasFases]] = pool.query.mock.calls[4]
    expect(filasFases).toEqual([
      [51, 3, null, null, 'pendiente', 0],
      [51, 4, null, null, 'pendiente', 0],
    ])
  })
})

describe('proyectos.update', () => {
  it('debe permitir editar un proyecto en curso cuya fecha de inicio ya pasó si no se cambia', async () => {
    // Arrange: la fecha guardada en MySQL es la misma que llega en el formulario
    pool.query
      .mockResolvedValueOnce([[{ fecha_inicio: new Date(2020, 0, 15) }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
    const res = crearRes()

    // Act
    await update({ params: { id: 7 }, body: { nombre: 'Góndola', fecha_inicio: FECHA_PASADA } }, res)

    // Assert
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ id_proyecto: 7 })
  })

  it('debe rechazar cambiar la fecha de inicio a una fecha pasada', async () => {
    pool.query.mockResolvedValueOnce([[{ fecha_inicio: new Date(2999, 0, 1) }]])
    const res = crearRes()

    await update({ params: { id: 7 }, body: { nombre: 'Góndola', fecha_inicio: FECHA_PASADA } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('debe responder 404 cuando el proyecto no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    await update({ params: { id: 999 }, body: { nombre: 'X' } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('proyectos.updateFase', () => {
  it('debe impedir que otra persona actualice una fase asignada', async () => {
    pool.query.mockResolvedValueOnce([[{ id_usuario_asignado: 2 }]])
    const res = crearRes()

    await updateFase({ params: { id: 7, faseId: 70 }, body: { estado: 'completado' }, user: { id: 5, rol: 'Gerente General' } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('debe permitir al Administrador Sistema actualizar una fase asignada a otra persona', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_usuario_asignado: 2 }]])
      .mockResolvedValueOnce([[{ turnos_vinculados: 0 }]])
      .mockResolvedValueOnce([{}])
    const res = crearRes()

    await updateFase({ params: { id: 7, faseId: 70 }, body: { estado: 'completado' }, user: { id: 1, rol: 'Administrador Sistema' } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Fase actualizada' })
  })

  it('debe responder 409 cuando la fase se controla desde Programación de planta', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_usuario_asignado: null }]])
      .mockResolvedValueOnce([[{ turnos_vinculados: 1 }]])  // valor límite: basta un turno
    const res = crearRes()

    await updateFase({ params: { id: 7, faseId: 70 }, body: { estado: 'en_proceso' }, user: usuario }, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })
})

describe('proyectos.remove', () => {
  it.each([
    [1, 'el proyecto tiene 1 actividad de Programación asociada.'],
    [3, 'el proyecto tiene 3 actividades de Programación asociadas.'],
  ])('debe impedir borrar un proyecto con %i actividad(es) y escribir el mensaje en singular o plural', async (total, texto) => {
    pool.query.mockResolvedValueOnce([[{ total_actividades: total }]])
    const res = crearRes()

    await remove({ params: { id: 7 } }, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json.mock.calls[0][0].message).toContain(texto)
  })

  it('debe borrar el proyecto cuando no tiene actividades', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total_actividades: 0 }]])
      .mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = crearRes()

    await remove({ params: { id: 7 } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto eliminado' })
  })
})
