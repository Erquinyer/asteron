import { z } from 'zod'

const itemSchema = z.object({
  producto:        z.string().trim().optional(),
  cantidad:        z.coerce.number().int().positive().optional().default(1),
  punto_descargue: z.string().trim().optional().nullable(),
  estado:          z.string().trim().optional(),
})

export const pedidoCreateSchema = z.object({
  id_cliente:  z.coerce.number({ required_error: 'El cliente es requerido' }).int().positive(),
  descripcion: z.string().trim().optional().nullable(),
  estado:      z.enum(['pendiente', 'en_proceso', 'completado', 'cancelado']).optional().default('pendiente'),
  items:       z.array(itemSchema).optional().default([]),
})

export const pedidoUpdateSchema = z.object({
  id_cliente:  z.coerce.number().int().positive().optional(),
  descripcion: z.string().trim().optional().nullable(),
  estado:      z.enum(['pendiente', 'en_proceso', 'completado', 'cancelado']).optional(),
})
