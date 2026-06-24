import api from './axios'

export const loginRequest       = (correo, contrasena) =>
  api.post('/auth/login', { correo, contrasena })

export const forgotPasswordRequest = (correo) =>
  api.post('/auth/forgot-password', { correo })

export const resetPasswordRequest  = (token, nuevaContrasena) =>
  api.post('/auth/reset-password', { token, nuevaContrasena })
