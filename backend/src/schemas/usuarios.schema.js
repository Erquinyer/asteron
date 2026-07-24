import { z } from 'zod'

export const usuarioCreateSchema = z.object({
  nombre:          z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
  correo:          z.string({ required_error: 'El correo es requerido' }).email('Correo inválido'),
  password:        z.string({ required_error: 'La contraseña es requerida' }).min(6, 'Mínimo 6 caracteres'),
  id_rol:          z.coerce.number().int().positive().optional().nullable(),
  codigo_empleado: z.string().trim().optional().nullable(),
})

export const usuarioUpdateSchema = z.object({
  nombre:          z.string().trim().min(1).optional(),
  correo:          z.string().email('Correo inválido').optional(),
  password:        z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  id_rol:          z.coerce.number().int().positive().optional().nullable(),
  estado:          z.coerce.number().int().min(0).max(1).optional(),
  codigo_empleado: z.string().trim().optional().nullable(),
})
