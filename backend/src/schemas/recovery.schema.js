import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  correo: z.string({ required_error: 'El correo es requerido' }).email('Correo inválido'),
})

export const resetPasswordSchema = z.object({
  token:           z.string({ required_error: 'El token es requerido' }).min(1),
  nuevaContrasena: z.string({ required_error: 'La nueva contraseña es requerida' })
                     .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})
