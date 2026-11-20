import dotenv from 'dotenv'
dotenv.config()

import app from './src/app.js'
import pool from './src/config/db.js'

const PORT = process.env.PORT || 3000

// En producción no se arranca con un secreto JWT débil: con el de ejemplo
// (publicado en el repositorio) cualquiera podría firmar tokens de administrador.
const SECRETO_EJEMPLO = 'asteron_super_secret_2026'
if (process.env.NODE_ENV === 'production') {
  const secreto = process.env.JWT_SECRET || ''
  if (secreto.length < 32 || secreto === SECRETO_EJEMPLO) {
    console.error('❌ JWT_SECRET debe tener al menos 32 caracteres y no ser el de ejemplo. Genera uno con: openssl rand -hex 32')
    process.exit(1)
  }
}

// Verificar conexión a la base de datos antes de iniciar
pool.getConnection()
  .then((conn) => {
    conn.release()
    console.log('✅ Conectado a MySQL — base de datos: asteron')

    const server = app.listen(PORT, () => {
      console.log(`🚀 Servidor Asteron corriendo en http://localhost:${PORT}`)
    })

    // Apagado ordenado: Docker y las plataformas en la nube envían SIGTERM antes de
    // detener o reemplazar el contenedor. Se dejan de aceptar conexiones, se terminan
    // las peticiones en curso y se cierra el pool, en vez de cortarlas a la mitad.
    const apagar = (senal) => {
      console.log(`${senal} recibido: cerrando el servidor…`)
      server.close(async () => {
        await pool.end().catch(() => {})
        process.exit(0)
      })
      // Si una conexión no termina en 10 s, se fuerza la salida
      setTimeout(() => process.exit(1), 10_000).unref()
    }
    process.on('SIGTERM', () => apagar('SIGTERM'))
    process.on('SIGINT', () => apagar('SIGINT'))
  })
  .catch((err) => {
    console.error('❌ Error al conectar con MySQL:', err.message)
    process.exit(1)
  })
