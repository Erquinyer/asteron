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