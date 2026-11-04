import mailer from '../config/mailer.js'

// Interfaz propia para avisarle algo a una persona por correo.
// Los controladores dependen de esta interfaz y no de nodemailer: así, en las
// pruebas se reemplaza solo el notificador (un doble) y no la librería de terceros.

// Escapa los caracteres especiales de HTML. El nombre lo escribe el usuario y va
// dentro del correo: sin escaparlo, un nombre como <a href="...">Haz clic</a>
// se mostraría como un enlace real dentro de un correo oficial de Asteron.
export const escaparHtml = (texto) =>
  String(texto ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

// Arma el correo de recuperación (asunto y HTML) sin enviarlo
export const crearCorreoRecuperacion = ({ correo, nombre, enlace, minutosVigencia, urlLogo }) => ({
  from:    `"Asteron – Macromet" <${process.env.EMAIL_USER}>`,
  to:      correo,
  subject: 'Restablece tu contraseña – Asteron',
  html: `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px">
      <img src="${urlLogo}" alt="Asteron" style="height:48px;margin-bottom:24px"/>
      <h2 style="color:#1e293b;margin:0 0 8px">Recuperación de contraseña</h2>
      <p style="color:#475569;margin:0 0 24px">Hola <strong>${escaparHtml(nombre)}</strong>, recibimos una solicitud para restablecer tu contraseña.</p>
      <a href="${enlace}"
         style="display:inline-block;background:#1e293b;color:#fff;text-decoration:none;
                padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
        Restablecer contraseña
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">
        Este enlace es válido por ${minutosVigencia} minutos.<br>
        Si no solicitaste esto, ignora este correo.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#cbd5e1;font-size:11px;margin:0">Asteron · Sistema de gestión Macromet</p>
    </div>
  `,
})

export const notificador = {
  enviarRecuperacionContrasena: (datos) => mailer.sendMail(crearCorreoRecuperacion(datos)),
}
