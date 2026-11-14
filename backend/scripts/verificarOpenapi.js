// Comprueba que la documentación OpenAPI (src/docs/openapi.js) esté al día con
// las rutas registradas en Express (src/routes/*.js).
//
// Uso: pnpm verificar-openapi
// Termina con código 1 si hay rutas sin documentar o documentadas que ya no existen.
import { readdir } from 'node:fs/promises'
import { openapi } from '../src/docs/openapi.js'

const METODOS = ['get', 'post', 'put', 'patch', 'delete']

// Express usa /:id y OpenAPI /{id}: se normalizan ambos al mismo formato
const normalizar = (ruta) => ruta.replace(/:(\w+)/g, '{$1}').replace(/\/$/, '') || '/'

// Rutas reales: cada routes/<nombre>.routes.js se monta en /api/<nombre> (ver app.js)
const reales = new Set(['GET /health'])
const archivos = (await readdir(new URL('../src/routes/', import.meta.url))).filter(f => f.endsWith('.routes.js'))
for (const archivo of archivos) {
  const prefijo = `/${archivo.replace('.routes.js', '')}`
  const { default: router } = await import(`../src/routes/${archivo}`)
  for (const capa of router.stack) {
    if (!capa.route) continue
    for (const metodo of Object.keys(capa.route.methods)) {
      reales.add(`${metodo.toUpperCase()} ${normalizar(prefijo + capa.route.path)}`)
    }
  }
}

const documentadas = new Set()
for (const [ruta, operaciones] of Object.entries(openapi.paths)) {
  for (const metodo of Object.keys(operaciones).filter(m => METODOS.includes(m))) {
    documentadas.add(`${metodo.toUpperCase()} ${ruta}`)
  }
}

const sinDocumentar = [...reales].filter(r => !documentadas.has(r)).sort()
const sobrantes     = [...documentadas].filter(r => !reales.has(r)).sort()

console.log(`Rutas en Express: ${reales.size} · documentadas: ${documentadas.size}`)
if (sinDocumentar.length) console.log('\n❌ Sin documentar en openapi.js:\n  ' + sinDocumentar.join('\n  '))
if (sobrantes.length)     console.log('\n❌ Documentadas pero no existen en Express:\n  ' + sobrantes.join('\n  '))
if (!sinDocumentar.length && !sobrantes.length) console.log('✅ La documentación cubre todas las rutas')

process.exit(sinDocumentar.length || sobrantes.length ? 1 : 0)
