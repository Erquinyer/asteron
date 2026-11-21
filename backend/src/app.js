import express from 'express'
import cors    from 'cors'
import dotenv  from 'dotenv'
import helmet  from 'helmet'
import swaggerUi from 'swagger-ui-express'

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
import reportesRoutes          from './routes/reportes.routes.js'
import evidenciasRoutes        from './routes/evidencias.routes.js'
import { openapi }             from './docs/openapi.js'
import { responderError }      from './utils/errores.js'
import pool                    from './config/db.js'

dotenv.config()

const app = express()
const PRODUCCION = process.env.NODE_ENV === 'production'

// Detrás de un proxy (Caddy en producción) la IP del cliente llega en X-Forwarded-For.
// TRUST_PROXY=1 confía solo en el proxy inmediato: sin esto, los límites de intentos
// contarían a todos los usuarios como una sola IP (la del proxy).
if (process.env.TRUST_PROXY) {
  const valor = process.env.TRUST_PROXY
  app.set('trust proxy', /^\d+$/.test(valor) ? Number(valor) : valor)
}

// Cabeceras de seguridad (nosniff, HSTS, sin X-Powered-By, CSP para las respuestas del API…).
// upgrade-insecure-requests solo en producción (HTTPS): en desarrollo, abriendo el backend
// por la IP de la red local con http, rompería Swagger al forzar https.
app.use(helmet({
  contentSecurityPolicy: { directives: { upgradeInsecureRequests: PRODUCCION ? [] : null } },
}))

// CORS: en producción solo los orígenes de CORS_ORIGINS (separados por coma). La web
// se sirve por el mismo dominio que el API, así que en la práctica lo necesita la app
// móvil (Capacitor usa capacitor://localhost en iOS y http://localhost en Android).
const ORIGENES_DESARROLLO = [
  'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173',
  'capacitor://localhost', 'http://localhost', 'https://localhost',
]
const origenesPermitidos = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : PRODUCCION ? [process.env.FRONTEND_URL].filter(Boolean)
  : [process.env.FRONTEND_URL || 'http://localhost:5173', ...ORIGENES_DESARROLLO]
app.use(cors({ origin: origenesPermitidos, credentials: true }))
app.use(express.json())

// ── Rutas públicas ────────────────────────────────────
app.use('/api/auth',   authRoutes)
// Comprueba también la base de datos: el monitor de disponibilidad (RNF-15) y el
// healthcheck de Docker deben ver caído el sistema si MySQL no responde.
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', sistema: 'Asteron' })
  } catch (err) {
    console.error('[health] La base de datos no responde', err.message)
    res.status(503).json({ status: 'error', sistema: 'Asteron', message: 'La base de datos no responde' })
  }
})

// ── Documentación de la API (OpenAPI / Swagger) ───────
// Pública: solo describe las rutas; para probarlas igual hay que iniciar sesión.
// En producción se puede apagar con DOCS_HABILITADOS=false.
if (process.env.DOCS_HABILITADOS !== 'false') {
  app.get('/api/docs.json', (_req, res) => res.json(openapi))
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
    customSiteTitle: 'Asteron API',
    swaggerOptions: { persistAuthorization: true },
  }))
}

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
app.use('/api/reportes',        verifyToken, reportesRoutes)
app.use('/api/evidencias',      verifyToken, evidenciasRoutes)

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
  // El resto (incluidos los errores que un controlador deja escapar: Express 5 los
  // trae aquí) pasa por el mismo manejo central que usan los controladores (RNF-06).
  responderError(res, err, 'app')
})

export default app
