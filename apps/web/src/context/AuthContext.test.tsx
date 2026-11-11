import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext.js';
import { apiClient, setAccessToken } from '../lib/apiClient.js';
import { UserRole } from '@scienpay/shared';

function TestConsumer() {
  const { user, isLoading, logout } = useAuth();
  if (isLoading) return <div>Cargando sesión...</div>;
  if (!user) return <div>No autenticado</div>;
  return (
    <div>
      <div>Usuario: {user.fullName}</div>
      <div>Rol: {user.role}</div>
      <button onClick={() => logout()}>Cerrar sesión</button>
    </div>
  );
}

describe('AuthContext — Manejo de Sesión y Deduplicación (HANDOFF 3.2 & 4.6.3)', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it('debe iniciar en estado de carga y restaurar sesión si refresh es exitoso', async () => {
    const mockUser = {
      id: '11111111-1111-4111-8111-111111111111',
      username: 'admin',
      email: 'admin@scienpay.org',
      fullName: 'Administrador General',
      role: UserRole.ADMIN,
    };

    // Simulamos un JWT con exp a 1 hora en el futuro
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ exp, sub: mockUser.id }));
    const fakeToken = `${header}.${payload}.signature`;

    vi.spyOn(apiClient, 'post').mockImplementation((path: string) => {
      if (path === '/auth/refresh') {
        return Promise.resolve({
          message: 'Token renovado',
          accessToken: fakeToken,
        });
      }
      return Promise.reject(new Error('Unknown path'));
    });

    vi.spyOn(apiClient, 'get').mockImplementation((path: string) => {
      if (path === '/auth/me') {
        return Promise.resolve(mockUser);
      }
      return Promise.reject(new Error('Unknown path'));
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText('Cargando sesión...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Usuario:.*Administrador General/)).toBeInTheDocument();
      expect(screen.getByText(/Rol:.*ADMIN/)).toBeInTheDocument();
    });
  });

  it('debe mostrar no autenticado si el refresh falla', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('No refresh token'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('No autenticado')).toBeInTheDocument();
    });
  });
});
