import { describe, expect, it } from 'vitest'
import {
  celdaFecha,
  crearRegistroSimulado,
  estaOcupadoSimulado,
  leerFilas,
  marcarOcupadoSimulado,
  resolverFila,
  valoresParaMostrar,
} from '../src/utils/importProgramacion.js'

// Catálogos de prueba: reemplazan lo que cargarContexto() trae de MySQL
const ctx = {
  operarios: [{ id_usuario: 7, codigo_empleado: 'EMP-007', nombre: 'Martín Pérez' }],
  maquinas: [{ id_maquina: 3, codigo: 'MAQ-03', nombre: 'Dobladora' }],
  proyectos: [{ id_proyecto: 10, nombre: 'Exhibidor Postobón' }],
}

// Fases del proyecto 10 ya cargadas: así resolverFila no consulta la BD
const fasesProyecto10 = [
  { id_fase_proyecto: 100, fase_nombre: 'Corte', item_producto: 'Góndola' },
  { id_fase_proyecto: 101, fase_nombre: 'Soldadura', item_producto: 'Góndola' },
  { id_fase_proyecto: 102, fase_nombre: 'Soldadura', item_producto: 'Rack' },
]
const nuevoCache = () => new Map([[10, fasesProyecto10]])

const filaValida = {
  Fecha: '2026-11-03',
  Operario: 'EMP-007',
  Maquina: 'MAQ-03',
  Proyecto: 'Exhibidor Postobón',
  Item: '',
  Fase: 'Corte',
  TiempoEstimado: 240,
  Observaciones: '  Primer turno  ',
}

describe('celdaFecha', () => {
  it('debe convertir una fecha de Excel (Date) a AAAA-MM-DD', () => {
    // Arrange
    const fechaExcel = new Date(2026, 1, 9)

    // Act
    const fecha = celdaFecha(fechaExcel)

    // Assert
    expect(fecha).toBe('2026-02-09')
  })

  it.each([
    ['un texto válido', '2026-11-03', '2026-11-03'],
    ['un texto con espacios', '  2026-11-03  ', '2026-11-03'],
    ['el formato día/mes/año', '03/11/2026', null],
    ['un mes de un dígito', '2026-1-03', null],
    ['un texto vacío', '', null],
    ['null', null, null],
  ])('con %s (%s) devuelve %s', (_caso, valor, esperado) => {
    expect(celdaFecha(valor)).toBe(esperado)
  })
})

describe('resolverFila', () => {
  it('debe armar el turno con los IDs del operario, la máquina, el proyecto y la fase', async () => {
    // Arrange
    const fila = { ...filaValida }

    // Act
    const { payload, error } = await resolverFila(fila, ctx, nuevoCache())

    // Assert
    expect(error).toBeUndefined()
    expect(payload).toEqual({
      fecha: '2026-11-03',
      id_operario: 7,
      id_maquina: 3,
      id_proyecto: 10,
      id_fase_proyecto: 100,
      tiempo_estimado: 240,
      observaciones: 'Primer turno',
    })
  })

  it('debe encontrar al operario por nombre sin importar mayúsculas ni espacios', async () => {
    const fila = { ...filaValida, Operario: '  MARTÍN PÉREZ ' }

    const { payload } = await resolverFila(fila, ctx, nuevoCache())

    expect(payload.id_operario).toBe(7)
  })

  it('debe permitir un turno sin máquina ni proyecto', async () => {
    const fila = { Fecha: '2026-11-03', Operario: 'EMP-007' }

    const { payload } = await resolverFila(fila, ctx, nuevoCache())

    expect(payload).toMatchObject({ id_maquina: null, id_proyecto: null, id_fase_proyecto: null, observaciones: null })
  })

  it.each([
    ['la fecha no es válida', { Fecha: '03/11/2026' }, 'Fecha inválida'],
    ['falta el operario', { Operario: '' }, 'Falta el operario'],
    ['el operario no existe', { Operario: 'EMP-999' }, 'Operario "EMP-999" no encontrado'],
    ['la máquina no existe', { Maquina: 'MAQ-99' }, 'Máquina "MAQ-99" no encontrada'],
    ['el proyecto no existe', { Proyecto: 'Otro proyecto' }, 'Proyecto "Otro proyecto" no encontrado'],
    ['la fase no existe en el proyecto', { Fase: 'Pintura' }, 'Fase "Pintura" no encontrada'],
    ['la fase está en varios ítems y no se indica cuál', { Fase: 'Soldadura' }, 'es ambigua'],
  ])('debe devolver un error cuando %s', async (_caso, cambios, mensaje) => {
    // Arrange
    const fila = { ...filaValida, ...cambios }

    // Act
    const { payload, error } = await resolverFila(fila, ctx, nuevoCache())

    // Assert
    expect(payload).toBeUndefined()
    expect(error).toContain(mensaje)
  })

  it('debe resolver una fase repetida cuando la fila indica el ítem', async () => {
    const fila = { ...filaValida, Fase: 'Soldadura', Item: 'Rack' }

    const { payload } = await resolverFila(fila, ctx, nuevoCache())

    expect(payload.id_fase_proyecto).toBe(102)
  })

  it.each([
    ['1 minuto (valor límite válido)', 1, 1],
    ['0 minutos (valor límite inválido)', 0, 480],
    ['un número negativo', -30, 480],
    ['un texto', 'mucho', 480],
    ['vacío', '', 480],
  ])('con un tiempo estimado de %s (%s) usa %s minutos', async (_caso, tiempo, esperado) => {
    const fila = { ...filaValida, TiempoEstimado: tiempo }

    const { payload } = await resolverFila(fila, ctx, nuevoCache())

    expect(payload.tiempo_estimado).toBe(esperado)
  })
})

