import { z } from 'zod'

export const programacionCreateSchema = z.object({
  fecha:            z.string({ required_error: 'La fecha es requerida' }).min(1),
  id_operario:      z.coerce.number({ required_error: 'El operario es requerido' }).int().positive(),
  id_maquina:       z.coerce.number({ required_error: 'La máquina es requerida' }).int().positive(),
  id_proyecto:      z.coerce.number().int().positive().optional().nullable(),
  id_fase_proyecto: z.coerce.number().int().positive().optional().nullable(),
  tiempo_estimado:  z.coerce.number().int().positive().optional().default(480),
  observaciones:    z.string().trim().optional().nullable(),
})

export const programacionEstadoSchema = z.object({
  estado:      z.enum(['programado', 'en_proceso', 'completado', 'cancelado']),
  tiempo_real: z.coerce.number().int().positive().optional().nullable(),
})
