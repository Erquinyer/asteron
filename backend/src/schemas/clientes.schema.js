import { z } from 'zod'

export const clienteCreateSchema = z.object({
  nombre:         z.string({ required_error: 'El nombre es requerido' }).trim().min(1, 'El nombre es requerido'),
  nit:            z.string().trim().optional().nullable(),
  codigo_cliente: z.string().trim().optional().nullable(),
  direccion:      z.string().trim().optional().nullable(),
})

// En update permitimos actualización parcial (PATCH-like), pero
// si viene 'nombre' no puede llegar vacío.
export const clienteUpdateSchema = clienteCreateSchema.partial().extend({
  nombre: z.string().trim().min(1, 'El nombre es requerido').optional(),
})
