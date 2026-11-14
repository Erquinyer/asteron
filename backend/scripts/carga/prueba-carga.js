// ============================================================
// Prueba de carga del API (RNF-08 y RNF-09).
//
// RNF-09: el sistema debe soportar al menos 30 usuarios concurrentes.
// RNF-08: las consultas habituales deben responder en 2 s o menos en el 95 % de los casos.
//
// Simula 30 usuarios autenticados que consultan sin pausa las pantallas más usadas
// (proyectos, pedidos, clientes, programación, dashboard y alertas). Para cada
// endpoint mide la latencia y los errores, y deja el resultado en
// docs/pruebas-carga/resultado-AAAA-MM-DD.md como evidencia.
//
// Uso (con el backend corriendo y la BD con datos del seed):
//   pnpm test:carga
// Variables opcionales: CARGA_URL, CARGA_CORREO, CARGA_CONTRASENA,
//   CARGA_USUARIOS (30), CARGA_SEGUNDOS (por endpoint, 10)
// ============================================================
import autocannon from 'autocannon'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const URL_BASE   = process.env.CARGA_URL || 'http://localhost:3000'
const CORREO     = process.env.CARGA_CORREO || 'admin@macromet.com.co'
const CONTRASENA = process.env.CARGA_CONTRASENA || 'admin2026'
const USUARIOS   = Number(process.env.CARGA_USUARIOS) || 30
const SEGUNDOS   = Number(process.env.CARGA_SEGUNDOS) || 10
const LIMITE_MS  = 2000 // RNF-08

const hoy = () => {
  const d = new Date() // fecha local, no UTC
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ENDPOINTS = [
  { nombre: 'Lista de proyectos',          ruta: '/api/proyectos' },
  { nombre: 'Lista de pedidos',            ruta: '/api/pedidos' },
  { nombre: 'Lista de clientes',           ruta: '/api/clientes' },
  { nombre: 'Programación del día',        ruta: `/api/programacion?fecha=${hoy()}` },
  { nombre: 'Indicadores del dashboard',   ruta: '/api/dashboard/stats' },
  { nombre: 'Alertas',                     ruta: '/api/notificaciones' },
]

const iniciarSesion = async () => {
  let res
  try {
    res = await fetch(`${URL_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo: CORREO, contrasena: CONTRASENA }),
    })
  } catch {
    throw new Error(`No hay respuesta en ${URL_BASE}. Levanta el backend en otra terminal (pnpm dev) y vuelve a intentar.`)
  }
  if (!res.ok) throw new Error(`No se pudo iniciar sesión (${res.status}). ¿Está corriendo el backend en ${URL_BASE} y cargaste el seed?`)
  const { user } = await res.json()
  return user.token
}

const medir = (endpoint, token) => new Promise((resolve, reject) => {
  autocannon({
    url: `${URL_BASE}${endpoint.ruta}`,
    connections: USUARIOS,
    duration: SEGUNDOS,
    headers: { Authorization: `Bearer ${token}` },
  }, (err, r) => (err ? reject(err) : resolve(r)))
})

const main = async () => {
  console.log(`Prueba de carga: ${USUARIOS} usuarios concurrentes, ${SEGUNDOS} s por endpoint contra ${URL_BASE}\n`)
  const token = await iniciarSesion()
  const filas = []

  for (const endpoint of ENDPOINTS) {
    const r = await medir(endpoint, token)
    const errores = r.errors + r.timeouts + r.non2xx
    // autocannon entrega p97.5: si cumple, el p95 (más bajo) también cumple
    const cumple = r.latency.p97_5 <= LIMITE_MS && errores === 0
    filas.push({
      endpoint: endpoint.nombre,
      ruta: endpoint.ruta,
      peticiones: r.requests.total,
      porSegundo: Math.round(r.requests.average),
      promedio: Math.round(r.latency.average),
      p50: r.latency.p50,
      p97_5: r.latency.p97_5,
      max: r.latency.max,
      errores,
      cumple,
    })
    console.log(`${cumple ? 'OK   ' : 'FALLA'} ${endpoint.nombre}: p97.5 ${r.latency.p97_5} ms, ${r.requests.total} peticiones, ${errores} errores`)
  }

  const todoCumple = filas.every(f => f.cumple)
  const informe = [
    `# Prueba de carga del API — ${hoy()}`,
    '',
    `- **Usuarios concurrentes:** ${USUARIOS} (RNF-09: al menos 30)`,
    `- **Duración:** ${SEGUNDOS} s por endpoint, sin pausas entre peticiones`,
    `- **Criterio RNF-08:** el 95 % de las respuestas en ${LIMITE_MS} ms o menos (se verifica con el percentil 97,5, que es más exigente) y cero errores`,
    `- **Servidor:** ${URL_BASE}`,
    `- **Herramienta:** autocannon (\`pnpm test:carga\`, script \`backend/scripts/carga/prueba-carga.js\`)`,
    '',
    '| Endpoint | Ruta | Peticiones | Pet./s | Promedio (ms) | p50 (ms) | p97,5 (ms) | Máx. (ms) | Errores | Resultado |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|',
    ...filas.map(f => `| ${f.endpoint} | \`${f.ruta}\` | ${f.peticiones} | ${f.porSegundo} | ${f.promedio} | ${f.p50} | ${f.p97_5} | ${f.max} | ${f.errores} | ${f.cumple ? 'Cumple' : 'No cumple'} |`),
    '',
    `**Resultado general:** ${todoCumple ? 'cumple RNF-08 y RNF-09' : 'NO cumple: revisar los endpoints marcados'}.`,
    '',
  ].join('\n')

  const carpeta = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../docs/pruebas-carga')
  await mkdir(carpeta, { recursive: true })
  const archivo = path.join(carpeta, `resultado-${hoy()}.md`)
  await writeFile(archivo, informe)
  console.log(`\nInforme guardado en ${path.relative(process.cwd(), archivo)}`)
  process.exitCode = todoCumple ? 0 : 1
}

main().catch(err => { console.error(err.message); process.exitCode = 1 })
