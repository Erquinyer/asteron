import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

// Semana 6 · David · capa BD — integración de PEDIDOS contra MySQL real.
//
// Lo que estas pruebas cubren y las de controlador (con la BD simulada) no
// pueden cubrir: que la transacción de verdad deshace todo, que las FK y los
// ON DELETE CASCADE / SET NULL / RESTRICT del esquema se comportan como el
// código asume, y que los límites reales de las columnas (VARCHAR, ENUM) se
// traducen en un error claro y no en un 500.
//
// Requiere la BD de pruebas desechable levantada:
//
//   docker compose up -d --wait mysql-test
//
// Las variables de entorno se fijan ANTES de importar app.js porque el pool
// se crea al importar config/db.js.
process.env.DB_HOST     = '127.0.0.1'
process.env.DB_PORT     = '3308'
process.env.DB_USER     = 'root'
process.env.DB_PASSWORD = 'asteron_test'
process.env.DB_NAME     = 'asteron'
process.env.JWT_SECRET  = process.env.JWT_SECRET || 'secreto-de-pruebas'

const { default: app }  = await import('../../src/app.js')
const { default: pool } = await import('../../src/config/db.js')

const token = () => jwt.sign(
  { id: 1, correo: 'test@macromet.com.co', rol: 'Administrador Sistema' },
  process.env.JWT_SECRET
)

const api = {
  crear:      (body)     => request(app).post('/api/pedidos').set('Authorization', `Bearer ${token()}`).send(body),
  leer:       (id)       => request(app).get(`/api/pedidos/${id}`).set('Authorization', `Bearer ${token()}`),
  editar:     (id, body) => request(app).put(`/api/pedidos/${id}`).set('Authorization', `Bearer ${token()}`).send(body),
  eliminar:   (id)       => request(app).delete(`/api/pedidos/${id}`).set('Authorization', `Bearer ${token()}`),
  borrarCliente: (id)    => request(app).delete(`/api/clientes/${id}`).set('Authorization', `Bearer ${token()}`),
}

