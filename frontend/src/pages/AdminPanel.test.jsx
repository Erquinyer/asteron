import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdminPanel from './AdminPanel';

describe('Pruebas de Componente - AdminPanel (Frontend)', () => {

  // TEST 1: Caso feliz - Renderizado del estado inicial / carga de permisos
  it('Debe mostrar el indicador de carga inicial de permisos correctamente', async () => {
    // 1. ARRANGE
    render(<AdminPanel />);

    // 2. ACT & ASSERT
    const loadingMessage = await screen.findByText(/cargando permisos/i);
    expect(loadingMessage).toBeDefined();
  });

  // TEST 2: Estado de componentes con título principal
  it('Debe renderizar el título del panel de administración correctamente', () => {
    // 1. ARRANGE
    render(<AdminPanel />);

    // 2. ACT
    const titleElement = screen.getByRole('heading', { name: /panel de administración/i });

    // 3. ASSERT
    expect(titleElement).toBeDefined();
  });

  // TEST 3: Verificación de elementos interactivos accesibles
  it('Debe contener un botón accesible de roles una vez cargado el componente', async () => {
    // 1. ARRANGE
    render(<AdminPanel />);

    // 2. ACT
    const rolesButton = await screen.findByRole('button', { name: /roles/i });

    // 3. ASSERT
    expect(rolesButton).toBeDefined();
  });

});