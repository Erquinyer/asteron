import { z } from 'zod'

const categorias = ['maquinaria_pesada', 'equipo_mig', 'herramienta_electrica']
const estados     = ['activa', 'inactiva', 'en_mantenimiento', 'sin_asignar', 'guardada', 'dado_de_baja']

export const maquinariaCreateSchema = z.object({
  nombre:      z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
  codigo:      z.string().trim().optional().nullable(),
  categoria:   z.enum(categorias).optional().default('maquinaria_pesada'),
  marca:       z.string().trim().optional().nullable(),
  referencia:  z.string().trim().optional().nullable(),
  serial:      z.string().trim().optional().nullable(),
  descripcion: z.string().trim().optional().nullable(),
  ubicacion:   z.string().trim().optional().nullable(),
  estado:      z.enum(estados).optional().default('activa'),
})

export const maquinariaUpdateSchema = maquinariaCreateSchema.partial().extend({
  nombre: z.string().trim().min(1, 'El nombre es requerido').optional(),
})