const contar = async (tabla, where = '1=1', params = []) => {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${tabla} WHERE ${where}`, params)
  return total
}

// Borra en orden seguro para las FK (de hijas a padres). DELETE y no TRUNCATE:
// InnoDB rechaza TRUNCATE en tablas referenciadas por una FK.
const limpiar = async () => {
  await pool.query('DELETE FROM actividades')
  await pool.query('DELETE FROM fases_proyecto')
  await pool.query('DELETE FROM proyectos')
  await pool.query('DELETE FROM detalle_pedido')
  await pool.query('DELETE FROM pedidos')
  await pool.query('DELETE FROM clientes')
}

// El esquema no trae datos de catálogo: las fases estándar se siembran aquí.
// Diseño y Compra (orden 1 y 2) son del proyecto; Corte y Despacho van por ítem.
const sembrarFasesEstandar = async () => {
  await pool.query('DELETE FROM fases_estandar')
  await pool.query(
    `INSERT INTO fases_estandar (nombre, orden, requiere_turno) VALUES
     ('Diseño', 1, 0), ('Compra', 2, 0), ('Corte', 3, 1), ('Despacho', 4, 1)`)
}

const crearCliente = async (nombre = 'Castrol Colombia') => {
  const [r] = await pool.query('INSERT INTO clientes (nombre) VALUES (?)', [nombre])
  return r.insertId
}

// Crea el proyecto del pedido con las fases por ítem, igual que lo hace
// proyectos.controller.js (Corte y Despacho por cada ítem del pedido).
const crearProyectoConFases = async (id_pedido) => {
  const [p] = await pool.query(
    'INSERT INTO proyectos (nombre, id_pedido) VALUES (?, ?)', ['Proyecto de prueba', id_pedido])
  await pool.query(
    `INSERT INTO fases_proyecto (id_proyecto, id_fase_estandar, id_detalle_pedido, estado, porcentaje_avance)
     SELECT ?, fe.id_fase_estandar, dp.id_detalle, 'pendiente', 0
     FROM detalle_pedido dp CROSS JOIN fases_estandar fe
     WHERE dp.id_pedido = ? AND fe.orden > 2`, [p.insertId, id_pedido])
  return p.insertId
}

const fasesDelItem = async (id_detalle) => {
  const [rows] = await pool.query(
    'SELECT id_fase_proyecto, porcentaje_avance FROM fases_proyecto WHERE id_detalle_pedido = ? ORDER BY id_fase_proyecto',
    [id_detalle])
  return rows
}

const FECHA_FUTURA = '2999-03-10'
const texto = (n) => 'x'.repeat(n)

describe('Integración — pedidos contra MySQL real (sin doble de la BD)', () => {
  let idCliente

  beforeAll(async () => {
    await pool.query('SELECT 1').catch((err) => {
      throw new Error(
        `No se pudo conectar a la BD de pruebas en ${process.env.DB_HOST}:${process.env.DB_PORT}. ` +
        `Levántala con "docker compose up -d --wait mysql-test". Causa: ${err.message}`
      )
    })
    await limpiar()
    await sembrarFasesEstandar()
  })

  beforeEach(async () => {
    await limpiar()
    idCliente = await crearCliente()
  })

  afterAll(async () => {
    await limpiar()
    await pool.query('DELETE FROM fases_estandar')
    await pool.end()
  })

  describe('POST /api/pedidos', () => {
    it('guarda el pedido y sus ítems en la BD y los devuelve al leerlo', async () => {
      // Arrange
      const body = {
        id_cliente: idCliente,
        descripcion: 'Góndolas para bodega',
        items: [
          { producto: 'Góndola', cantidad: 4, fecha_entrega_estimada: FECHA_FUTURA },
          { producto: 'Rack', punto_descargue: 'Bodega 2' },
          { producto: '   ' },
        ],
      }

      // Act
      const creado = await api.crear(body)
      const leido  = await api.leer(creado.body.id_pedido)

      // Assert
      expect(creado.status).toBe(201)
      expect(creado.body).toMatchObject({ cliente: 'Castrol Colombia', estado: 'pendiente', total_items: 2 })
      expect(leido.body.items.map(it => it.producto)).toEqual(['Góndola', 'Rack'])
      expect(leido.body.items[1].cantidad).toBe(1)
      expect(await contar('pedidos', 'id_pedido = ? AND fecha_pedido = CURDATE()', [creado.body.id_pedido])).toBe(1)
    })

    it('acepta un producto con exactamente 120 caracteres (el límite de la columna)', async () => {
      const res = await api.crear({ id_cliente: idCliente, items: [{ producto: texto(120) }] })

      expect(res.status).toBe(201)
      expect(await contar('detalle_pedido')).toBe(1)
    })

    it('si un ítem falla en la BD, deshace todo: no queda el pedido a medias', async () => {
      // Arrange: el primer ítem es válido; el segundo excede VARCHAR(120)
      const body = {
        id_cliente: idCliente,
        items: [{ producto: 'Góndola' }, { producto: texto(121) }],
      }

      // Act
      const res = await api.crear(body)

      // Assert: ni el pedido ni el primer ítem quedaron guardados
      expect(res.status).toBe(400)
      expect(await contar('pedidos')).toBe(0)
      expect(await contar('detalle_pedido')).toBe(0)
    })

    it.each([
      ['producto (VARCHAR 120)',        { items: [{ producto: texto(121) }] }],
      ['punto_descargue (VARCHAR 150)', { items: [{ producto: 'Rack', punto_descargue: texto(151) }] }],
      ['descripcion (VARCHAR 255)',     { descripcion: texto(256), items: [] }],
    ])('responde 400 con un mensaje claro cuando %s supera su longitud', async (_campo, extra) => {
      const res = await api.crear({ id_cliente: idCliente, ...extra })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Uno de los campos supera la longitud permitida')
      expect(await contar('pedidos')).toBe(0)
    })

    it('responde 400 cuando el cliente no existe (FK fk_pedido_cliente)', async () => {
      const res = await api.crear({ id_cliente: 999999, items: [{ producto: 'Rack' }] })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('El cliente seleccionado no existe')
      expect(await contar('pedidos')).toBe(0)
    })

    it('responde 400 cuando el estado del ítem no es uno de los del ENUM', async () => {
      const res = await api.crear({ id_cliente: idCliente, items: [{ producto: 'Rack', estado: 'terminado' }] })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Uno de los valores del pedido no es válido')
      expect(await contar('pedidos')).toBe(0)
    })
  })

  describe('PUT /api/pedidos/:id con un proyecto asociado', () => {
    let idPedido, idA, idB

    beforeEach(async () => {
      const creado = await api.crear({
        id_cliente: idCliente,
        descripcion: 'Original',
        items: [{ producto: 'Ítem A' }, { producto: 'Ítem B' }],
      })
      idPedido = creado.body.id_pedido
      const [items] = await pool.query(
        'SELECT id_detalle FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [idPedido])
      ;[idA, idB] = items.map(it => it.id_detalle)
      await crearProyectoConFases(idPedido)
      // El ítem A ya tiene avance registrado en su primera fase
      await pool.query(
        'UPDATE fases_proyecto SET porcentaje_avance = 50 WHERE id_detalle_pedido = ? ORDER BY id_fase_proyecto LIMIT 1', [idA])
    })

    it('conserva el id y el avance del ítem que se mantiene, borra en cascada las fases del que se quita y crea las del nuevo', async () => {
      // Arrange
      const fasesAntes = await fasesDelItem(idA)

      // Act: se edita A, se quita B y se agrega C
      const res = await api.editar(idPedido, {
        id_cliente: idCliente,
        descripcion: 'Editado',
        items: [
          { id_detalle: idA, producto: 'Ítem A (editado)' },
          { producto: 'Ítem C', fecha_entrega_estimada: FECHA_FUTURA },
        ],
      })

      // Assert
      expect(res.status).toBe(200)
      const [items] = await pool.query(
        'SELECT id_detalle, producto FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [idPedido])
      expect(items).toHaveLength(2)
      expect(items[0]).toEqual({ id_detalle: idA, producto: 'Ítem A (editado)' })

      expect(await fasesDelItem(idA)).toEqual(fasesAntes)
      expect(fasesAntes[0].porcentaje_avance).toBe(50)
      expect(await fasesDelItem(idB)).toEqual([])          // ON DELETE CASCADE
      expect(await fasesDelItem(items[1].id_detalle)).toHaveLength(2)   // Corte y Despacho del ítem nuevo
    })

    it('no duplica el ítem cuando el id_detalle llega como texto ("12" en vez de 12)', async () => {
      const res = await api.editar(idPedido, {
        id_cliente: idCliente,
        items: [
          { id_detalle: String(idA), producto: 'Ítem A (editado)' },
          { id_detalle: String(idB), producto: 'Ítem B' },
        ],
      })

      expect(res.status).toBe(200)
      const [items] = await pool.query(
        'SELECT id_detalle, producto FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle', [idPedido])
      expect(items).toEqual([
        { id_detalle: idA, producto: 'Ítem A (editado)' },
        { id_detalle: idB, producto: 'Ítem B' },
      ])
      expect(await fasesDelItem(idA)).toHaveLength(2)
    })

    it('responde 400 y no le quita el cliente al pedido cuando el cuerpo no trae id_cliente', async () => {
      const res = await api.editar(idPedido, { descripcion: 'Sin cliente' })

      expect(res.status).toBe(400)
      const [[pedido]] = await pool.query(
        'SELECT id_cliente, descripcion FROM pedidos WHERE id_pedido = ?', [idPedido])
      expect(pedido).toEqual({ id_cliente: idCliente, descripcion: 'Original' })
    })

    it('responde 409 y deshace todo al quitar un ítem cuyas fases ya tienen actividades registradas (FK RESTRICT)', async () => {
      // Arrange: un operario registró tiempo en una fase del ítem B
      const [fase] = await fasesDelItem(idB)
      await pool.query(
        'INSERT INTO actividades (id_fase, hora_inicio) VALUES (?, NOW())', [fase.id_fase_proyecto])

      // Act: se intenta guardar el pedido sin el ítem B
      const res = await api.editar(idPedido, {
        id_cliente: idCliente,
        descripcion: 'Editado',
        items: [{ id_detalle: idA, producto: 'Ítem A' }],
      })

      // Assert: nada cambió, ni la descripción ni los ítems
      expect(res.status).toBe(409)
      expect(res.body.message).toMatch(/actividades registradas/)
      expect(await contar('detalle_pedido', 'id_pedido = ?', [idPedido])).toBe(2)
      const [[pedido]] = await pool.query('SELECT descripcion FROM pedidos WHERE id_pedido = ?', [idPedido])
      expect(pedido.descripcion).toBe('Original')
    })
  })

  describe('DELETE /api/pedidos/:id y borrado del cliente', () => {
    it('borra en cascada los ítems del pedido (ON DELETE CASCADE)', async () => {
      const { body } = await api.crear({ id_cliente: idCliente, items: [{ producto: 'A' }, { producto: 'B' }] })

      const res = await api.eliminar(body.id_pedido)

      expect(res.status).toBe(200)
      expect(await contar('pedidos')).toBe(0)
      expect(await contar('detalle_pedido')).toBe(0)
    })

    it('responde 409 y no borra nada cuando el pedido tiene un proyecto asociado', async () => {
      const { body } = await api.crear({ id_cliente: idCliente, items: [{ producto: 'A' }] })
      await crearProyectoConFases(body.id_pedido)

      const res = await api.eliminar(body.id_pedido)

      expect(res.status).toBe(409)
      expect(await contar('pedidos')).toBe(1)
      expect(await contar('detalle_pedido')).toBe(1)
    })

    it('al borrar el cliente, el pedido se conserva sin cliente (ON DELETE SET NULL)', async () => {
      const { body } = await api.crear({ id_cliente: idCliente, items: [{ producto: 'A' }] })

      const borrado = await api.borrarCliente(idCliente)
      const leido   = await api.leer(body.id_pedido)

      expect(borrado.status).toBe(200)
      expect(leido.status).toBe(200)
      expect(leido.body).toMatchObject({ id_cliente: null, cliente: null, total_items: 1 })
    })
  })
})
