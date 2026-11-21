import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Semana 6 · Nixon · capa BD — integración de MANTENIMIENTOS contra MySQL real,
// no un pool simulado. Requiere la BD de pruebas desechable levantada:
//
//   docker compose up -d --wait mysql-test
//
// Se apunta a esa BD ANTES de importar app.js (su pool se crea al importarse
// config/db.js). Es la BD de pruebas (puerto 3308), nunca la de desarrollo.
process.env.DB_HOST     = '127.0.0.1'
process.env.DB_PORT     = '3308'
process.env.DB_USER     = 'root'
process.env.DB_PASSWORD = 'asteron_test'
process.env.DB_NAME     = 'asteron'
process.env.JWT_SECRET  = process.env.JWT_SECRET || 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

// Marcas propias de este archivo: la limpieza solo toca lo que este archivo crea.
const CORREO_TECNICO = 'tecnico.s6.nixon@test.com'
const PREFIJO_CODIGO = 'S6-NX-'

let idTecnico   // usuario real en la BD: mantenimientos.realizado_por es una llave foránea
let contador = 0

const token = () => jwt.sign(
  { id: idTecnico, correo: CORREO_TECNICO, rol: 'Administrador Sistema' },
  process.env.JWT_SECRET
)

// mysql2 entrega las columnas DATE como Date a medianoche LOCAL: se lee con los
// métodos locales para que el test dé lo mismo en cualquier zona horaria.
const dia = (valor) => {
  const d = new Date(valor)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const conToken = (req) => req.set('Authorization', `Bearer ${token()}`)

// Cada test crea sus propias máquinas: ningún test usa ids que no haya insertado él mismo.
const crearMaquina = async (estado = 'activa') => {
  contador += 1
  const [r] = await pool.query(
    'INSERT INTO maquinaria (nombre, codigo, estado) VALUES (?,?,?)',
    [`Máquina de prueba ${contador}`, `${PREFIJO_CODIGO}${contador}`, estado])
  return r.insertId
}

const insertarMantenimiento = (idMaquina, fecha, tipo = 'preventivo') =>
  pool.query(
    'INSERT INTO mantenimientos (id_maquina, fecha, tipo, realizado_por) VALUES (?,?,?,?)',
    [idMaquina, fecha, tipo, idTecnico])

// Limpieza EXPLÍCITA antes de cada test: DELETE (no TRUNCATE, que InnoDB rechaza
// con llaves foráneas). Orden: primero los hijos (mantenimientos), luego los padres.
const limpiar = async () => {
  await pool.query('DELETE FROM mantenimientos')
  await pool.query('DELETE FROM maquinaria WHERE codigo LIKE ?', [`${PREFIJO_CODIGO}%`])
  await pool.query('DELETE FROM usuarios WHERE correo = ?', [CORREO_TECNICO])
}

describe('Integración — mantenimientos contra MySQL real (sin doble de la BD)', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1').catch((err) => {
      throw new Error(
        `No se pudo conectar a la BD de pruebas en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        `Levántala con "docker compose up -d --wait mysql-test". Causa: ${err.message}`
      )
    })
  })

  beforeEach(async () => {
    await limpiar()
    // El técnico que firma los mantenimientos existe de verdad en la BD
    const [u] = await pool.query(
      'INSERT INTO usuarios (nombre, correo, password_hash) VALUES (?,?,?)',
      ['Técnico de pruebas', CORREO_TECNICO, 'hash-de-prueba'])
    idTecnico = u.insertId
  })

  afterAll(async () => {
    await limpiar()
    await pool.end()
  })

  // ── Caso feliz verificado EN LA BD (no solo en la respuesta) ─────────────────
  it('registra un mantenimiento preventivo y la fila queda guardada en la BD', async () => {
    // Arrange
    const idMaquina = await crearMaquina()

    // Act
    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: idMaquina, fecha: '2026-10-21', tipo: 'preventivo', descripcion: 'Cambio de aceite' })

    // Assert: la respuesta y, sobre todo, lo que realmente hay en la tabla
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ tecnico: 'Técnico de pruebas', maquina: `Máquina de prueba ${contador}` })
    const [filas] = await pool.query('SELECT * FROM mantenimientos WHERE id_maquina = ?', [idMaquina])
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ tipo: 'preventivo', descripcion: 'Cambio de aceite', realizado_por: idTecnico })
    const [[maquina]] = await pool.query('SELECT estado FROM maquinaria WHERE id_maquina = ?', [idMaquina])
    expect(maquina.estado).toBe('activa') // un preventivo no cambia el estado
  })

  it('un mantenimiento correctivo deja la máquina "en_mantenimiento" en la BD', async () => {
    const idMaquina = await crearMaquina('activa')

    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: idMaquina, fecha: '2026-10-21', tipo: 'correctivo' })

    expect(res.status).toBe(201)
    const [[maquina]] = await pool.query('SELECT estado FROM maquinaria WHERE id_maquina = ?', [idMaquina])
    expect(maquina.estado).toBe('en_mantenimiento')
  })

  // ── Consultas propias: filtro por máquina y orden ────────────────────────────
  it('lista solo los mantenimientos de la máquina pedida, del más reciente al más antiguo', async () => {
    // Arrange: dos máquinas; fechas insertadas a propósito en desorden
    const maquinaA = await crearMaquina()
    const maquinaB = await crearMaquina()
    await insertarMantenimiento(maquinaA, '2026-03-10')
    await insertarMantenimiento(maquinaA, '2026-09-01')
    await insertarMantenimiento(maquinaA, '2026-06-15')
    await insertarMantenimiento(maquinaB, '2026-12-25') // NO debe aparecer en la lista de A

    // Act
    const res = await conToken(request(app).get(`/api/mantenimientos/maquina/${maquinaA}`))

    // Assert
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(3)
    expect(res.body.map(m => dia(m.fecha))).toEqual(['2026-09-01', '2026-06-15', '2026-03-10'])
    expect(res.body.every(m => m.id_maquina === maquinaA)).toBe(true)
  })

  // ── Restricciones de la tabla ────────────────────────────────────────────────
  it('NOT NULL: sin fecha responde 400 y no guarda nada', async () => {
    const idMaquina = await crearMaquina()

    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: idMaquina, tipo: 'preventivo' })

    expect(res.status).toBe(400)
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM mantenimientos')
    expect(total).toBe(0)
  })

  it('LLAVE FORÁNEA: una máquina que no existe responde 404 (HALLAZGO: antes respondía 500)', async () => {
    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: 99999999, fecha: '2026-10-21', tipo: 'preventivo' })

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('La máquina no existe')
  })

  it('ENUM: un tipo que la BD no acepta responde 400 (HALLAZGO: antes respondía 500)', async () => {
    const idMaquina = await crearMaquina()

    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: idMaquina, fecha: '2026-10-21', tipo: 'mantenimiento' })

    expect(res.status).toBe(400)
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM mantenimientos')
    expect(total).toBe(0)
  })

  it('DATE: una fecha imposible (mes 13) responde 400 (HALLAZGO: antes respondía 500)', async () => {
    const idMaquina = await crearMaquina()

    const res = await conToken(request(app).post('/api/mantenimientos'))
      .send({ id_maquina: idMaquina, fecha: '2026-13-45', tipo: 'preventivo' })

    expect(res.status).toBe(400)
  })

  it('RESTRICT: la BD no deja borrar una máquina que ya tiene historial de mantenimiento', async () => {
    // Arrange
    const idMaquina = await crearMaquina()
    await insertarMantenimiento(idMaquina, '2026-10-21')

    // Act + Assert: se prueba directo contra la BD, la restricción vive en la tabla
    await expect(pool.query('DELETE FROM maquinaria WHERE id_maquina = ?', [idMaquina]))
      .rejects.toHaveProperty('code', 'ER_ROW_IS_REFERENCED_2')
  })

  it('al borrar un mantenimiento desaparece de la BD; uno inexistente responde 404', async () => {
    // Arrange
    const idMaquina = await crearMaquina()
    const [r] = await insertarMantenimiento(idMaquina, '2026-10-21')

    // Act
    const borrado = await conToken(request(app).delete(`/api/mantenimientos/${r.insertId}`))
    const repetido = await conToken(request(app).delete(`/api/mantenimientos/${r.insertId}`))

    // Assert
    expect(borrado.status).toBe(200)
    expect(repetido.status).toBe(404)
    const [filas] = await pool.query('SELECT 1 FROM mantenimientos WHERE id_mantenimiento = ?', [r.insertId])
    expect(filas).toHaveLength(0)
  })
})