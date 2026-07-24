import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'
import swaggerUi from 'swagger-ui-express'

import { swaggerSpec }        from './config/swagger.js'
import { verifyToken }        from './middlewares/auth.middleware.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.middleware.js'
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
  ],
  credentials: true,
}))
app.use(express.json())

// ── Documentación automática (equivalente a /docs de FastAPI) ─
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Asteron API — Documentación',
}))
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec))

// ── Rutas públicas ────────────────────────────────────
app.use('/api/auth',   authRoutes)
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'ok', data: { sistema: 'Asteron' } }))

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

// ── 404 + manejo centralizado de errores (SIEMPRE al final) ──
app.use(notFoundHandler)
app.use(errorHandler)

export default app
