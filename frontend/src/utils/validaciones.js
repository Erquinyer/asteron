// frontend/src/utils/validaciones.js

/**
 * Valida si un correo electrónico tiene un formato correcto.
 */
export function validarEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
}

/**
 * Valida la fortaleza de una contraseña.
 */
export function validarPassword(password) {
  if (!password || password.length < 8) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
  }
  const tieneNumero = /\d/.test(password);
  if (!tieneNumero) {
    return { valido: false, mensaje: 'La contraseña debe incluir al menos un número' };
  }
  return { valido: true, mensaje: '' };
}