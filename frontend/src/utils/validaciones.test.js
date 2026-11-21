// frontend/src/utils/validaciones.test.js
import { describe, it, expect } from 'vitest';
import { validarEmail, validarPassword } from './validaciones';

describe('Pruebas Unitarias de Validaciones (Semana 2)', () => {
  // Test 1: Partición equivalente (Correo válido)
  it('debe retornar true para un correo válido', () => {
    // Arrange
    const correoValido = 'usuario@asteron.com';
    // Act
    const resultado = validarEmail(correoValido);
    // Assert
    expect(resultado).toBe(true);
  });

  // Test 2: Valor límite (Contraseña menor a 8 caracteres)
  it('debe rechazar contraseñas de menos de 8 caracteres', () => {
    // Arrange
    const claveCorta = 'Ast123!';
    // Act
    const resultado = validarPassword(claveCorta);
    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toContain('al menos 8 caracteres');
  });

  // Test 3: Regla de negocio (Contraseña de 8+ caracteres sin número)
  it('debe rechazar contraseñas sin números aunque cumplan la longitud', () => {
    // Arrange
    const claveSinNumero = 'AsteronSinNumero!';
    // Act
    const resultado = validarPassword(claveSinNumero);
    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toContain('al menos un número');
  });
});