import dotenv from 'dotenv'
dotenv.config()

import app from './src/app.js'
import pool from './src/config/db.js'

const PORT = process.env.PORT || 3000

// Verificar conexión a la base de datos antes de iniciar
pool.getConnection()
  .then((conn) => {
    conn.release()
    console.log('✅ Conectado a MySQL — base de datos: asteron')

    app.listen(PORT, () => {
      console.log(`🚀 Servidor Asteron corriendo en http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('❌ Error al conectar con MySQL:', err.message)
    process.exit(1)
  })
