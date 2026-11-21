import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import pool from '../src/config/db.js'
import { tieneAccion } from '../src/middlewares/requireModulo.js'
import { create, getAll, getArchivo, remove } from '../src/controllers/evidencias.controller.js'
import { borrarArchivos, tipoImagen } from '../src/utils/evidencias.js'
import { crearRes } from './helpers/express.js'

// Evidencia fotográfica (RF-25/RF-26). Dobles:
// - BD: STUB/SPY con vi.mock, como en el resto de pruebas de controladores.
// - Sistema de archivos: MOCK de node:fs/promises, para no escribir fotos de verdad.
// - Permisos: STUB de tieneAccion, para fijar qué acciones tiene el rol en cada caso.
vi.mock('../src/config/db.js', () => ({ default: { query: vi.fn() } }))
vi.mock('node:fs/promises', () => ({ mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() }))
vi.mock('../src/middlewares/requireModulo.js', () => ({ tieneAccion: vi.fn() }))

// Primeros bytes ("firma") de cada formato
const JPG  = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0])
const PNG  = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0])
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])
const TEXTO = Buffer.from('esto no es una imagen')

const OPERARIO = { id: 10, rol: 'Operario' }
const COORDINADOR = { id: 3, rol: 'Coordinador de Planta' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  unlink.mockResolvedValue() // borrar en disco sale bien salvo que el test diga otra cosa
})

describe('tipoImagen: reconoce la imagen por su contenido', () => {
  it.each([
    ['JPG', JPG, 'jpg'],
    ['PNG', PNG, 'png'],
    ['WEBP', WEBP, 'webp'],
    ['texto renombrado a .jpg', TEXTO, null],
    ['archivo vacío', Buffer.alloc(0), null],
  ])('%s → %s', (_caso, buffer, esperado) => {
    expect(tipoImagen(buffer)).toBe(esperado)
  })
})

describe('borrarArchivos', () => {
  it('debe borrar cada archivo y tolerar los que ya no existen', async () => {
    unlink.mockReset()
    unlink.mockResolvedValueOnce().mockRejectedValueOnce(Object.assign(new Error('no existe'), { code: 'ENOENT' }))

    await borrarArchivos(['a.jpg', 'b.png'])

    expect(unlink).toHaveBeenCalledTimes(2)
    expect(console.error).not.toHaveBeenCalled()
  })

  it('debe dejar constancia en el log de los errores que no son "no existe"', async () => {
    unlink.mockReset()
    unlink.mockRejectedValueOnce(Object.assign(new Error('sin permiso'), { code: 'EACCES' }))

    await borrarArchivos(['a.jpg'])

    expect(console.error).toHaveBeenCalledWith('[evidencias] No se pudo borrar', 'a.jpg', expect.any(Error))
  })
})

