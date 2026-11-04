import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'

import { verifyToken }        from './middlewares/auth.middleware.js'
import authRoutes             from './routes/auth.routes.js'
import dashboardRoutes        from './routes/dashboard.routes.js'
import proyectosRoutes        from './routes/proyectos.routes.js'
import pedidosRoutes          from './routes/pedidos.routes.js'
import clientesRoutes         from './routes/clientes.routes.js'
import maquinariaRoutes       from './routes/maquinaria.routes.js'
import usuariosRoutes         from './routes/usuarios.routes.js'
import programacionRoutes     from './routes/programacion.routes.js'
import perfilRoutes           from './routes/perfil.routes.js'
import mantenimientosRoutes   from './routes/mantenimientos.routes.js'
import notificacionesRoutes   from './routes/notificaciones.routes.js'
import adminRoutes             from './routes/admin.routes.js'

dotenv.config()

const app = express()

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
  ],
  credentials: true,
}))
app.use(express.json())

// ── Rutas públicas ────────────────────────────────────
app.use('/api/auth',   authRoutes)
app.get('/api/health', (_req, res) => res.json({ status: 'ok', sistema: 'Asteron' }))

// ── Rutas protegidas (requieren JWT) ──────────────────
app.use('/api/dashboard',       verifyToken, dashboardRoutes)
app.use('/api/proyectos',       verifyToken, proyectosRoutes)
app.use('/api/pedidos',         verifyToken, pedidosRoutes)
app.use('/api/clientes',        verifyToken, clientesRoutes)
app.use('/api/maquinaria',      verifyToken, maquinariaRoutes)
app.use('/api/usuarios',        verifyToken, usuariosRoutes)
app.use('/api/programacion',    verifyToken, programacionRoutes)
app.use('/api/perfil',          verifyToken, perfilRoutes)
app.use('/api/mantenimientos',  verifyToken, mantenimientosRoutes)
app.use('/api/notificaciones',  verifyToken, notificacionesRoutes)
app.use('/api/admin',           verifyToken, adminRoutes)

// ── Rutas del API que no existen: 404 en JSON (antes respondía una página HTML) ──
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'Recurso no encontrado' })
})

// ── Manejador de errores: siempre JSON y sin información interna ──
// Sin este manejador, Express respondía una página HTML con el stack trace del servidor.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // express.json() marca así un cuerpo que no es JSON válido
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la petición es demasiado grande' })
  }
  // multer: archivo de importación por encima del límite
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'El archivo supera el tamaño máximo permitido (2 MB)' })
  }
  console.error('[app]', err)
  res.status(500).json({ message: 'Error interno del servidor' })
})

export default app
