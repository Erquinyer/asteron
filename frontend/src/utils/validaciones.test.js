import { describe, it, expect } from 'vitest';
import { validarPassword } from './validaciones';

describe('validarPassword()', () => {
  // Test 1: Partición equivalente (Caso válido)
  it('debe aceptar una contraseña válida de 8 o más caracteres con un número', () => {
    // Arrange
    const claveValida = 'Asteron2026!';
    // Act
    const resultado = validarPassword(claveValida);
    // Assert
    expect(resultado.valido).toBe(true);
  });

  // Test 2: Valor límite (Limit point - 7 caracteres)
  it('debe rechazar contraseñas con menos de 8 caracteres', () => {
    // Arrange
    const claveCorta = 'Ast123!';
    // Act
    const resultado = validarPassword(claveCorta);
    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toContain('al menos 8 caracteres');
  });

  // Test 3: Regla específica (Falta número)
  it('debe rechazar contraseñas sin números aunque tengan la longitud adecuada', () => {
    // Arrange
    const claveSinNumero = 'AsteronSinNumero!';
    // Act
    const resultado = validarPassword(claveSinNumero);
    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toContain('al menos un número');
  });
});