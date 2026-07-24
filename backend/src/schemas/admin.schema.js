import { z } from 'zod'

export const rolCreateSchema = z.object({
  nombre:      z.string({ required_error: 'El nombre es requerido' }).trim().min(1),
  descripcion: z.string().trim().optional().default(''),
})

export const rolUpdateSchema = rolCreateSchema

export const rolPermisosSchema = z.object({
  modulos: z.array(z.string()).optional().default([]),
})

export const rolAccionesSchema = z.object({
  modulo:   z.string({ required_error: 'El módulo es requerido' }).min(1),
  acciones: z.array(z.string()).optional().default([]),
})

export const usuarioRolSchema = z.object({
  id_rol: z.coerce.number({ required_error: 'id_rol es requerido' }).int().positive(),
})
