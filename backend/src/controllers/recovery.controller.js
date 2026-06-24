import crypto   from 'crypto'
import bcrypt   from 'bcryptjs'
import pool     from '../config/db.js'
import mailer   from '../config/mailer.js'

const EXPIRES_MINUTES = 30
const FRONTEND_URL    = process.env.FRONTEND_URL || 'http://localhost:5173'

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  const { correo } = req.body
  if (!correo) return res.status(400).json({ message: 'El correo es requerido' })

  try {
    const [rows] = await pool.query(
      'SELECT id_usuario, nombre FROM usuarios WHERE correo = ? AND estado = 1 LIMIT 1',
      [correo]
    )

    // Respuesta genérica para no revelar si el correo existe
    if (!rows[0]) {
      return res.json({ message: 'Si el correo está registrado recibirás un enlace en tu bandeja de entrada.' })
    }

    const { id_usuario, nombre } = rows[0]

    // Invalida tokens anteriores del mismo usuario
    await pool.query(
      'UPDATE password_reset_tokens SET usado = 1 WHERE id_usuario = ? AND usado = 0',
      [id_usuario]
    )

    // Genera token seguro de 64 caracteres hex
    const token     = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000)

    await pool.query(
      'INSERT INTO password_reset_tokens (id_usuario, token, expires_at) VALUES (?, ?, ?)',
      [id_usuario, token, expiresAt]
    )

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`

    await mailer.sendMail({
      from:    `"Asteron – Macromet" <${process.env.EMAIL_USER}>`,
      to:      correo,
      subject: 'Restablece tu contraseña – Asteron',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
          <img src="${FRONTEND_URL}/logo.svg" alt="Asteron" style="height:48px;margin-bottom:24px"/>
          <h2 style="color:#1e293b;margin:0 0 8px">Recuperación de contraseña</h2>
          <p style="color:#475569;margin:0 0 24px">Hola <strong>${nombre}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
          <a href="${resetLink}"
             style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;
                    padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
            Restablecer contraseña
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            Este enlace es válido por ${EXPIRES_MINUTES} minutos.<br>
            Si no solicitaste esto, ignora este correo.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#cbd5e1;font-size:11px;margin:0">Asteron · Sistema de gestión Macromet</p>
        </div>
      `,
    })

    return res.json({ message: 'Si el correo está registrado recibirás un enlace en tu bandeja de entrada.' })
  } catch (err) {
    console.error('[recovery.forgotPassword]', err)
    return res.status(500).json({ message: 'Error al procesar la solicitud' })
  }
}

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  const { token, nuevaContrasena } = req.body

  if (!token || !nuevaContrasena)
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' })

  if (nuevaContrasena.length < 6)
    return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' })

  try {
    const [rows] = await pool.query(
      `SELECT prt.id, prt.id_usuario, prt.expires_at, prt.usado
       FROM password_reset_tokens prt
       WHERE prt.token = ? LIMIT 1`,
      [token]
    )

    const registro = rows[0]

    if (!registro)
      return res.status(400).json({ message: 'Enlace inválido o expirado' })

    if (registro.usado)
      return res.status(400).json({ message: 'Este enlace ya fue utilizado' })

    if (new Date() > new Date(registro.expires_at))
      return res.status(400).json({ message: 'El enlace ha expirado. Solicita uno nuevo.' })

    const hash = await bcrypt.hash(nuevaContrasena, 10)

    await pool.query(
      'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
      [hash, registro.id_usuario]
    )

    await pool.query(
      'UPDATE password_reset_tokens SET usado = 1 WHERE id = ?',
      [registro.id]
    )

    return res.json({ message: 'Contraseña actualizada correctamente' })
  } catch (err) {
    console.error('[recovery.resetPassword]', err)
    return res.status(500).json({ message: 'Error al restablecer la contraseña' })
  }
}