describe('registro simulado de ocupación', () => {
  it('debe detectar que un operario ya fue asignado ese mismo día en el archivo', () => {
    // Arrange
    const registro = crearRegistroSimulado()
    marcarOcupadoSimulado(registro, 'operarios', 7, '2026-11-03')

    // Act
    const mismoDia = estaOcupadoSimulado(registro, 'operarios', 7, '2026-11-03')
    const otroDia = estaOcupadoSimulado(registro, 'operarios', 7, '2026-11-04')
    const maquinaConMismoId = estaOcupadoSimulado(registro, 'maquinas', 7, '2026-11-03')

    // Assert
    expect(mismoDia).toBe(true)
    expect(otroDia).toBe(false)
    expect(maquinaConMismoId).toBe(false)
  })
})

describe('valoresParaMostrar', () => {
  it('debe convertir la fila a texto y mostrar las fechas de Excel como AAAA-MM-DD', () => {
    const fila = { Fecha: new Date(2026, 10, 3), Operario: 'EMP-007', TiempoEstimado: 240 }

    const valores = valoresParaMostrar(fila)

    expect(valores).toEqual({
      Fecha: '2026-11-03',
      Operario: 'EMP-007',
      Maquina: '',
      Proyecto: '',
      Item: '',
      Fase: '',
      TiempoEstimado: '240',
      Observaciones: '',
    })
  })
})

describe('leerFilas', () => {
  it('debe leer un CSV, conservar el número de fila real y saltar las filas vacías', async () => {
    // Arrange
    const csv = 'Fecha,Operario,Maquina\n2026-11-03,EMP-007,MAQ-03\n,,\n2026-11-04,EMP-007,\n'

    // Act
    const { columnas, filas } = await leerFilas(Buffer.from(csv), 'turnos.csv')

    // Assert
    expect(columnas).toEqual(['Fecha', 'Operario', 'Maquina'])
    expect(filas).toHaveLength(2)
    expect(filas[0]).toMatchObject({ __fila: 2, Operario: 'EMP-007', Maquina: 'MAQ-03' })
    expect(filas[1].__fila).toBe(4)
  })

  it('debe rechazar un archivo al que le faltan columnas requeridas', async () => {
    const csv = 'Fecha,Operario\n2026-11-03,EMP-007\n'

    await expect(leerFilas(Buffer.from(csv), 'turnos.csv'))
      .rejects.toThrow('El archivo no tiene las columnas requeridas: Maquina')
  })
})
