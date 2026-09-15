import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMenu } from '@/components/layout/UserMenu';
import {
  AuthProvider,
  useAuth,
} from './AuthContext';

const api = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  googleLogin: vi.fn(),
  updateProfile: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('./auth-api', () => ({
  refreshAccessToken: api.refreshAccessToken,
  getCurrentUser: api.getCurrentUser,
  googleLogin: api.googleLogin,
  updateProfile: api.updateProfile,
  login: api.login,
  register: api.register,
  logout: api.logout,
}));

const originalUser = {
  id: 'user-1',
  email: 'person@example.test',
  displayName: 'Carlos Benítez',
  role: 'USER' as const,
  createdAt: '2026-09-10T10:00:00.000Z',
  updatedAt: '2026-09-10T10:00:00.000Z',
};

function UpdateProbe() {
  const {
    updateProfile,
  } = useAuth();

  return (
    <button
      type="button"
      onClick={() => {
        void updateProfile({
          displayName: 'Carlos Hernández',
        }).catch(() => undefined);
      }}
    >
      Actualizar nombre
    </button>
  );
}

function GoogleLoginProbe() {
  const {
    googleLogin,
    user,
    accessToken,
    status,
  } = useAuth();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void googleLogin({
            idToken: 'google-id-token-test',
          }).catch(() => undefined);
        }}
      >
        Entrar con Google
      </button>

      <output>
        {status}
        {'|'}
        {user?.email ?? 'sin-usuario'}
        {'|'}
        {accessToken ?? 'sin-token'}
      </output>
    </>
  );
}

describe('AuthContext profile update', () => {
  beforeEach(() => {
    api.refreshAccessToken.mockReset();
    api.getCurrentUser.mockReset();
    api.googleLogin.mockReset();
    api.updateProfile.mockReset();
    api.login.mockReset();
    api.register.mockReset();
    api.logout.mockReset();

    api.refreshAccessToken.mockResolvedValue({
      accessToken: 'access-token-test',
    });
    api.getCurrentUser.mockResolvedValue({
      user: originalUser,
    });
    api.updateProfile.mockResolvedValue({
      user: {
        ...originalUser,
        displayName: 'Carlos Hernández',
        updatedAt: '2026-09-13T10:00:00.000Z',
      },
    });
  });

  it('reemplaza el usuario global con la respuesta real y actualiza UserMenu', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <UpdateProbe />
          <UserMenu />
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('button', {
      name: 'Usuario actual: Carlos Benítez',
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actualizar nombre',
      }),
    );

    await screen.findByRole('button', {
      name: 'Usuario actual: Carlos Hernández',
    });
    expect(api.updateProfile).toHaveBeenCalledWith(
      {
        displayName: 'Carlos Hernández',
      },
      'access-token-test',
    );
  });

  it('no modifica el usuario global cuando backend rechaza la actualización', async () => {
    api.updateProfile.mockRejectedValue(
      new Error('request failed'),
    );

    render(
      <MemoryRouter>
        <AuthProvider>
          <UpdateProbe />
          <UserMenu />
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('button', {
      name: 'Usuario actual: Carlos Benítez',
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Actualizar nombre',
      }),
    );

    await waitFor(() => {
      expect(api.updateProfile).toHaveBeenCalledOnce();
    });
    expect(
      screen.getByRole('button', {
        name: 'Usuario actual: Carlos Benítez',
      }),
    ).toBeInTheDocument();
  });
});

describe('AuthContext Google login', () => {
  beforeEach(() => {
    api.refreshAccessToken.mockReset();
    api.getCurrentUser.mockReset();
    api.googleLogin.mockReset();
    api.updateProfile.mockReset();
    api.login.mockReset();
    api.register.mockReset();
    api.logout.mockReset();

    api.refreshAccessToken.mockRejectedValue(
      new Error('no existing session'),
    );

    api.googleLogin.mockResolvedValue({
      user: {
        ...originalUser,
        id: 'google-user-1',
        email: 'google-user@example.test',
        displayName: 'Google User',
      },
      accessToken: 'google-codegym-access-token',
    });
  });

  it('establece usuario, accessToken y estado authenticated con la respuesta del backend', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <GoogleLoginProbe />
        </AuthProvider>
      </MemoryRouter>,
    );

    await screen.findByText(
      'unauthenticated|sin-usuario|sin-token',
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Entrar con Google',
      }),
    );

    await screen.findByText(
      'authenticated|google-user@example.test|google-codegym-access-token',
    );

    expect(api.googleLogin).toHaveBeenCalledWith({
      idToken: 'google-id-token-test',
    });
  });
});

