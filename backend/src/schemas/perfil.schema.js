import { z } from 'zod'

export const perfilUpdateSchema = z.object({
  nombre: z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
})

export const changePasswordSchema = z.object({
  actual: z.string({ required_error: 'La contraseña actual es requerida' }).min(1),
  nueva:  z.string({ required_error: 'La nueva contraseña es requerida' }).min(6, 'Debe tener al menos 6 caracteres'),
})
