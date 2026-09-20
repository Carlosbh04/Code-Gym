import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserMenu } from './UserMenu';

const mocks = vi.hoisted(() => ({
  logout: vi.fn<() => Promise<void>>(),
  navigate: vi.fn(),
  runLogoutTransition: vi.fn(
    async (
      logoutAction: () => Promise<void>,
      onFinished?: () => void,
    ) => {
      await logoutAction();
      onFinished?.();
    },
  ),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-menu',
      email: 'carlos@codegym.dev',
      displayName: 'Carlos Benítez',
      role: 'USER',
      createdAt: '2026-09-13T08:00:00.000Z',
      updatedAt: '2026-09-13T08:00:00.000Z',
    },
    logout: mocks.logout,
  }),
}));

vi.mock(
  '@/features/logout-transition/useLogoutTransition',
  () => ({
    useLogoutTransition: () => ({
      active: false,
      runLogoutTransition:
        mocks.runLogoutTransition,
    }),
  }),
);

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

describe('UserMenu', () => {
  beforeEach(() => {
    mocks.logout.mockReset();
    mocks.logout.mockResolvedValue(undefined);
    mocks.navigate.mockReset();
    mocks.runLogoutTransition.mockClear();
  });

  it('muestra identidad real y abre el menú desde todo el bloque de usuario', () => {
    render(<UserMenu />);

    const trigger = screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('carlos@codegym.dev')).toBeInTheDocument();
    expect(screen.getAllByText('Carlos Benítez')).toHaveLength(2);
    expect(screen.getByRole('menuitem', { name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Configuración' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ayuda' })).toBeInTheDocument();
  });

  it('cierra con Escape, devuelve el foco y conserva navegación con flechas', async () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' });

    fireEvent.click(trigger);
    const profileItem = screen.getByRole('menuitem', { name: 'Mi perfil' });
    await waitFor(() => expect(profileItem).toHaveFocus());

    fireEvent.keyDown(profileItem, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Configuración' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('cierra al hacer clic fuera y mediante el botón X', async () => {
    render(<UserMenu />);
    const trigger = screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' });

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú de usuario' }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
  });

  it('navega a Mi perfil y cierra el menú', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Mi perfil' }));

    expect(mocks.navigate).toHaveBeenCalledWith('/profile');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('habilita Configuración, navega a seguridad y mantiene Ayuda pendiente', () => {
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' }));
    const settingsItem = screen.getByRole('menuitem', { name: 'Configuración' });

    expect(settingsItem).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('menuitem', { name: 'Ayuda' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(settingsItem);

    expect(mocks.navigate).toHaveBeenCalledWith('/settings/security');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('ejecuta un único logout pendiente y navega con replace', async () => {
    let resolveLogout: (() => void) | undefined;
    mocks.logout.mockImplementation(() => new Promise<void>((resolve) => {
      resolveLogout = resolve;
    }));
    render(<UserMenu />);

    fireEvent.click(screen.getByRole('button', { name: 'Usuario actual: Carlos Benítez' }));
    const logoutItem = screen.getByRole('menuitem', { name: 'Cerrar sesión' });
    fireEvent.click(logoutItem);
    fireEvent.click(logoutItem);

    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(
      mocks.runLogoutTransition,
    ).toHaveBeenCalledTimes(1);

    expect(
      screen.queryByRole('menu'),
    ).not.toBeInTheDocument();

    expect(
      mocks.navigate,
    ).not.toHaveBeenCalled();

    resolveLogout?.();

    await waitFor(() => {
      expect(
        mocks.navigate,
      ).toHaveBeenCalledWith(
        '/login',
        {
          replace: true,
        },
      );
    });
  });
});
