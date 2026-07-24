import { z } from 'zod'

// Equivalente a un modelo Pydantic `LoginRequest` en FastAPI
export const loginSchema = z.object({
  correo:     z.string({ required_error: 'El correo es requerido' }).email('Correo inválido'),
  contrasena: z.string({ required_error: 'La contraseña es requerida' }).min(1, 'La contraseña es requerida'),
})
