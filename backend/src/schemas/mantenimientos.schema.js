import { z } from 'zod'

export const mantenimientoCreateSchema = z.object({
  id_maquina:  z.coerce.number({ required_error: 'La máquina es requerida' }).int().positive(),
  fecha:       z.string({ required_error: 'La fecha es requerida' }).min(1),
  tipo:        z.enum(['preventivo', 'correctivo'], { required_error: 'El tipo es requerido' }),
  descripcion: z.string().trim().optional().nullable(),
})
