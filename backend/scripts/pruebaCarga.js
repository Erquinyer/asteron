// Prueba de rendimiento y concurrencia (RNF-08 y RNF-09).
//
// Simula USUARIOS personas conectadas al mismo tiempo, cada una con su propia sesión,
// que recorren sin pausa las consultas que más se usan en el día a día (dashboard,
// proyectos, pedidos, programación, alertas…) durante DURACION segundos.
//
// Criterios de aceptación:
//   RNF-08: el 95 % de las consultas responde en 2 s o menos  → p95 ≤ 2000 ms
//   RNF-09: soporta 30 usuarios concurrentes                  → 0 % de respuestas con error
//
// Uso (con el backend corriendo):
//   node scripts/pruebaCarga.js
//   USUARIOS=50 DURACION=60 API_URL=http://localhost:3000/api node scripts/pruebaCarga.js
//
// Termina con código 1 si no se cumple alguno de los criterios.
import { hoyISO } from '../src/utils/dates.js'

const API_URL   = process.env.API_URL  || 'http://localhost:3000/api'
const USUARIOS  = Number(process.env.USUARIOS)  || 30
const DURACION  = Number(process.env.DURACION)  || 30
const CORREO    = process.env.CORREO   || 'admin@macromet.com.co'
const CLAVE     = process.env.CLAVE    || 'admin2026'
const LIMITE_MS = 2000

const percentil = (ordenados, p) =>
  ordenados.length ? ordenados[Math.min(ordenados.length - 1, Math.ceil(ordenados.length * p) - 1)] : 0

const iniciarSesion = async () => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: CORREO, contrasena: CLAVE }),
  })
  if (!res.ok) throw new Error(`No se pudo iniciar sesión (${res.status}): ${await res.text()}`)
  return (await res.json()).user.token
}

const run = async () => {
  console.log(`Prueba de carga contra ${API_URL}`)
  console.log(`${USUARIOS} usuarios concurrentes · ${DURACION} s · usuario ${CORREO}\n`)

  // Cada usuario virtual tiene su propia sesión, como una persona real en su equipo
  const tokens = await Promise.all(Array.from({ length: USUARIOS }, iniciarSesion))

  // El detalle de proyecto es la pantalla más pesada (fases por ítem + actividades)
  const proyectos = await (await fetch(`${API_URL}/proyectos`, {
    headers: { Authorization: `Bearer ${tokens[0]}` },
  })).json()
  const idProyecto = proyectos[0]?.id_proyecto

  const consultas = [
    '/dashboard/stats',
    '/dashboard/counts',
    '/notificaciones',
    '/proyectos',
    idProyecto && `/proyectos/${idProyecto}`,
    '/pedidos',
    '/clientes',
    '/maquinaria',
    '/mantenimientos',
    `/programacion?fecha=${hoyISO()}`,
    `/programacion/ocupados?fecha=${hoyISO()}`,
    '/reportes/horas',
  ].filter(Boolean)

  const medidas = new Map(consultas.map(c => [c, { tiempos: [], errores: 0 }]))
  const fin = Date.now() + DURACION * 1000

  const usuarioVirtual = async (token, inicio) => {
    // Cada usuario arranca en una consulta distinta para no golpear todos el mismo endpoint a la vez
    for (let i = inicio; Date.now() < fin; i++) {
      const ruta = consultas[i % consultas.length]
      const medida = medidas.get(ruta)
      const t0 = performance.now()
      try {
        const res = await fetch(API_URL + ruta, { headers: { Authorization: `Bearer ${token}` } })
        await res.arrayBuffer()   // se cuenta el tiempo hasta recibir la respuesta completa
        medida.tiempos.push(performance.now() - t0)
        if (!res.ok) medida.errores++
      } catch {
        medida.tiempos.push(performance.now() - t0)
        medida.errores++
      }
    }
  }

  const t0 = performance.now()
  await Promise.all(tokens.map((token, i) => usuarioVirtual(token, i)))
  const segundos = (performance.now() - t0) / 1000

  // ── Resultados ─────────────────────────────────────────────
  const fila = (nombre, tiempos, errores) => {
    const o = [...tiempos].sort((a, b) => a - b)
    return {
      consulta: nombre,
      peticiones: o.length,
      'p50 (ms)': Math.round(percentil(o, 0.5)),
      'p95 (ms)': Math.round(percentil(o, 0.95)),
      'máx (ms)': Math.round(o.at(-1) ?? 0),
      errores,
    }
  }

  const todos  = [...medidas.values()].flatMap(m => m.tiempos)
  const errores = [...medidas.values()].reduce((s, m) => s + m.errores, 0)
  const total  = fila('TOTAL', todos, errores)

  console.table([...[...medidas].map(([ruta, m]) => fila(ruta, m.tiempos, m.errores)), total])

  const enLimite   = todos.filter(t => t <= LIMITE_MS).length
  const pctLimite  = (enLimite / todos.length) * 100
  const pctErrores = (errores / todos.length) * 100
  const cumple08   = total['p95 (ms)'] <= LIMITE_MS
  const cumple09   = errores === 0

  console.log(`\nRendimiento: ${Math.round(todos.length / segundos)} peticiones/s en ${segundos.toFixed(1)} s`)
  console.log(`Consultas en ≤ ${LIMITE_MS} ms: ${pctLimite.toFixed(2)} % · errores: ${pctErrores.toFixed(2)} %\n`)
  console.log(`${cumple08 ? '✅' : '❌'} RNF-08: p95 = ${total['p95 (ms)']} ms (criterio ≤ ${LIMITE_MS} ms)`)
  console.log(`${cumple09 ? '✅' : '❌'} RNF-09: ${USUARIOS} usuarios concurrentes con ${errores} errores (criterio: 0)`)

  process.exit(cumple08 && cumple09 ? 0 : 1)
}

run().catch(e => { console.error(e.message); process.exit(1) })
