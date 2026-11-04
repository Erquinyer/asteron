// frontend/src/config/permissions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { canAccess, isAdmin, ROLE_PERMISSIONS } from './permissions';
import { login } from '../utils/auth';

describe('Pruebas Unitarias de Permisos (Semana 2 — capa Front)', () => {
  beforeEach(() => localStorage.clear());

  // Test 1: Regla de negocio ('admin' es un módulo virtual, no está en ROLE_PERMISSIONS)
  it("debe permitir 'admin' solo a Administrador Sistema, sin importar la sesión", () => {
    // Arrange — sin sesión activa
    // Act
    const permitido = canAccess('Administrador Sistema', 'admin');
    const denegado = canAccess('Operario', 'admin');
    // Assert
    expect(permitido).toBe(true);
    expect(denegado).toBe(false);
  });

  // Test 2: Partición equivalente (mapa estático por rol, sin sesión dinámica)
  it('debe usar el mapa estático de ROLE_PERMISSIONS cuando no hay módulos dinámicos en sesión', () => {
    // Arrange — Operario no tiene 'clientes' en el mapa estático
    // Act
    const tieneProgramacion = canAccess('Operario', 'programacion');
    const tieneClientes = canAccess('Operario', 'clientes');
    // Assert
    expect(tieneProgramacion).toBe(true);
    expect(tieneClientes).toBe(false);
  });

  // Test 3: Regla de negocio (los módulos dinámicos del login priman sobre el mapa estático)
  it('debe preferir los módulos dinámicos de la sesión sobre el mapa estático del rol', () => {
    // Arrange — el login real devuelve los módulos habilitados por la BD;
    // aquí se simula una sesión de Operario con 'clientes' habilitado,
    // algo que el mapa estático de Operario no permite.
    login({ rol: 'Operario', modulos: ['dashboard', 'clientes'] });
    // Act
    const resultado = canAccess('Operario', 'clientes');
    // Assert
    expect(resultado).toBe(true);
  });

  // Test 4: Valor límite (rol que no existe en el mapa estático)
  it('debe denegar cualquier módulo para un rol que no está en ROLE_PERMISSIONS', () => {
    // Arrange
    // Act
    const resultado = canAccess('Rol Inexistente', 'dashboard');
    // Assert
    expect(resultado).toBe(false);
  });

  // Test 5: Regla de negocio (isAdmin es exclusivo de un solo rol)
  it('isAdmin debe ser true únicamente para Administrador Sistema', () => {
    // Arrange / Act / Assert
    expect(isAdmin('Administrador Sistema')).toBe(true);
    expect(isAdmin('Gerente General')).toBe(false);
  });
});
