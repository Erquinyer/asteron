import { z } from 'zod'

export const proyectoCreateSchema = z.object({
  nombre:                  z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
  objetivo:                z.string().trim().optional().nullable(),
  prioridad:               z.enum(['alta', 'media', 'baja']).optional().default('media'),
  fecha_inicio:            z.string().optional().nullable(),
  fecha_fin_estimada:      z.string().optional().nullable(),
  id_pedido:               z.coerce.number().int().positive().optional().nullable(),
  id_usuario_responsable:  z.coerce.number().int().positive().optional().nullable(),
})

export const proyectoUpdateSchema = proyectoCreateSchema.partial().extend({
  nombre: z.string().trim().min(1, 'El nombre es requerido').optional(),
})

export const faseUpdateSchema = z.object({
  estado:            z.enum(['pendiente', 'en_curso', 'completada']),
  porcentaje_avance: z.coerce.number().min(0).max(100).optional().default(0),
})
