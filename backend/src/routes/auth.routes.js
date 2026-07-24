import { Router } from 'express'
import { login } from '../controllers/auth.controller.js'
import { forgotPassword, resetPassword } from '../controllers/recovery.controller.js'
import { validate } from '../middlewares/validate.middleware.js'
import { loginSchema } from '../schemas/auth.schema.js'
import { forgotPasswordSchema, resetPasswordSchema } from '../schemas/recovery.schema.js'

const router = Router()

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión y devuelve un token JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo, contrasena]
 *             properties:
 *               correo:     { type: string, format: email, example: admin@macromet.com.co }
 *               contrasena: { type: string, example: admin2026 }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Inicio de sesión exitoso
 *               data: { id_usuario: 1, nombre: "Admin", correo: "admin@macromet.com.co", rol: "Administrador Sistema", token: "eyJ..." }
 *       401:
 *         description: Credenciales incorrectas
 */
router.post('/login', validate(loginSchema), login)

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicita un enlace de recuperación de contraseña por correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [correo]
 *             properties:
 *               correo: { type: string, format: email }
 *     responses:
 *       200: { description: Enlace enviado (respuesta genérica por seguridad) }
 */
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword)

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Restablece la contraseña usando el token recibido por correo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, nuevaContrasena]
 *             properties:
 *               token:           { type: string }
 *               nuevaContrasena: { type: string, minLength: 6 }
 *     responses:
 *       200: { description: Contraseña actualizada }
 *       400: { description: Token inválido o expirado }
 */
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)

export default router
