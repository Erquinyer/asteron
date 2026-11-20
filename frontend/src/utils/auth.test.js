// frontend/src/utils/auth.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { login, logout, getUser, isAuthenticated, canDo, canManagePlanta } from './auth';

describe('Pruebas Unitarias de Sesión (Semana 2 — capa Front)', () => {
  beforeEach(() => localStorage.clear());

  // Test 1: Regla de negocio (sin sesión guardada no hay usuario autenticado)
  it('isAuthenticated debe ser false cuando no hay sesión guardada', () => {
    // Arrange / Act
    const resultado = isAuthenticated();
    // Assert
    expect(resultado).toBe(false);
  });

  // Test 2: Regla de negocio (login/getUser/logout sobre localStorage)
  it('login debe guardar la sesión y logout debe borrarla', () => {
    // Arrange
    const usuario = { nombre: 'Gabriel', rol: 'Administrador Sistema' };
    // Act
    login(usuario);
    const autenticadoTrasLogin = isAuthenticated();
    const usuarioGuardado = getUser();
    logout();
    const autenticadoTrasLogout = isAuthenticated();
    // Assert
    expect(autenticadoTrasLogin).toBe(true);
    expect(usuarioGuardado).toEqual(usuario);
    expect(autenticadoTrasLogout).toBe(false);
    expect(getUser()).toBeNull();
  });

  // Test 3: Partición equivalente (canDo según acciones permitidas por módulo)
  it('canDo debe verificar la acción dentro del módulo correcto de la sesión', () => {
    // Arrange
    login({ acciones: { proyectos: ['crear', 'editar'] } });
    // Act
    const puedeCrear = canDo('proyectos', 'crear');
    const puedeEliminar = canDo('proyectos', 'eliminar');
    // Assert
    expect(puedeCrear).toBe(true);
    expect(puedeEliminar).toBe(false);
  });

  // Test 4: Valor límite (canDo sin sesión activa, no debe lanzar error)
  it('canDo debe ser false sin sesión activa, sin lanzar error', () => {
    // Arrange — localStorage vacío (beforeEach)
    // Act
    const resultado = canDo('proyectos', 'crear');
    // Assert
    expect(resultado).toBe(false);
  });

  // Test 5: Regla de negocio (canManagePlanta solo para los roles que programan turnos,
  // debe coincidir con requirePlantScheduler.js del backend)
  it('canManagePlanta debe ser true solo para los roles que gestionan Programación', () => {
    // Arrange
    login({ rol: 'Coordinador de Planta' });
    // Act
    const puedeGestionar = canManagePlanta();
    login({ rol: 'Operario' });
    const operarioPuedeGestionar = canManagePlanta();
    // Assert
    expect(puedeGestionar).toBe(true);
    expect(operarioPuedeGestionar).toBe(false);
  });
});
