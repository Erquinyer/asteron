import { beforeEach, describe, expect, it, vi } from 'vitest'
import mailer from '../src/config/mailer.js'
import { crearCorreoRecuperacion, escaparHtml, notificador } from '../src/services/notificador.js'

// Doble: MOCK del adaptador propio de correo (src/config/mailer.js), que es el único
// lugar que conoce a nodemailer. Así ninguna prueba envía correos de verdad.
vi.mock('../src/config/mailer.js', () => ({ default: { sendMail: vi.fn() } }))

const datos = {
  correo: 'martin@macromet.com.co',
  nombre: 'Martín Pérez',
  enlace: 'http://localhost:5173/reset-password?token=abc123',
  minutosVigencia: 30,
  urlLogo: 'http://localhost:5173/logo.svg',
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('crearCorreoRecuperacion', () => {
  it('debe dirigir el correo a la persona con el enlace y la vigencia', () => {
    // Act
    const correo = crearCorreoRecuperacion(datos)

    // Assert (estado): el mensaje armado
    expect(correo.to).toBe('martin@macromet.com.co')
    expect(correo.subject).toBe('Restablece tu contraseña – Asteron')
    expect(correo.html).toContain('href="http://localhost:5173/reset-password?token=abc123"')
    expect(correo.html).toContain('válido por 30 minutos')
    expect(correo.html).toContain('Hola <strong>Martín Pérez</strong>')
  })

  it('debe escapar el nombre para que no se pueda inyectar HTML en un correo oficial', () => {
    // Arrange: un nombre con un enlace malicioso
    const nombre = '<a href="https://phishing.example">Verifica tu cuenta</a>'

    // Act
    const correo = crearCorreoRecuperacion({ ...datos, nombre })

    // Assert
    expect(correo.html).not.toContain('<a href="https://phishing.example">')
    expect(correo.html).toContain('&lt;a href=&quot;https://phishing.example&quot;&gt;')
  })
})

describe('escaparHtml', () => {
  it.each([
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['&', '&amp;'],
    ['"', '&quot;'],
    ["'", '&#39;'],
    [null, ''],
  ])('convierte %s en %s', (entrada, esperado) => {
    expect(escaparHtml(entrada)).toBe(esperado)
  })
})

describe('notificador.enviarRecuperacionContrasena', () => {
  it('debe entregar al adaptador de correo el mensaje ya armado', async () => {
    // Arrange
    mailer.sendMail.mockResolvedValueOnce({ accepted: ['martin@macromet.com.co'] })

    // Act
    await notificador.enviarRecuperacionContrasena(datos)

    // Assert (comportamiento)
    expect(mailer.sendMail).toHaveBeenCalledOnce()
    expect(mailer.sendMail).toHaveBeenCalledWith(crearCorreoRecuperacion(datos))
  })

  it('debe propagar el error del servicio de correo para que el controlador decida qué hacer', async () => {
    mailer.sendMail.mockRejectedValueOnce(new Error('ETIMEDOUT'))

    await expect(notificador.enviarRecuperacionContrasena(datos)).rejects.toThrow('ETIMEDOUT')
  })
})
