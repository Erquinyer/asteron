// Límites de intentos en las rutas públicas de autenticación. Sin ellos se podían
// probar contraseñas sin parar y usar "olvidé mi contraseña" para enviar correos
// masivos. Se cuentan por IP: detrás de un proxy (Caddy) app.js activa
// "trust proxy" con TRUST_PROXY para que la IP sea la del cliente y no la del proxy.
import { rateLimit } from 'express-rate-limit'

const QUINCE_MINUTOS = 15 * 60 * 1000
const UNA_HORA = 60 * 60 * 1000

const responder = (mensaje) => (_req, res, _next, opciones) =>
  res.status(opciones.statusCode).json({ message: mensaje })

// Login: 10 intentos fallidos cada 15 minutos. Los exitosos no cuentan, así que
// varias personas de la planta detrás de la misma IP no se bloquean entre sí.
export const limiteLogin = rateLimit({
  windowMs: QUINCE_MINUTOS,
  limit: Number(process.env.LIMITE_LOGIN) || 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responder('Demasiados intentos de inicio de sesión. Espera 15 minutos e intenta de nuevo.'),
})

// Recuperación de contraseña: 5 solicitudes por hora (cada una puede enviar un correo)
export const limiteRecuperacion = rateLimit({
  windowMs: UNA_HORA,
  limit: Number(process.env.LIMITE_RECUPERACION) || 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: responder('Demasiadas solicitudes de recuperación. Espera una hora e intenta de nuevo.'),
})
