// Corre todas las migraciones en orden: `pnpm migrar` (o, en Docker,
// `docker compose exec backend pnpm migrar`).
//
// Cada migración revisa si su cambio ya existe antes de aplicarlo, así que correr
// este comando varias veces es seguro. En una base creada con asteron_v2.sql todas
// responden "ya existe": el esquema ya trae los cambios.
//
// Al agregar una migración nueva: crear scripts/migrate_<nombre>.js idempotente
// (mismo patrón que las demás) y sumarla al FINAL de esta lista.
import dotenv from 'dotenv'
dotenv.config()
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pool from '../src/config/db.js'

const MIGRACIONES = [
  'migrate_admin_role',
  'migrate_acciones_modulo',
  'migrate_avance_turno',
  'migrate_fases_items',
  'migrate_puntos_entrega',
  'migrate_tiempos_reportes',
  'migrate_politica_datos',
  'migrate_bitacora',
  'migrate_evidencias',
  'migrate_recuperacion',
]

const carpeta = fileURLToPath(new URL('.', import.meta.url))

// Varias migraciones antiguas suponen que los roles ya existen (las escribió el equipo
// sobre bases cargadas con seed.js). En una base vacía, migrate_admin_role crearía
// "Administrador Sistema" con el id de otro rol y los permisos quedarían cruzados.
const [[{ roles }]] = await pool.query('SELECT COUNT(*) AS roles FROM roles')
await pool.end()
if (roles === 0) {
  console.error('❌ La base no tiene roles. En una base nueva corre primero `pnpm inicializar` (producción) o `pnpm seed` (desarrollo).')
  process.exit(1)
}

for (const [i, nombre] of MIGRACIONES.entries()) {
  console.log(`\n[${i + 1}/${MIGRACIONES.length}] ${nombre}`)
  // Cada script abre y cierra su propia conexión, así que se ejecuta en un proceso aparte
  const r = spawnSync(process.execPath, [`${carpeta}${nombre}.js`], { stdio: 'inherit', env: process.env })
  if (r.status !== 0) {
    console.error(`\n❌ ${nombre} falló: se detienen las migraciones. Corrige el error y vuelve a ejecutar \`pnpm migrar\`.`)
    process.exit(1)
  }
}
console.log('\n✅ Base de datos al día')