describe('evidencias.getAll (galería)', () => {
  it('debe listar las fotos del proyecto de la más reciente a la más antigua', async () => {
    pool.query.mockResolvedValueOnce([[{ id_evidencia: 2 }, { id_evidencia: 1 }]])
    const res = crearRes()

    await getAll({ query: { proyecto: '7' } }, res)

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toContain('ORDER BY e.fecha DESC')
    expect(params).toEqual([7])
    expect(res.json).toHaveBeenCalledWith([{ id_evidencia: 2 }, { id_evidencia: 1 }])
  })

  it('debe aplicar los filtros opcionales de fase y actividad', async () => {
    pool.query.mockResolvedValueOnce([[]])

    await getAll({ query: { proyecto: '7', fase: '70', programacion: '50' } }, crearRes())

    const [sql, params] = pool.query.mock.calls[0]
    expect(sql).toContain('e.id_fase_proyecto = ?')
    expect(sql).toContain('e.id_programacion = ?')
    expect(params).toEqual([7, 70, 50])
  })

  it.each([
    ['sin proyecto', {}],
    ['con proyecto no numérico', { proyecto: 'abc' }],
    ['con una fase inválida', { proyecto: '7', fase: '-1' }],
  ])('debe responder 400 %s', async (_caso, query) => {
    const res = crearRes()

    await getAll({ query }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(pool.query).not.toHaveBeenCalled()
  })
})

describe('evidencias.create: validaciones', () => {
  it('debe responder 400 cuando no se adjunta foto', async () => {
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('debe rechazar un archivo que no es imagen aunque tenga extensión .jpg', async () => {
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7' }, file: { buffer: TEXTO, originalname: 'foto.jpg' } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Solo se permiten imágenes JPG, PNG o WEBP' })
    expect(writeFile).not.toHaveBeenCalled()
  })

  it.each([
    ['sin proyecto', {}],
    ['con fase inválida', { id_proyecto: '7', id_fase_proyecto: 'x' }],
    ['con descripción de más de 255 caracteres', { id_proyecto: '7', descripcion: 'a'.repeat(256) }],
  ])('debe responder 400 %s', async (_caso, body) => {
    const res = crearRes()

    await create({ user: COORDINADOR, body, file: { buffer: JPG } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('debe responder 404 cuando el proyecto no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '99' }, file: { buffer: JPG } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('debe rechazar una actividad de otro proyecto', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([[{ id_operario: 10, id_fase_proyecto: 70, id_proyecto: 8 }]])
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7', id_programacion: '50' }, file: { buffer: JPG } }, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'La actividad no pertenece a este proyecto' })
  })

  it('debe rechazar una actividad que no corresponde a la fase indicada', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([[{ id_operario: 10, id_fase_proyecto: 70, id_proyecto: 7 }]])
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7', id_programacion: '50', id_fase_proyecto: '71' }, file: { buffer: JPG } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'La actividad no corresponde a esa fase' })
  })

  it('debe rechazar una fase de otro proyecto', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([[]]) // la fase no está en el proyecto 7
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7', id_fase_proyecto: '80' }, file: { buffer: JPG } }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'La fase no pertenece a este proyecto' })
  })
})

describe('evidencias.create: quién puede adjuntar', () => {
  it('debe permitir al operario adjuntar a su propia actividad (sin acciones de editar) y tomar la fase de la actividad', async () => {
    // Arrange
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([[{ id_operario: 10, id_fase_proyecto: 70, id_proyecto: 7 }]])
      .mockResolvedValueOnce([[{ id_usuario_asignado: null }]])
      .mockResolvedValueOnce([{ insertId: 5 }])
      .mockResolvedValueOnce([[{ id_evidencia: 5, autor: 'Soldador 1' }]])
    const res = crearRes()

    // Act
    await create({ user: OPERARIO, body: { id_proyecto: '7', id_programacion: '50', descripcion: '  Soldadura lista  ' },
      file: { buffer: PNG, originalname: 'IMG_1.png' } }, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(tieneAccion).not.toHaveBeenCalled() // le basta con ser el operario de la actividad
    const [, params] = pool.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO evidencias_fotograficas'))
    const [idProyecto, idFase, idProg, archivo, original, descripcion, autor] = params
    expect([idProyecto, idFase, idProg]).toEqual([7, 70, 50])
    expect(archivo).toMatch(/^[0-9a-f-]{36}\.png$/) // nombre generado en el servidor, no el original
    expect([original, descripcion, autor]).toEqual(['IMG_1.png', 'Soldadura lista', 10])
    expect(mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    expect(writeFile).toHaveBeenCalledWith(expect.stringContaining(archivo), PNG)
  })

  it('debe permitir a la persona asignada a la fase (Diseño o Compra)', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([[{ id_usuario_asignado: 10 }]])
      .mockResolvedValueOnce([{ insertId: 6 }])
      .mockResolvedValueOnce([[{ id_evidencia: 6 }]])
    const res = crearRes()

    await create({ user: OPERARIO, body: { id_proyecto: '7', id_fase_proyecto: '1' }, file: { buffer: JPG } }, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(tieneAccion).not.toHaveBeenCalled()
  })

  it('debe permitir a quien tiene "editar" en proyectos', async () => {
    tieneAccion.mockResolvedValueOnce(true)
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockResolvedValueOnce([{ insertId: 7 }])
      .mockResolvedValueOnce([[{ id_evidencia: 7 }]])
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7' }, file: { buffer: WEBP } }, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(tieneAccion).toHaveBeenCalledWith('Coordinador de Planta', 'proyectos', 'editar')
  })

  it('debe responder 403 a quien no edita ni es operario o responsable, sin guardar nada', async () => {
    tieneAccion.mockResolvedValue(false)
    pool.query.mockResolvedValueOnce([[{ id_proyecto: 7 }]])
    const res = crearRes()

    await create({ user: { id: 20, rol: 'Ejecutivo Comercial' }, body: { id_proyecto: '7' }, file: { buffer: JPG } }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('debe borrar el archivo ya escrito si falla el INSERT, para no dejarlo huérfano', async () => {
    tieneAccion.mockResolvedValueOnce(true)
    pool.query
      .mockResolvedValueOnce([[{ id_proyecto: 7 }]])
      .mockRejectedValueOnce(new Error('ER_LOCK_DEADLOCK'))
    const res = crearRes()

    await create({ user: COORDINADOR, body: { id_proyecto: '7' }, file: { buffer: JPG } }, res)

    expect(unlink).toHaveBeenCalledWith(expect.stringContaining(writeFile.mock.calls[0][0].split('/').pop()))
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

describe('evidencias.getArchivo', () => {
  it('debe responder 404 cuando la foto no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    await getArchivo({ params: { id: 1 } }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('debe enviar el archivo desde la carpeta de evidencias, sin caché pública y con nosniff', async () => {
    pool.query.mockResolvedValueOnce([[{ archivo: 'abc.jpg' }]])
    const res = crearRes()
    res.sendFile = vi.fn()

    await getArchivo({ params: { id: 1 } }, res)

    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'private, max-age=86400')
    expect(res.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
    const [archivo, opciones, alTerminar] = res.sendFile.mock.calls[0]
    expect(archivo).toBe('abc.jpg')
    expect(opciones.root).toMatch(/uploads[\\/]evidencias/)

    // Si el archivo no está en disco, responde 404 en JSON
    alTerminar(new Error('ENOENT'))
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

describe('evidencias.remove', () => {
  it('debe permitir al autor borrar su foto, de la base y del disco', async () => {
    pool.query
      .mockResolvedValueOnce([[{ archivo: 'abc.jpg', id_autor: 10 }]])
      .mockResolvedValueOnce([{}])
    const res = crearRes()

    await remove({ params: { id: 1 }, user: OPERARIO }, res)

    expect(res.json).toHaveBeenCalledWith({ message: 'Foto eliminada' })
    expect(unlink).toHaveBeenCalledWith(expect.stringContaining('abc.jpg'))
  })

  it('debe responder 403 a quien no es el autor ni puede eliminar proyectos', async () => {
    tieneAccion.mockResolvedValueOnce(false)
    pool.query.mockResolvedValueOnce([[{ archivo: 'abc.jpg', id_autor: 1 }]])
    const res = crearRes()

    await remove({ params: { id: 1 }, user: OPERARIO }, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(unlink).not.toHaveBeenCalled()
  })

  it('debe responder 404 cuando la foto no existe', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = crearRes()

    await remove({ params: { id: 1 }, user: OPERARIO }, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
