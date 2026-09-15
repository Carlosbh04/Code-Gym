import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '@/features/auth/auth-api';
import { ApiError } from '@/lib/api/http-client';
import ProfilePage from './ProfilePage';

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
  updateProfile: vi.fn(),
}));

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    updateProfile: authState.updateProfile,
  }),
}));

const AUTHENTICATED_USER: AuthUser = {
  id: 'profile-user-id',
  email: 'carlos@codegym.dev',
  displayName: 'Carlos Benítez',
  role: 'ADMIN',
  createdAt: '2026-09-13T08:00:00.000Z',
  updatedAt: '2026-09-13T09:00:00.000Z',
};

function enterEditMode() {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Editar perfil',
    }),
  );
  return screen.getByLabelText('Nombre visible');
}

describe('ProfilePage', () => {
  beforeEach(() => {
    authState.user = AUTHENTICATED_USER;
    authState.updateProfile.mockReset();
    authState.updateProfile.mockResolvedValue(undefined);
  });

  it('renderiza los datos reales permitidos y el control de edición', () => {
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Mi perfil' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Carlos Benítez' })).toBeInTheDocument();
    expect(screen.getAllByText('carlos@codegym.dev')).toHaveLength(2);
    expect(screen.getAllByText('ADMIN')).toHaveLength(2);
    expect(screen.getByText('13 de septiembre de 2026')).toBeInTheDocument();
    expect(screen.getByTestId('profile-avatar')).toHaveTextContent('C');
    expect(screen.getByRole('button', { name: 'Editar perfil' })).toBeInTheDocument();
  });

  it('entra en edición con el nombre actual y enfoca el input', async () => {
    render(<ProfilePage />);

    const input = enterEditMode();

    expect(input).toHaveValue('Carlos Benítez');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('cancela sin request y restaura el valor original', () => {
    render(<ProfilePage />);

    fireEvent.change(enterEditMode(), {
      target: {
        value: 'Nombre temporal',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(authState.updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Nombre visible')).not.toBeInTheDocument();
    expect(enterEditMode()).toHaveValue('Carlos Benítez');
  });

  it.each([
    {
      value: '   ',
      message: 'El nombre visible no puede estar vacío.',
    },
    {
      value: 'a'.repeat(101),
      message: 'El nombre visible no puede superar los 100 caracteres.',
    },
  ])('valida el nombre antes de enviar: $message', ({ value, message }) => {
    render(<ProfilePage />);

    fireEvent.change(enterEditMode(), {
      target: {
        value,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Nombre visible')).toHaveAttribute('aria-invalid', 'true');
    expect(authState.updateProfile).not.toHaveBeenCalled();
  });

  it('normaliza el nombre, guarda una sola vez y refleja el usuario actualizado', async () => {
    authState.updateProfile.mockImplementation(async ({ displayName }: { displayName: string }) => {
      authState.user = {
        ...AUTHENTICATED_USER,
        displayName,
        updatedAt: '2026-09-13T10:00:00.000Z',
      };
    });
    const view = render(<ProfilePage />);

    fireEvent.change(enterEditMode(), {
      target: {
        value: '   Carlos Hernández   ',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => {
      expect(authState.updateProfile).toHaveBeenCalledOnce();
    });
    expect(authState.updateProfile).toHaveBeenCalledWith({
      displayName: 'Carlos Hernández',
    });

    view.rerender(<ProfilePage />);
    expect(screen.getByRole('heading', { level: 2, name: 'Carlos Hernández' })).toBeInTheDocument();
  });

  it('bloquea doble submit mientras el backend está pendiente', () => {
    let resolveRequest: (() => void) | undefined;
    authState.updateProfile.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRequest = resolve;
      }),
    );
    render(<ProfilePage />);

    const input = enterEditMode();
    fireEvent.change(input, {
      target: {
        value: 'Ada Lovelace',
      },
    });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    fireEvent.submit(form as HTMLFormElement);

    expect(authState.updateProfile).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();
    resolveRequest?.();
  });

  it('mantiene el formulario y el valor escrito si backend falla', async () => {
    authState.updateProfile.mockRejectedValue(
      new ApiError(500, 'INTERNAL_SERVER_ERROR', 'internal detail'),
    );
    render(<ProfilePage />);

    fireEvent.change(enterEditMode(), {
      target: {
        value: 'Ada Lovelace',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el nombre. Inténtalo de nuevo.',
    );
    expect(screen.getByLabelText('Nombre visible')).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText('Nombre visible')).toBeEnabled();
  });

  it('usa el email y su inicial cuando displayName no existe', () => {
    authState.user = {
      ...AUTHENTICATED_USER,
      email: 'ada@example.com',
      displayName: null,
      role: 'USER',
    };

    render(<ProfilePage />);

    expect(screen.getByRole('heading', { level: 2, name: 'ada@example.com' })).toBeInTheDocument();
    expect(screen.getByTestId('profile-avatar')).toHaveTextContent('A');
    expect(screen.getAllByText('USER')).toHaveLength(2);
    expect(enterEditMode()).toHaveValue('');
  });

  it('no expone identificadores, tokens ni información sensible', () => {
    render(<ProfilePage />);

    const profile = screen.getByRole('heading', { level: 1, name: 'Mi perfil' }).closest('section');
    expect(profile).not.toBeNull();
    expect(within(profile as HTMLElement).queryByText(AUTHENTICATED_USER.id)).not.toBeInTheDocument();
    expect(within(profile as HTMLElement).queryByText(/password|passwordHash|accessToken|session id/i)).not.toBeInTheDocument();
    expect(within(profile as HTMLElement).queryByText(AUTHENTICATED_USER.updatedAt)).not.toBeInTheDocument();
  });
});
