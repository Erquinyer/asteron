import pool from '../src/config/db.js'
import { cargarAccionesPorDefecto } from './accionesPorDefecto.js'

const run = async () => {
  const total = await cargarAccionesPorDefecto(pool)
  console.log(`✅ Tabla acciones_modulo verificada y ${total} acciones por defecto cargadas (INSERT IGNORE — no sobreescribe cambios existentes)`)

  await pool.end()
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
